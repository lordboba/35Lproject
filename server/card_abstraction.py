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
    def __init__(self, number=0, suit=Suit.SPEC):
        self.number = number
        self.suit = suit


# Base Owner
class Owner(ABC):
    def __init__(self, cards: list[Card] = None):
        self.cards: list[Card] = []
        self.isPlayer: bool = False

    def get_cards() -> list[Card]:
        return self.cards

    def contains_card(card: Card):
        return any(c == card for c in self.cards)

    def find_cards(number: int = 0, suit: Suit = Suit.SPEC) -> Card:
        for c in self.cards:
            if c.number == number and c.suit == suit:
                return c

        return None


class Game(ABC):
    def __init__(self, owners: dict[str, Owner], cards: list[Card]):
        self.owners = owners
        self.cards = cards

        self.belongsTo: dict[Card, str] = {}

        for owner_id, card_list in self.owners:
            for c in card_list:
                belongsTo[c] = owner_id

    class Transaction:
        def __init__(card: Card = 0, from_: str = None, to_: str = None):
            self.card = card
            self.from_ = from_
            self.to_ = to_

    # Perform transaction of card between two owners
    def transact(trans: Transaction) -> bool:
        # Check if it's possible to transfer the card
        if self.belongsTo[c] != trans.from_:
            return False

        # Remove card from from_ and append to to_
        self.owners[trans.from_].remove(trans.card)
        self.owners[trans.to_].remove(trans.card)

        self.belongsTo[trans.card] = trans.to_

    # TODO Implement a logging feature
    @abstractmethod
    def add_to_log(trans: list[Transaction]):
        pass
