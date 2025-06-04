#!/usr/bin/env python3
from enum import Enum
from core import CardModel, TurnModel, TransactionModel, OwnerModel, GameStateModel
from core import user_collection
from bson import ObjectId
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
class Card():
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
class Owner():
    def __init__(self, cards: list[Card] = None, is_player: bool = True):
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
    def __init__(self, card: Card = None, from_: str = None, to_: str = None, success: bool = True):
        self.card = card
        self.from_ = from_
        self.to_ = to_
        self.success = success

    def get_card(self) -> Card:
        return self.card

    def to_model(self) -> TransactionModel:
        return TransactionModel(sender=self.from_, receiver=self.to_, card=self.card.to_model(), success=self.success)
    
    @classmethod
    def from_model(cls, model: TransactionModel):
        return cls(Card.from_model(model.card),model.sender, model.receiver, model.success)

class Turn:
    def __init__(self, player_id: str, turn_type: int, transactions: list[Transaction]):
        self.player = player_id
        self.transactions = transactions
        self.turn_type = turn_type

    def get_cards(self) -> list[Card]:
        return [trans.get_card() for trans in self.transactions]

    def to_model(self) -> TurnModel:
        return TurnModel(player=self.player, transactions=[transact.to_model() for transact in self.transactions], type=self.turn_type)
    
    @classmethod
    def from_model(cls, model: TurnModel):
        return cls(model.player, model.type, [Transaction.from_model(transact) for transact in model.transactions])

