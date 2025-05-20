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

    def get_cards(self) -> list[Card]:
        return self.cards

    def contains_card(self,card: Card):
        return any(c == card for c in self.cards)

    def find_cards(self,number: int = 0, suit: Suit = Suit.SPEC) -> Card:
        for c in self.cards:
            if c.number == number and c.suit == suit:
                return c

        return None
