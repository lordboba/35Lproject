#!/usr/bin/env python3
from abc import ABC, abstractmethod
from enum import Enum
from core import CardModel, TurnModel, TransactionModel, OwnerModel, GameStateModel
import random

GAME_RULES = {
    "vietcong": {
        "max_players": 4
    },
    "fish": {
        "max_players": 6
    },
    "simple": {
        "max_players": 2
    }
}

class Suit(Enum):
    SPEC = 0
    CLUB = 1
    DIAMOND = 2
    HEART = 3
    SPADE = 4


# Base Card
class Card(ABC):
    def __init__(self, rank=0, suit=Suit.SPEC):
        self.rank = rank
        self.suit = suit

    def __eq__(self, other):
        return isinstance(other, Card) and self.rank == other.rank and self.suit == other.suit
    
    def __hash__(self):
        return hash((self.rank, self.suit.value))
    
    def to_model(self) -> CardModel:
        return CardModel(suit=self.suit.value, rank=self.rank)
    
    def __str__(self):
        if self.rank == 0:
            if self.suit == Suit.CLUB:
                return "JB"
            elif self.suit == Suit.DIAMOND:
                return "JR"
        if self.rank == 0:
            if self.suit == Suit.CLUB:
                return "JB"
            elif self.suit == Suit.DIAMOND:
                return "JR"
        if self.suit == Suit.SPEC:
            return "JK"
        rank_arr = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]
        suit_arr = ["","C","D","H","S"]
        return rank_arr[(self.rank)%14]+suit_arr[self.suit.value]
    
    @classmethod
    def from_model(cls, model: CardModel):
        return cls(suit=Suit(model.suit), rank=model.rank)

# Base Owner
class Owner(ABC):
    def __init__(self, cards: list[Card] = None):
        self.cards: list[Card] = cards
        self.is_player: bool = is_player

    def is_empty(self) -> bool:
        return len(self.cards) == 0
        
    def get_cards(self) -> list[Card]:
        return self.cards

    def contains_card(self,card: Card):
        return card in self.cards
    
    def add_card(self,card: Card):
        self.cards.append(card)
    
    def remove_card(self,card: Card):
        self.cards.remove(card)

    def to_model(self) -> OwnerModel:
        return OwnerModel(cards=[card.to_model() for card in self.cards], is_player=self.is_player)

class Transaction:
    def __init__(self, card: Card = None, from_: str = None, to_: str = None):
        self.card = card
        self.from_ = from_
        self.to_ = to_

    def get_card(self) -> Card:
        return self.card

    def to_model(self) -> TransactionModel:
        return TransactionModel(sender=self.from_, receiver=self.to_, card=self.card.to_model())
    
    @classmethod
    def from_model(cls, model: TransactionModel):
        return cls(Card.from_model(model.card),model.sender, model.receiver)

class Turn:
    def __init__(self, player_id: str, turn_type: int, transactions: list[Transaction]):
        self.player = player_id
        self.transactions = transactions
        self.turn_type = turn_type

    def get_cards(self) -> list[Card]:
        return [trans.get_card() for trans in self.transactions]

    def get_cards(self) -> list[Card]:
        return [trans.get_card() for trans in self.transactions]

    def to_model(self) -> TurnModel:
        return TurnModel(player=self.player, transactions=[transact.to_model() for transact in self.transactions], type=self.turn_type)
    
    @classmethod
    def from_model(cls, model: TurnModel):
        return cls(model.player, model.type, [Transaction.from_model(transact) for transact in model.transactions])

class Game(ABC):

    def __init__(self, manager, owners: dict[str, Owner], cards: list[Card], player_ids: list[str]):
        self.manager = manager
        self.owners = owners
        self.cards = cards
        self.current_player: int = None
        self.last_turn: Turn = None
        self.player_ids = player_ids
        self.belongsTo: dict[Card, str] = {}

        for owner_id, owner in self.owners.items():
            for c in owner.get_cards():
                self.belongsTo[c] = owner_id
                self.belongs_to[c] = owner_id

    # Perform transaction of card between two owners
    def transact(self, trans: Transaction):
        # Remove card from from_ and append to to_
        self.owners[trans.from_].remove_card(trans.card)
        self.owners[trans.to_].add_card(trans.card)
        self.belongsTo[trans.card] = trans.to_

    async def play_turn(self, turn: Turn) -> bool:
        for trans in turn.transactions:
            self.transact(trans)
        self.last_turn = turn
        await self.broadcast_state(0)
        return True

    def to_game_state(self) -> GameStateModel:
        return GameStateModel(game_type="", owners={owner_id: owner.to_model() for owner_id, owner in self.owners.items()}, current_player=self.players[self.current_player], last_turn=self.last_turn.to_model(), player_status=self.player_status, status=self.status)
    
    def has_cards(self, turn:Turn): # checks if the player has the cards in the transaction requested
        for trans in turn.transactions:
            if (self.belongsTo[trans.card] != trans.from_):
                return False
        return True

    async def broadcast_state(self, status: int):
        await self.manager.broadcast(self.to_game_state(status).dict())

