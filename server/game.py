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
        if self.suit == Suit.SPEC:
            return "JK"
        rank_arr = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"]
        suit_arr = ["","C","D","H","S"]
        return rank_arr[self.rank]+suit_arr[self.suit.value]
    
    @classmethod
    def from_model(cls, model: CardModel):
        return cls(suit=Suit(model.suit), rank=model.rank)

# Base Owner
class Owner(ABC):
    def __init__(self, cards: list[Card] = None):
        self.cards: list[Card] = cards
        self.is_player: bool = False

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

    def to_game_state(self, status: int) -> GameStateModel:
        return GameStateModel(owners={owner_id: owner.to_model() for owner_id, owner in self.owners.items()}, current_player=self.current_player, last_turn=self.last_turn.to_model(), status=status)
    
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

        super().__init__(manager, owners, cards)     

class VietCongGame(Game):
    class Combo(Enum):
        NONE = -1
        SINGLE = 1
        DOUBLE = 2
        TRIPLE = 3
        QUAD = 4

        SEQUENCE = 20
        DB_SEQUENCE = 21

        BOMB_1 = 101
        BOMB_2 = 102
        BOMB_3 = 103
        BOMB_4 = 104

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

    def get_combo(self, turn:Turn)->Combo:
        #bombs later
        from functools import cmp_to_key
        cards = [trans.get_card() for trans in turn.transactions]
        sorted(cards, key=cmp_to_key(self.cmpValue)) # sort cards (Hopefully this works)
        sorted(self.current_combo, key=cmp_to_key(self.cmpValue))
        if len(cards) == 0:
            return self.Combo.NONE
        rank = cards[0].rank - 1
        sequence = True
        if len(cards)%2==0:
            for i in range(len(cards)/2):
                if  cards[2*i].rank!=cards[2*i+1].rank or cards[2*i].rank != rank+1:
                    sequence= False
                    break
                rank = cards[2*i].rank
        if sequence:
            return self.Combo.DB_SEQUENCE
        
        rank = cards[0].rank - 1
        sequence = True

        for i in range(len(cards)):
            if cards[i].rank != rank+1:
                sequence = False
                break
            rank = cards[i].rank
        if sequence:
            return self.Combo.SEQUENCE
        
        same = True
        for i in range(len(cards)-1):
            if cards[i].rank!=cards[i+1].rank:
                same=False
                break
        if same:
            return len(cards)
        else:
            return self.Combo.NONE
        
    def valid_move(self, turn:Turn) -> bool:
        if not super.has_cards(self,turn):
            return False
        if self.get_combo(self,turn) != self.current_combo_type and self.get_combo(self,turn) <100: #100 is a bomb
            return False
        
        return self.getCardValue(self,turn.transactions[0].get_card()) > self.getCardValue(self,self.current_combo[0]) 



    async def play_turn(self, turn: Turn) -> bool: #true if move was successful and no need for redo, false for redo needed
        if self.passed[self.current_player]:
            return True
        elif len(turn.transactions)==0:
            self.passed[self.current_player] = True
            return True
        
        if not self.valid_move(self,turn):
            return False
      
        self.current_combo = [trans.get_card() for trans in turn.transactions]
        self.current_combo_type = self.get_combo(self,turn=turn)
        # sort current combo
        
        super.play_turn(self,turn)
        self.current_player = (self.current_player+1)%4
        await self.broadcast_state(0)
        

        

class FishGame(Game):
    pass