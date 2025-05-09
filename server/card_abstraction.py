from abc import ABC, abstractmethod
from enum import Enum


class Suit(Enum):
    SPEC = 0
    CLUB = 1
    DIAMOND = 2
    HEART = 3
    SPADE = 4


# Base Card
class Card(ABC):
    def __init__(self, number=0, suit=Suit.SPEC, owner: "Owner" = None):
        self.number = number
        self.suit = suit
        self.owner = owner


# Base Owner
class Owner(ABC):
    def __init__(self, cards: List[Card] = None):
        self.cards: List[Card] = []
        self.isPlayer: bool = False

    def get_cards() -> List[Card]:
        return self.cards

    def contains_card(card: Card):
        return any(c == card for c in self.cards)

    def find_cards(number: int = 0, suit: Suit = Suit.SPEC) -> Card:
        for c in self.cards:
            if c.number == number and c.suit == suit:
                return c

        return None


class Game(ABC):
    def __init__(self, owners: List[Owner], cards: List[Card]):
        self.owners = owners
        self.cards = cards

    class Transaction:
        def __init__(card: Card = 0, from_: Owner = None, to_: Owner = None):
            self.card = card
            self.from_ = from_
            self.to_ = to_

    # Perform transaction of card between two owners
    def transact(trans: Transaction) -> bool:
        # Check if it's possible to transfer the card
        if (not trans.from_.contains_card(trans.card)) or (
            trans.to_.contains_card(trans.card)
        ):
            return False

        # Remove card from from_ and append to to_
        trans.from_.remove(trans.card)
        trans.to_.append(trans.card)

    # TODO Implement a logging feature
    def add_to_log(trans: List[Transaction]):
        pass