class Game():

    def __init__(self, manager, owners: dict[str, Owner], cards: list[Card], player_ids: list[str]):
        self.manager = manager
        self.owners = owners
        self.cards = cards
        self.players = player_ids
        self.current_player: int = 0
        self.last_turn: Turn = Turn("", 0, [])
        self.player_status = {player_id:0 for player_id in player_ids}
        self.belongs_to: dict[Card, str] = {}
        self.status = 0

        for owner_id, owner in self.owners.items():
            for c in owner.get_cards():
                self.belongs_to[c] = owner_id

    # Perform transaction of card between two owners
    def transact(self, trans: Transaction):
        # Remove card from from_ and append to to_
        self.owners[trans.from_].remove_card(trans.card)
        self.owners[trans.to_].add_card(trans.card)
        self.belongs_to[trans.card] = trans.to_

    async def play_turn(self, turn: Turn) -> bool:
        for trans in turn.transactions:
            if trans.success:
                self.transact(trans)
        return True

    def to_game_state(self) -> GameStateModel:
        return GameStateModel(game_type="", owners={owner_id: owner.to_model() for owner_id, owner in self.owners.items()}, current_player=self.players[self.current_player], last_turn=self.last_turn.to_model(), player_status=self.player_status, status=self.status)
    
    def has_cards(self, turn:Turn): # checks if the player has the cards in the transaction requested
        for trans in turn.transactions:
            if (self.belongs_to[trans.card] != trans.from_):
                return False
        return True
    
    def log_state(self):
        self.manager.game_log.log_state(self.to_game_state())

    async def broadcast_state(self):
        await self.manager.broadcast(self.to_game_state().dict())

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
        NONE = 0
        SINGLE = 1
        DOUBLE = 2
        TRIPLE = 3
        QUAD = 4

        SEQUENCE = 10
        SEQ_3 = 13
        SEQ_4 = 14
        SEQ_5 = 15
        SEQ_6 = 16
        SEQ_7 = 17
        SEQ_8 = 18
        SEQ_9 = 19
        SEQ_10 = 20
        SEQ_11 = 21
        SEQ_12 = 22

        DB_SEQUENCE = 30
        DB_SEQ_3 = 33
        DB_SEQ_4 = 34
        DB_SEQ_5 = 35

    suit_to_value = {Suit.SPADE: 0, Suit.CLUB: 1, Suit.DIAMOND: 2, Suit.HEART: 3}

    @staticmethod
    def get_card_value(card:Card)->int:
        rank = (card.rank-3)%13
        suit = VietCongGame.suit_to_value[card.suit]
        return rank*10+suit
    
    def __init__(self, manager, players):
        if len(players)!=4:
            raise ValueError("Not the right number of players (4 needed)")
        
        # Member Variables
        self.current_combo = [] #combo on top of deck
        self.current_combo_type = self.Combo.NONE #ID of combo
        self.places = [4]*4 # finishing places
        self.finished_players = 0 # number of players who finished

        # Initializing Deck
        cards = []
        cards.extend([Card(i + 1, Suit.HEART) for i in range(13)])
        cards.extend([Card(i + 1, Suit.DIAMOND) for i in range(13)])
        cards.extend([Card(i + 1, Suit.CLUB) for i in range(13)])
        cards.extend([Card(i + 1, Suit.SPADE) for i in range(13)])
        random.shuffle(cards)

        # Initializing Owners
        owners: dict[str, Owner] = {players[i]:Owner(sorted(cards[i*13:(i+1)*13], key=VietCongGame.get_card_value)) for i in range(4)}
        owners["pile"] = Owner([], False)

        super().__init__(manager, owners, cards, players)

        # Set player with 3S to start
        self.current_player = players.index(self.belongs_to[Card(3,Suit.SPADE)])

        # self.manager.game_log.log_state(self.to_game_state())

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
        
        rank = cards[0].rank
        for i in range(0, len(cards), multiple):
            if any(rank != card.rank for card in cards[i:i+multiple]):
                return False
            rank = cards[i].rank%13+1
        return len(cards)//multiple

    @staticmethod
    def get_combo(cards: list[Card]):
        # single/pair/trip/quad
        multiple_len = VietCongGame.is_multiple(cards)
        if multiple_len != 0:
            return VietCongGame.Combo(multiple_len)
        
        # sequence by length
        sequence_len = VietCongGame.is_multiple_sequence(cards,1)
        if sequence_len != 0:
            return VietCongGame.Combo(VietCongGame.Combo.SEQUENCE.value + sequence_len)

        
        # double sequence by length
        double_sequence_len = VietCongGame.is_multiple_sequence(cards,2)
        if double_sequence_len != 0:
            return VietCongGame.Combo(VietCongGame.Combo.DB_SEQUENCE.value + double_sequence_len)
        
        # no matches
        return VietCongGame.Combo.NONE

    @staticmethod
    def is_greater_combo(cards: list[Card], current_combo: list[Card]) -> bool:
        if len(current_combo) == 0:
            return True
        if len(cards) == 0:
            return False
        return VietCongGame.get_card_value(cards[-1]) > VietCongGame.get_card_value(current_combo[-1])

    def valid_combo(self, cards: list[Card]):
        # Start of Round
        if self.current_combo_type == self.Combo.NONE:
            combo = self.get_combo(cards)
            if combo != self.Combo.QUAD and combo.value < self.Combo.DB_SEQUENCE.value:
                return combo
        
        # Single/pair/trips/quads
        elif self.current_combo_type.value < self.Combo.SEQUENCE.value:
            # Matching Combo
            multiple_len = self.is_multiple(cards)
            if multiple_len == self.current_combo_type.value:
                if self.is_greater_combo(cards, self.current_combo):
                    return self.Combo(multiple_len)
        
            # Bomb is playable
            elif self.current_combo[0].rank == 2:
                # Quad is playable
                if len(self.current_combo) < 3:
                    if multiple_len == 4:
                        return self.Combo.QUAD
                    
                # Check if double sequence playable
                double_sequence_len = VietCongGame.is_multiple_sequence(cards,2)
                if double_sequence_len > self.current_combo_type.value + 1:
                    return self.Combo(self.Combo.DB_SEQUENCE.value + double_sequence_len)
            
        # Sequences
        elif self.current_combo_type.value < self.Combo.DB_SEQUENCE.value:
            sequence_len = self.is_multiple_sequence(cards, 1)
            if sequence_len == len(self.current_combo) and self.is_greater_combo(cards, self.current_combo):
                return self.Combo(self.Combo.SEQUENCE.value + sequence_len)
        
        # Double Sequences
        else:
            double_sequence_len = self.is_multiple_sequence(cards, 2)
            if double_sequence_len == len(self.current_combo)//2 and self.is_greater_combo(cards, self.current_combo):
                return self.Combo(self.Combo.DB_SEQUENCE.value + double_sequence_len)
            
        return self.Combo.NONE

    def get_next_player(self) -> bool:
        for i in range(1,4):
            next_player = (self.current_player+i)%4
            if self.player_status[self.players[next_player]] == 0 and self.places[next_player] == 4 and self.players[next_player] != self.last_turn.player:
                self.current_player = next_player
                return True
        return False

    def is_valid_turn(self, turn: Turn) -> bool:
        # Check if player is the current player
        if turn.player != self.players[self.current_player]:
            return False
        
        # Check if turn type is valid
        if turn.turn_type not in [0, 1]:
            return False
        
        # Check if transactions are valid
        if any(trans.from_ != turn.player for trans in turn.transactions):
            return False
        
        if any(trans.to_ != "pile" for trans in turn.transactions):
            return False
        
        if not super().has_cards(turn):
            return False
        
        return True

    def to_game_state(self):
        game_state = super().to_game_state()
        game_state.game_type = "vietcong"
        game_state.player_status = {self.players[i]: self.player_status[self.players[i]] if place == 4 else place for i, place in enumerate(self.places)}
        return game_state

    async def update_vietcong_stats(self, results: dict[str, int]):
        for user_id, place in results.items():
            place_mapper = ["first", "second", "third", "fourth"]
            place_str = place_mapper[place-1]
            print(f"Updating stats for {user_id}: place = {place}")
            await user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$inc": 
                    {
                        "stats.vietcong.games": 1,
                        f"stats.vietcong.place_finishes.{place_str}": 1
                    }
                }
            )

    async def play_turn(self, turn: Turn) -> bool: #true if move was successful and no need for redo, false for redo needed
        if not self.is_valid_turn(turn):
            return False

        # Player passes
        if turn.turn_type == 1:
            if self.current_combo_type == self.Combo.NONE:
                return False
            
            self.player_status[turn.player] = -1


        # Player plays cards
        else:
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
                    results = {self.players[i]:self.places[i] for i in range(4)}
                    await self.update_vietcong_stats(results)
                    await self.manager.end_game(results)
        
        # Pass turn to next player
        if not self.get_next_player():
            print("No next player. Starting new round.")
            # Start new round if no next player
            for player in self.players:
                self.player_status[player] = 0
            self.current_combo = []
            self.current_combo_type = self.Combo.NONE

            self.last_turn.transactions = []

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
        # random.shuffle(cards)
        owners: dict[str, Owner] = {players[i]: Owner(sorted(cards[i*9:(i+1)*9], key=self.get_card_value)) for i in range(6)}
        owners["suits_1"] = Owner([], False)
        owners["suits_2"] = Owner([], False)

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

        self.options_owner = Owner(self.get_question_options(),False)

        # self.manager.game_log.log_state(self.to_game_state())

    @staticmethod
    def get_card_value(card: Card):
        return card.rank + FishGame.card_to_half_suit(card).value*20

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
        return [Card((half_suit.value//4*7+i+1)%13+1, Suit(half_suit.value%4+1)) for i in range(6)]
    
    def transact(self, trans):
        super().transact(trans)
        self.owners[trans.to_].cards.sort(key=FishGame.get_card_value)
        self.owner_half_suits[trans.to_].add(self.card_to_half_suit(trans.card))
        self.owner_half_suits[trans.from_] = self.cards_to_half_suit(self.owners[trans.from_].get_cards())
    
    def is_valid_claim(self, turn: Turn):
        cards = turn.get_cards()
        suit_set = {self.card_to_half_suit(card) for card in cards}
        # 6 cards, all same half suit, half suit unclaimed
        return len(turn.transactions) == 6 and \
            len(suit_set) == 1 and \
            self.card_to_half_suit(cards[0]) == self.card_to_half_suit(self.options_owner.get_cards()[0]) and \
            all(self.player_status[trans.from_] == self.player_status[turn.player] for trans in turn.transactions) and \
            all(trans.to_ == f"suits_{self.player_status[turn.player]}" for trans in turn.transactions)
    
    def is_valid_question(self, turn: Turn):
        print(f"[TURN DEBUG] Type: {turn.turn_type}, Player: {turn.player}, Status: {self.status}")
        print(f"[VALID_QUESTION] Asking: {turn.transactions[0].card} from {turn.transactions[0].from_} → {turn.transactions[0].to_}")
        print(f"[OWNER_CARDS] {turn.transactions[0].from_}: {[str(c) for c in self.owners[turn.transactions[0].from_].get_cards()]}")
        print(f"[OWNER_HALF_SUITS] {turn.player}: {self.owner_half_suits[turn.player]}")
        print(f"[OPTIONS_OWNER] Cards: {[str(c) for c in self.options_owner.get_cards()]}")

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
        
        if card not in self.options_owner.get_cards():
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
    
    def is_unclaimed(self,card: Card):
        return self.belongs_to[card] not in ["suits_1","suits_2"]
    
    async def update_fish_stats(self, winning_team: int):
        for user_id in self.players:
            inc_fields = {
                "stats.fish.games": 1
            }

            cur_team = self.player_status[user_id]

            if cur_team == winning_team:
                inc_fields["stats.fish.wins"] = 1

            # if user_id == claim_player_id:
            #     inc_fields["stats.fish.claims"] = 1
            #     if cur_team == winning_team:
            #         inc_fields["stats.fish.successful_claims"] = 1

            print(f"[GAME] Updating game stats for: {user_id}")
            await user_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": inc_fields}
            )

    async def update_fish_claims(self, claimer_id: str, success: bool):
        inc_fields = {
            "stats.fish.claims": 1
        }
        if success:
            inc_fields["stats.fish.successful_claims"] = 1
        
        print(f"[CLAIM] {claimer_id} made a claim. Success: {success}")
        print(f"Updating claim stats for {claimer_id}")

        await user_collection.update_one(
            {"_id": ObjectId(claimer_id)},
            {"$inc": inc_fields}
        )
    
    async def play_turn(self, turn: Turn) -> bool:

        print(f"[DEBUG] play_turn: status={self.status}, turn_type={turn.turn_type}")
        print(f"[DEBUG] turn.player={turn.player}, from_={turn.transactions[0].from_}, to_={turn.transactions[0].to_}")
        print(f"[DEBUG] card={turn.transactions[0].card}")
        print(f"[DEBUG] valid_question={self.is_valid_question(turn)}")

        # Delegation (turn_type == 2)
        if turn.turn_type == 2 and self.status == 0:
            player = self.players[self.current_player]
            if player != turn.player:
                return False
            if self.owners[player].get_cards():
                return False
            if len(turn.transactions) != 1:
                return False
            teammate = turn.transactions[0].from_
            if self.player_status[teammate] != self.player_status[player]:
                return False
            if not self.owners[teammate].get_cards():
                return False
            self.current_player = self.players.index(teammate)
            await super().broadcast_state()
            print(f"[DELEGATE] {player} delegated to {teammate}")
            return True

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
            if self.status == 0 and len(turn.transactions) == 1 and self.is_unclaimed(turn.transactions[0].card):
                self.status = 2
                self.temp_current_player = self.current_player
                self.current_player = self.players.index(turn.player)
                self.options_owner = Owner(self.half_suits_cards([self.card_to_half_suit(turn.transactions[0].card)]), False)
                await super().broadcast_state()
                return True
            
            # Make Claim
            elif self.status == 2 and self.is_valid_claim(turn):
                suit_team = turn.transactions[0].to_[-1]
                # Unsuccessful Claim
                was_successful_claim = self.has_cards(turn)
                if not was_successful_claim:
                    suit_team = self.player_status[turn.player]%2+1
                    for trans in turn.transactions:
                        trans.success = False
                    turn.transactions += [Transaction(trans.card,self.belongs_to[trans.card],f"suits_{suit_team}") for trans in turn.transactions]
                await self.update_fish_claims(turn.player, was_successful_claim)
                await super().play_turn(turn)
                self.last_turn = turn
                # End Game
                winner = 0
                if len(self.owner_half_suits["suits_1"]) == 5:
                    winner = 1
                elif len(self.owner_half_suits["suits_2"]) == 5:
                    winner = 2
                if winner != 0:
                    self.status = 1
                    for i in range(6):
                        self.player_status[self.players[i]] = winner == self.player_status[self.players[i]]
                    await super().broadcast_state()
                    results = {self.players[i]: self.player_status[self.players[i]] for i in range(6)}
                    await self.update_fish_stats(winner)
                    await self.manager.end_game(results)
                else:
                    self.current_player = self.temp_current_player
                    self.options_owner = Owner(self.get_question_options(), False)
                    self.status = 0
                    await super().broadcast_state()
                return True

        return False

