#!/usr/bin/env python3
from abc import ABC, abstractmethod
from enum import Enum

GAME_RULES = {
    "Viet Cong": {
        "max_players": 4
    },
    "Fish": {
        "max_players": 6
    },
    "Simple": {
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

# Base Owner
class Owner(ABC):
    def __init__(self, cards: list[Card] = None):
        self.cards: list[Card] = []
        self.isPlayer: bool = False

    def get_cards(self) -> list[Card]:
        return self.cards

    def contains_card(self,card: Card):
        return card in self.cards
    
    def add_card(self,card: Card):
        self.cards.append(card)
    
    def remove_card(self,card: Card):
        self.cards.remove(card)

class Transaction:
    def __init__(self, card: Card = None, from_: str = None, to_: str = None):
        self.card = card
        self.from_ = from_
        self.to_ = to_

class Turn:
    def __init__(self, player_id: str, turn_type: int, transactions: list[Transaction]):
        self.player = player_id
        self.transactions = transactions
        self.turn_type = turn_type

class Game(ABC):
    def __init__(self, manager, owners: dict[str, Owner], cards: list[Card]):
        self.manager = manager
        self.owners = owners
        self.cards = cards

        self.belongsTo: dict[Card, str] = {}

        for owner_id, card_list in self.owners.items():
            for c in card_list:
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