class SimpleGame(Game):
    def __init__(self, manager, players):
        if len(players)!=2:
            raise ValueError("Too many players")
        
        cardsA = [Card(i + 1, Suit.CLUB) for i in range(10)]
        cardsB = [Card(i + 1, Suit.DIAMOND) for i in range(10)]

        cards = cardsA + cardsB

        owners: dict[str, Owner] = {

            players[0]: Owner(cardsA),
            players[1]: Owner(cardsB),
        }

        super().__init__(manager, owners, cards, players)     

class VietCongGame(Game):

    class Combo(Enum):
        NONE = -1
        SINGLE = 1
        DOUBLE = 2
        TRIPLE = 3
        
        QUAD = 100

        SEQUENCE = 13
        DB_SEQUENCE = 103

        #Not used in actually labeling
        SINGLE_TWO = 21
        DOUBLE_TWO = 22
        TRIPLE_TWO = 23


    def getCardValue(card:Card)->int:
        card1_rank = card.rank
        card1_suit = card.suit
        if (card.rank == 1 or card.rank == 2):
            card1_rank = card.rank + 13
        if (card.suit == Suit.CLUB):
            card1_suit = 3 # we currently defined club as the worst and heart as second best, should be reversed
        elif card.suit == Suit.HEART:
            card1_suit = 1
        elif card.suit == Suit.DIAMOND:
            card1_suit = 2
        elif card.suit == Suit.SPADE:
            card1_suit = 4
        return (card1_rank*10+card1_suit)
        
    def cmpValue(self,card1:Card, card2:Card)->bool:
        return self.getCardValue(card1)<self.getCardValue(card2)
    
    def __init__(self, manager, players):
        if len(players)!=4:
            raise ValueError("Not the right number of players (4 needed)")

        cards = []
        cards.extend([Card(i + 1, Suit.HEART) for i in range(14)])
        cards.extend([Card(i + 1, Suit.DIAMOND) for i in range(14)])
        cards.extend([Card(i + 1, Suit.CLUB) for i in range(14)])
        cards.extend([Card(i + 1, Suit.SPADE) for i in range(14)])
        
        self.current_combo = [] #combo on top of deck
        self.current_combo_type = self.Combo.NONE #ID of combo
        self.passed = [False,False,False,False] # people who passed are true
        random.shuffle(cards)
        owners: dict[str, Owner] = {
            players[0]: Owner(cards[0:13]),
            players[1]: Owner(cards[13:26]),
            players[2]: Owner(cards[26:39]),
            players[3]: Owner(cards[39:52]),
            "Pile": Owner([]) # the pile in the middle
        }
        
        for p in players:
            if Card(3, Suit.HEART) in owners[p].cards: # person with the worst card goes first
                self.current_player = players.index(p)
                break
        
        super().__init__(manager, owners, cards, players)   

        # Set player with 3S to start
        self.current_player = players.index(self.belongs_to[Card(3,Suit.SPADE)])

        super().__init__(manager, owners, cards, players)   

        # Initializing Owners
        owners: dict[str, Owner] = {players[i]:Owner(cards[i*13:(i+1)*13]) for i in range(4)}
        owners["pile"] = Owner([], False)

        super().__init__(manager, owners, cards, players)

        # Set player with 3S to start
        self.current_player = players.index(self.belongs_to[Card(3,Suit.SPADE)])

        self.broadcast_state()

    @staticmethod
    def is_multiple(cards: list[Card]) -> int:
        # Not single/pair/trip/quad or not all equal rank
        if len(cards) > 4 or len({card.rank for card in cards}) != 1:
            return 0
        else:
            return len(cards)
        
    @staticmethod
    def is_multiple_sequence(cards: list[Card], multiple: int) -> int:
        if len(cards)<3*multiple or len(cards)%multiple!=0 or cards[-1].rank == 2:
            return False
        if cards[0].rank == cards[1].rank:
            return True
        return False
    async def is_triple(self, turn:Turn) ->bool:
        cards = [trans.get_card() for trans in turn.transactions]
        if len(cards)!=3:
            return False
        if cards[0].rank == cards[1].rank and cards[1].rank == cards[2].rank:
            return True
        return False
    
    async def is_quad(self, turn:Turn) ->bool:
        cards = [trans.get_card() for trans in turn.transactions]
        if len(cards)!=4:
            return False
        if cards[0].rank == cards[1].rank and cards[1].rank == cards[2].rank and cards[3].rank == cards[2].rank:
            return True
        return False

    async def is_sequence(self,turn:Turn)->int:
        cards = [trans.get_card() for trans in turn.transactions]
        rank = cards[0].rank - 1
        if len(cards)<3:
            return False
       

        for i in range(len(cards)):
            if cards[i].rank != rank+1:
                return False
            rank = cards[i].rank
        return self.Combo.SEQUENCE + len(cards) - 3
     
    async def is_double_sequence(self,turn:Turn)->int:
        cards = [trans.get_card() for trans in turn.transactions]
        rank = cards[0].rank - 1
        if len(cards)<6 or len(cards)%2==1:
            return False
      

        for i in range(len(cards)):
            if cards[2*i].rank != rank+1 or cards[i*2+1].rank != rank+1:
                return False
            rank = cards[2*i].rank
        return self.Combo.DB_SEQUENCE + len(cards) - 3
    
    async def get_combo(self, turn:Turn)->Combo:
        #bombs later
        from functools import cmp_to_key
        cards = [trans.get_card() for trans in turn.transactions]
        sorted(cards, key=cmp_to_key(self.cmpValue)) # sort cards (Hopefully this works)
        sorted(self.current_combo, key=cmp_to_key(self.cmpValue))
        if len(cards) == 0:
            return self.Combo.NONE
    
        if (self.is_double_sequence(self,turn)!=False):
            return self.is_double_sequence(self,turn)
        elif (self.is_sequence(self,turn) != False):
            return self.is_sequence(self,turn)
        elif (self.is_triple(self,turn)):
            return self.Combo.TRIPLE
        elif (self.is_double(self,turn)):
            return self.Combo.DOUBLE
        elif (self.is_quad(self,turn)):
            return self.Combo.QUAD
        else:
            return self.Combo.SINGLE
    async def check_twos(self) ->Combo:
        if (len(self.current_combo)==1) and self.current_combo[0].rank == 15:
            return self.Combo.SINGLE_TWO
        elif (len(self.current_combo)==2) and self.current_combo[0].rank == 15 and self.current_combo[1].rank == 15:
            return self.Combo.DOUBLE_TWO
        elif (len(self.current_combo)==3) and self.current_combo[0].rank == 15 and self.current_combo[1].rank == 15 and self.current_combo[2].rank == 15  :
            return self.Combo.TRIPLE_TWO
        return self.Combo.NONE
        
    async def valid_move(self, turn:Turn) -> bool:
        if not super.has_cards(self,turn):
            return False
        test_combo = self.get_combo(self,turn)
        bomb_potential = self.check_twos(self)
        if bomb_potential > 0:
            if bomb_potential == self.Combo.SINGLE_TWO and test_combo == self.Combo.QUAD:
                return True
            return test_combo >=self.Combo.DB_SEQUENCE + (bomb_potential - self.Combo.SINGLE_TWO)

        if test_combo != self.current_combo_type:
            return False
        
        return True
    
    def to_game_state(self):
        game_state = super().to_game_state()
        game_state.game_type = "vietcong"
        return game_state
            
    async def play_turn(self, turn: Turn) -> bool: #true if move was successful and no need for redo, false for redo needed
        if self.passed[self.current_player]:
            self.current_player = (self.current_player+1)%4
            return True
        elif len(turn.transactions)==0:
            self.passed[self.current_player] = True
            self.current_player = (self.current_player+1)%4
            return True
        
        if not self.valid_move(self,turn):
            return False

        # Player passes
        if turn.turn_type == 1:
            if self.current_combo_type == self.Combo.NONE:
                return False
            
            self.player_status[turn.player] = 1


        # Player plays cards
        else:
            print(f"play_turn called by {turn.player} with turn_type {turn.turn_type}, cards: {getattr(turn, 'cards', None)}")
            cards = sorted(turn.get_cards(), key=VietCongGame.get_card_value)
            print(f"{turn.player} is trying to play: {cards}")

            # Checks if 3 of Spades is played
            if self.belongs_to[Card(3, Suit.SPADE)] != "pile" and Card(3, Suit.SPADE) not in cards:
                print("REJECTED PLAY: 3 of Spades must by played first!")
                return False

            combo = self.valid_combo(cards)
            print(f"combo detected: {combo}")
            if combo == self.Combo.NONE:
                print("REJECTED PLAY: Invalid card combo")
                return False
            
            await super().play_turn(turn)
            self.last_turn = Turn(turn.player, 0, [Transaction(card, turn.player, "pile") for card in cards])
            self.current_combo = cards
            self.current_combo_type = combo
            if self.owners[turn.player].is_empty():
                self.finished_players += 1
                self.places[self.current_player] = self.finished_players
                print(f"{turn.player} finished in place {self.finished_players}!")
                # Game ends
                if self.finished_players == 3:
                    print("Game Finished =D")
                    self.status = 1
                    for i in range(4):
                        self.player_status[self.players[i]] = self.places[i]
                    await self.broadcast_state()
                    await self.manager.end_game({self.players[i]:self.places[i] for i in range(4)})
        
        # Pass turn to next player
        if not self.get_next_player():
            print("No next player. Starting new round.")
            # Start new round if no next player
            for player in self.players:
                self.player_status[player] = 0
            self.current_combo = []
            self.current_combo_type = self.Combo.NONE

            # Designate starting player
            self.current_player = self.players.index(self.last_turn.player)
            print(f"New round. Starting player is now {self.current_player}")

            # Pass turn to next player if player finished
            if self.places[self.current_player] != 4:
                print(f"Current player {self.current_player} has already finished. Passing turn.")
                self.get_next_player()
        
        await self.broadcast_state()
        print(f"play_turn succeeded for {turn.player}")
        return True

