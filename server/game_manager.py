from game import *
import time
from fastapi import WebSocket

# This holds multiple game managers
class GameTracker:
    def __init__(self):
        self.game_managers: dict[str, GameManager] = {}
        self.websocket_manager = GameWebSocketManager()

    def create_game(self, game_id: str, name: str, game_type: str, players: list[str]):
        self.game_managers[game_id] = GameManager(game_id, name, game_type, players)

    def transact(self, game_id: str, trans: Transaction):
        self.game_managers[game_id].transact(trans)

    # TODO Add ways to work with the game

# Handles non-game logic for a single game
class GameManager:
    def __init__(self, game_id: str, name: str, game_type: str, players: list[str]):
        mapping = {
            "fish": FishGame,
            "vietcong": VietCongGame,
            "simple": SimpleGame,
        }
        game_class = mapping.get(game_type.lower())
        if not game_class:
            raise ValueError(f"Unknown game type: {game_type}")
        self.game = game_class(self, players)
        self.game_log = GameLog(game_id, name, game_type, players)

# Handles logging turns for replay
class GameLog:
    def __init__(self, game_id: str, name: str, game_type: str, players):
        self.timestamp = int(time.time())
        self.name = name
        self.game_id = game_id
        self.game_type = game_type
        self.players = players
        self.turns = []

    def log_turn(self, turn: Turn):
        self.turns.append(turn)

# Handles WebSocket for all games
class GameWebSocketManager:
    def __init__(self):
        self.games: dict[str, list[WebSocket]] = {}

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        self.games.setdefault(game_id, []).append(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        self.games[game_id].remove(websocket)
        if not self.games[game_id]:
            del self.games[game_id]

    async def broadcast(self, game_id: str, message: dict):
        for ws in self.games.get(game_id, []):
            await ws.send_json(message)
