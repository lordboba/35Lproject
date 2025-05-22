#!/usr/bin/env python3
from abc import ABC, abstractmethod
from enum import Enum
from core import CardModel, TurnModel, TransactionModel, OwnerModel, GameStateModel

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
    def __init__(self, number=0, suit=Suit.SPEC):
        self.number = number
        self.suit = suit

    def __eq__(self, other):
        return isinstance(other, Card) and self.number == other.number and self.suit == other.suit
    
    def to_model(self) -> CardModel:
        return CardModel(suit=self.suit, rank=self.rank)
    
    @classmethod
    def from_model(cls, model: CardModel):
        return cls(suit=model.suit, rank=model.rank)

# Base Owner
class Owner(ABC):
    def __init__(self, cards: list[Card] = None):
        self.cards: list[Card] = []
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
        return OwnerModel(cards=[card.to_model for card in self.cards], is_player=self.is_player)

class Transaction:
    def __init__(self, card: Card = None, from_: str = None, to_: str = None):
        self.card = card
        self.from_ = from_
        self.to_ = to_

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
    def __init__(self, manager, owners: dict[str, Owner], cards: list[Card]):
        self.manager = manager
        self.owners = owners
        self.cards = cards
        self.current_player: str = None
        self.last_turn: Turn = None

        self.belongsTo: dict[Card, str] = {}

        for owner_id, owner in self.owners.items():
            for c in owner.get_cards():
                self.belongsTo[c] = owner_id

    # Perform transaction of card between two owners
    def transact(self, trans: Transaction) -> bool:
        # Check if it's possible to transfer the card
        if self.belongsTo[trans.card] != trans.from_:
            return False

        # Remove card from from_ and append to to_
        self.owners[trans.from_].remove_card(trans.card)
        self.owners[trans.to_].add_card(trans.card)
        self.belongsTo[trans.card] = trans.to_

    def play_turn(self, turn: Turn) -> bool:
        for trans in turn.transactions:
            self.transact(trans)
        return True

    def to_game_state(self, status: int) -> GameStateModel:
        return GameStateModel(owners=[owner.to_model() for owner in self.owners], current_player=self.current_player, last_turn=self.last_turn, status=status)

    def broadcast_state(self, status: int):
        self.manager.broadcast(self.to_game_state(status).dict())

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
    pass

class FishGame(Game):
    pass