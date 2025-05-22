from game import *
import time
from fastapi import WebSocket
from core import CardModel, TransactionModel, TurnModel, ReplayModel, replay_collection
from bson import ObjectId

# This holds multiple game managers
class GameTracker:
    def __init__(self):
        self.game_managers: dict[str, GameManager] = {}
        self.websocket_manager = GameWebSocketManager()

    def create_game(self, game_id: str, name: str, game_type: str, players: list[str]):
        self.game_managers[game_id] = GameManager(self, game_id, name, game_type, players)

    def play_turn(self, game_id: str, turn: TurnModel) -> bool:
        return self.game_managers[game_id].play_turn(Turn.from_model(turn))
    
    def broadcast(self, game_id: str, message: dict):
        self.websocket_manager.broadcast(game_id, message)

    def delete_game(self, game_id: str):
        self.game_managers.pop(game_id)

# Handles non-game logic for a single game
class GameManager:
    def __init__(self, tracker: GameTracker, game_id: str, name: str, game_type: str, players: list[str]):
        mapping = {
            "fish": FishGame,
            "vietcong": VietCongGame,
            "simple": SimpleGame,
        }
        game_class = mapping.get(game_type.lower())
        if not game_class:
            raise ValueError(f"Unknown game type: {game_type}")
        self.tracker = tracker
        self.game_id = game_id
        self.game = game_class(self, players)
        self.game_log = GameLog(game_id, name, game_type, players)

    def play_turn(self, turn: Turn):
        if self.game.play_turn(turn):
            self.game_log.log_turn(turn)
            return True
        return False
    
    def broadcast(self,message: dict):
        self.tracker.broadcast(self.game_id, message)

    def end_game(self, results: dict):
        self.game_log.save_replay(results)
        self.tracker.delete_game(self.game_id)



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

    async def save_replay(self, results: dict):
        """
        Save the game replay to MongoDB.
        """

        player_obj_ids = {ObjectId(pid): score for pid, score in results.items()}

        replay = ReplayModel(
            name=self.name,
            players=player_obj_ids,
            turns=[t.to_model() for t in self.turns],
            timestamp=self.timestamp,
        )

        await replay_collection.insert_one(replay.model_dump(by_alias=True))

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

tracker = GameTracker()

def get_tracker():
    return tracker