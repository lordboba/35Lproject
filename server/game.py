#!/usr/bin/env python3
from card_abstraction import *

class Transaction:
    def __init__(self, card: Card = 0, from_: str = None, to_: str = None):
        self.card = card
        self.from_ = from_
        self.to_ = to_

class Turn:
    def __init__(self, player_id: str, transactions: list[Transaction]):
        self.player = player_id
        self.transactions = transactions

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
        self.owners[trans.from_].remove(trans.card)
        self.belongsTo[trans.card] = trans.to_

    # TODO Implement a logging feature
    @abstractmethod
    def add_to_log(self, trans: list[Transaction]):
        pass

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