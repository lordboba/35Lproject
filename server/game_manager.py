from game import *
import time
from fastapi import WebSocket
from core import CardModel, TransactionModel, TurnModel, ReplayModel, GameStateModel, replay_collection
from bson import ObjectId
import game

# This holds multiple game managers
class GameTracker:
    def __init__(self):
        self.game_managers: dict[str, GameManager] = {}
        self.websocket_manager = GameWebSocketManager(self)

    def create_game(self, game_id: str, name: str, game_type: str, players: list[str]):
        self.game_managers[game_id] = GameManager(self, game_id, name, game_type, players)

    async def play_turn(self, game_id: str, turn: TurnModel) -> bool:
        return await self.game_managers[game_id].play_turn(game.Turn.from_model(turn))
    
    async def broadcast(self, game_id: str, message: dict):
        await self.websocket_manager.broadcast(game_id, message)

    def delete_game(self, game_id: str):
        self.game_managers.pop(game_id)

    def get_active_games(self):
        return list(self.game_managers.keys())
    
    def get_game_state(self, game_id: str):
        return self.game_managers[game_id].game.to_game_state()

# Handles non-game logic for a single game
class GameManager:
    def __init__(self, tracker: GameTracker, game_id: str, name: str, game_type: str, players: list[str]):
        mapping = {

            "fish": game.FishGame,
            "vietcong": game.VietCongGame,
            "simple": game.SimpleGame,
        }
        game_class = mapping.get(game_type.lower())
        if not game_class:
            raise ValueError(f"Unknown game type: {game_type}")
        self.tracker = tracker
        self.game_id = game_id
        self.game = game_class(self, players)
        self.game_log = GameLog(game_id, name, game_type, players)

    async def play_turn(self, turn: game.Turn):
        return await self.game.play_turn(turn)
    
    async def broadcast(self,message: dict):
        self.game_log.log_state(message)
        await self.tracker.broadcast(self.game_id, message)

    async def end_game(self, results: dict):
        await self.game_log.save_replay(results)
        self.tracker.delete_game(self.game_id)



# Handles logging turns for replay
class GameLog:
    def __init__(self, game_id: str, name: str, game_type: str, players):
        self.timestamp = int(time.time())
        self.name = name
        self.game_id = game_id
        self.game_type = game_type
        self.players = players
        self.game_states = []


    def log_state(self, game_state):
        self.game_states.append(GameStateModel(**game_state))

    async def save_replay(self, results: dict):
        """
        Save the game replay to MongoDB.
        """

        player_obj_ids = {ObjectId(pid): score for pid, score in results.items()}

        replay = ReplayModel(
            name=self.name,
            players=player_obj_ids,
            game_states=self.game_states,
            timestamp=self.timestamp,
        )

        await replay_collection.insert_one(replay.model_dump(by_alias=True))

# Handles WebSocket for all games
class GameWebSocketManager:
    def __init__(self, tracker: GameTracker):
        self.games: dict[str, list[WebSocket]] = {}
        self.tracker = tracker

    async def connect(self, game_id: str, websocket: WebSocket):
        await websocket.accept()
        self.games.setdefault(game_id, []).append(websocket)
        await websocket.send_json(self.tracker.get_game_state(game_id).dict())

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