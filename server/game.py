#!/usr/bin/env python3
from card_abstraction import *


class SimpleGame(Game):
    def __init__(self):
        cardsA = [Card(i + 1, Suit.CLUB) for i in range(10)]
        cardsB = [Card(i + 1, Suit.DIAMOND) for i in range(10)]

        cards = cardsA + cardsB

        owners: dict[str, Owner] = {
            "A": Owner(cardsA),
            "B": Owner(cardsB),
        }

        super().__init__(owners, cards)