class FishGame(Game):

    class HalfSuit(Enum):
        LOW_CLUB = 0
        LOW_DIAMOND = 1
        LOW_HEART = 2
        LOW_SPADE = 3
        HIGH_CLUB = 4
        HIGH_DIAMOND = 5
        HIGH_HEART = 6
        HIGH_SPADE = 7
        MIDDLE = 8

    def __init__(self, manager, players):
        if len(players)!=6:
            raise ValueError("Not the right number of players (6 needed)")
        
        # Initializing Deck
        cards = []
        cards.extend([Card(i + 1, Suit.HEART) for i in range(13)])
        cards.extend([Card(i + 1, Suit.DIAMOND) for i in range(13)])
        cards.extend([Card(i + 1, Suit.CLUB) for i in range(13)])
        cards.extend([Card(i + 1, Suit.SPADE) for i in range(13)])
        cards.append(Card(0,Suit.CLUB))
        cards.append(Card(0,Suit.DIAMOND))

        # Dealing Cards
        random.shuffle(cards)
        owners: dict[str, Owner] = {players[i]: Owner(cards[i*9:(i+1)*9]) for i in range(6)}
        owners["suits_1"] = Owner([], False)
        owners["suits_2"] = Owner([], False)

        self.options_owner = Owner([])
        self.unclaimed = {self.HalfSuit(i) for i in range(9)}
        self.temp_current_player = 0
        
        super().__init__(manager, owners, cards, players)
        self.current_player = random.randint(0,5)
        self.owner_half_suits = {owner_id: self.cards_to_half_suit(owner.get_cards()) for owner_id, owner in self.owners.items()} # Half suits each owner has

        # Forming Teams
        team_list = list(range(6))
        random.shuffle(team_list)
        for i in range(6):
            self.player_status[players[team_list[i]]] = i//3+1 

        self.broadcast_state()

    @staticmethod
    def card_to_half_suit(card: Card):
        if card.rank == 0 or card.rank == 8:
            return FishGame.HalfSuit.MIDDLE
        return FishGame.HalfSuit((card.rank > 8 or card.rank == 1)*4+card.suit.value-1)
    
    @staticmethod
    def cards_to_half_suit(cards: list[Card]):
        return {FishGame.card_to_half_suit(card) for card in cards}
    
    @staticmethod
    def half_suit_cards(half_suit):
        if half_suit == FishGame.HalfSuit.MIDDLE:
            return [Card(8, Suit(i+1)) for i in range(4)] + [Card(0, Suit(i+1)) for i in range(2)]
        return [Card((half_suit.value//4*8+i+1)%13+1, Suit(half_suit.value%4)) for i in range(6)]
    
    def transact(self, trans):
        super().transact(trans)
        self.owner_half_suits[trans.to_].add(self.card_to_half_suit(trans.card))
        self.owner_half_suits[trans.from_] = self.cards_to_half_suit(self.owners[trans.from_].get_cards())
    
    def is_valid_claim(self, turn: Turn):
        cards = turn.get_cards()
        suit_set = {self.card_to_half_suit(card) for card in cards}
        # 6 cards, all same half suit, half suit unclaimed
        return len(turn.transactions) == 6 and \
            len(suit_set) == 1 and \
            self.card_to_half_suit(cards[0]) in self.unclaimed and \
            all(self.player_status[trans.from_] == self.player_status[turn.player] for trans in turn.transactions) and \
            all(trans.to_ == f"suits_{self.player_status[turn.player]}" for trans in turn.transactions)
    
    def is_valid_question(self, turn: Turn):
        if len(turn.transactions) != 1:
            return False
        
        player = self.players[self.current_player]
        card = turn.transactions[0].card
        half_suit = self.card_to_half_suit(card)

        if half_suit not in self.owner_half_suits[player]:
            return False
        
        if card in self.owners[player].get_cards():
            return False
        
        if turn.transactions[0].to_ != player:
            return False
        
        if card in self.options_owner.get_cards():
            return False
        
        if self.player_status[turn.transactions[0].from_] == self.player_status[player]:
            return False
        
        return True
    
    def to_game_state(self):
        game_state = super().to_game_state()
        game_state.owners["options"] = self.options_owner.to_model()
        game_state.game_type = "fish"
        return game_state
    
    @staticmethod
    def half_suits_cards(half_suits):
        return [card for half_suit in half_suits for card in FishGame.half_suit_cards(half_suit)]
    
    def get_question_options(self):
        player = self.players[self.current_player]
        cards = set(self.half_suits_cards(self.owner_half_suits[player]))
        return list(cards.difference(set(self.owners[player].get_cards())))
    
    async def play_turn(self, turn: Turn) -> bool:
        # Question
        if turn.turn_type == 0 and self.status == 0 and self.is_valid_question(turn):
            # Unsuccessful Question
            if not self.has_cards(turn):
                self.current_player = self.players.index(turn.transactions[0].from_)
                turn.transactions[0].success = False
            await super().play_turn(turn)
            self.options_owner = Owner(self.get_question_options(),False)
            self.last_turn = turn
            await super().broadcast_state()
            return True

        # Claim
        elif turn.turn_type == 1:
            # Initiate Claim
            if self.status == 0 and len(turn.transactions) == 0:
                self.status = 2
                self.temp_current_player = self.current_player
                self.current_player = self.players.index(turn.player)
                self.options_owner = Owner(self.half_suits_cards(self.unclaimed))
                await super().broadcast_state()
                return True
            
            # Make Claim
            elif self.status == 2 and self.is_valid_claim(turn):
                suit_team = turn.transactions[0].to_[-1]
                # Unsuccessful Claim
                if not self.has_cards(turn):
                    suit_team = self.player_status[turn.player]%2+1
                    for trans in turn.transactions:
                        trans.success = False
                    turn.transactions += [Transaction(trans.card,self.belongs_to[trans.card],f"suits_{suit_team}") for trans in turn.transactions]
                await super().play_turn(turn)
                self.last_turn = turn
                # End Game
                if len(self.owner_half_suits[turn.transactions[0].to_]) == 5:
                    self.status = 1
                    for i in range(6):
                        self.player_status[self.plaaddyers[i]] = suit_team == self.player_status[self.players[i]]
                    await super().broadcast_state()
                    await self.manager.end_game({self.players[i]:self.player_status[self.players[i]] for i in range(6)})
                else:
                    self.current_player = self.temp_current_player
                    self.options_owner = Owner(self.get_question_options())
                    self.status = 0
                    await super().broadcast_state()
                return True

        return False

