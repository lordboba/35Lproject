from game import *
import time
from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from core import CardModel, TransactionModel, TurnModel, ReplayModel, replay_collection, GameModel, GameCollection, GameStateModel
from bson import ObjectId
import game
from core import game_collection
import traceback
from websockets.exceptions import ConnectionClosedOK

# This holds multiple game managers
class GameTracker:
    def __init__(self):
        self.games: dict[str, GameManager] = {}
        self.websocket_manager = GameWebSocketManager(self)
        self.waiting_websocket_manager = WaitingGameWebSocketManager(self)
        self.lobby_websocket_manager = LobbyWebSocketManager(self)

    def create_game(self, game_id: str, name: str, game_type: str, players: list[str]):
        self.games[game_id] = GameManager(self, game_id, name, game_type, players)

    async def play_turn(self, game_id: str, turn: TurnModel) -> bool:
        return await self.games[game_id].play_turn(game.Turn.from_model(turn))
    
    async def broadcast(self, game_id: str, message: dict):
        await self.websocket_manager.broadcast(game_id, message)

    def delete_game(self, game_id: str):
        if game_id in self.games:
            del self.games[game_id]

    def get_active_games(self):
        return list(self.games.keys())
    
    def get_game_state(self, game_id: str):
        return self.games[game_id].get_game_state()

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
        #print("yoo")

    async def play_turn(self, turn: game.Turn):
        return await self.game.play_turn(turn)
    
    async def broadcast(self,message: dict):
        self.game_log.log_state(message)
        await self.tracker.broadcast(self.game_id, message)

    def log_state(self, game_state):
        self.game_log.log_state(game_state)

    async def end_game(self, results: dict):
        await self.game_log.save_replay(results)
        self.tracker.delete_game(self.game_id)

    def get_game_state(self):
        return self.game.to_game_state()

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

async def safe_send_json(websocket: WebSocket, data: dict) -> bool:
    """Safely send JSON data to websocket with proper error handling."""
    try:
        # Check if websocket is still connected
        if websocket.client_state != WebSocketState.CONNECTED:
            return False
        await websocket.send_json(data)
        return True
    except (WebSocketDisconnect, ConnectionClosedOK, Exception) as e:
        print(f"Error sending websocket message: {e}")
        return False

# Handles WebSocket for all games
class GameWebSocketManager:
    def __init__(self, tracker: GameTracker):
        self.games: dict[str, list[WebSocket]] = {}
        self.tracker = tracker

    async def connect(self, game_id: str, websocket: WebSocket):
        try:
            await websocket.accept()
            self.games.setdefault(game_id, []).append(websocket)
            
            # Send initial game state with safety check
            game_state = self.tracker.get_game_state(game_id)
            success = await safe_send_json(websocket, game_state.dict())
            
            if not success:
                # Remove the websocket if sending fails
                if websocket in self.games.get(game_id, []):
                    self.games[game_id].remove(websocket)
                    
        except Exception as e:
            print(f"Error in GameWebSocketManager.connect: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            # Remove the websocket if anything fails
            if game_id in self.games and websocket in self.games.get(game_id, []):
                self.games[game_id].remove(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.games and websocket in self.games[game_id]:
            self.games[game_id].remove(websocket)
            if not self.games[game_id]:
                del self.games[game_id]

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.games:
            return
            
        # Create a copy of the websockets list to avoid modification during iteration
        websockets_to_remove = []
        for ws in self.games[game_id][:]:  # Create a copy of the list
            success = await safe_send_json(ws, message)
            if not success:
                websockets_to_remove.append(ws)
        
        # Remove failed websockets
        for ws in websockets_to_remove:
            if ws in self.games[game_id]:
                self.games[game_id].remove(ws)
        
        # Clean up empty game entries
        if game_id in self.games and not self.games[game_id]:
            del self.games[game_id]

# Handles WebSocket for waiting room
class WaitingGameWebSocketManager:
    def __init__(self, tracker: GameTracker):
        self.games: dict[str, list[WebSocket]] = {}
        self.tracker = tracker

    async def connect(self, game_id: str, websocket: WebSocket):
        try:
            await websocket.accept()
            self.games.setdefault(game_id, []).append(websocket)
            
            # Send initial data to the newly connected websocket only
            game = await game_collection.find_one({"_id": ObjectId(game_id)})
            if game:
                game_model = GameModel(**game)
                success = await safe_send_json(websocket, game_model.model_dump(by_alias=True))
                
                if not success:
                    # Remove the websocket if sending fails
                    if websocket in self.games.get(game_id, []):
                        self.games[game_id].remove(websocket)
                        
        except Exception as e:
            print(f"Error in WaitingGameWebSocketManager.connect: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            # Remove the websocket if anything fails
            if game_id in self.games and websocket in self.games.get(game_id, []):
                self.games[game_id].remove(websocket)

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.games and websocket in self.games[game_id]:
            self.games[game_id].remove(websocket)
            if not self.games[game_id]:
                del self.games[game_id]

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.games:
            return
            
        # Create a copy of the websockets list to avoid modification during iteration
        websockets_to_remove = []
        for ws in self.games[game_id][:]:  # Create a copy of the list
            success = await safe_send_json(ws, message)
            if not success:
                websockets_to_remove.append(ws)
        
        # Remove failed websockets
        for ws in websockets_to_remove:
            if ws in self.games[game_id]:
                self.games[game_id].remove(ws)
        
        # Clean up empty game entries
        if game_id in self.games and not self.games[game_id]:
            del self.games[game_id]

# Handles WebSocket for lobby
class LobbyWebSocketManager:
    def __init__(self, tracker: GameTracker):
        self.games: dict[str, list[WebSocket]] = {}
        self.tracker = tracker

    async def connect(self, game_id: str, websocket: WebSocket):
        try:
            await websocket.accept()
            self.games.setdefault(game_id, []).append(websocket)
            
            # Send initial page (page 0) to the newly connected websocket
            await self.send_games_page(websocket, 0)
                    
        except Exception as e:
            print(f"Error in LobbyWebSocketManager.connect: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            # Remove the websocket if anything fails
            if game_id in self.games and websocket in self.games.get(game_id, []):
                self.games[game_id].remove(websocket)

    async def send_games_page(self, websocket: WebSocket, page: int):
        """Send a specific page of games (10 games per page) to a websocket"""
        try:
            # Check if websocket is still connected before trying to send
            if websocket.client_state != WebSocketState.CONNECTED:
                print("WebSocket not connected, skipping send_games_page")
                return False
                
            # Calculate pagination
            games_per_page = 10
            skip = page * games_per_page
            
            # Get total count and games for this page
            total_games = await game_collection.count_documents({})
            games_cursor = game_collection.find().skip(skip).limit(games_per_page)
            games_page = await games_cursor.to_list(games_per_page)
            
            # Convert raw MongoDB documents to GameModel instances for proper serialization
            games_serialized = []
            for game_doc in games_page:
                game_model = GameModel(**game_doc)
                games_serialized.append(game_model.model_dump(by_alias=True))
            
            # Calculate pagination info
            total_pages = (total_games + games_per_page - 1) // games_per_page  # Ceiling division
            has_next = page < total_pages - 1
            has_previous = page > 0
            
            # Create response with pagination info
            response = {
                "games": games_serialized,
                "pagination": {
                    "current_page": page,
                    "total_pages": total_pages,
                    "total_games": total_games,
                    "games_per_page": games_per_page,
                    "has_next": has_next,
                    "has_previous": has_previous
                }
            }
            
            success = await safe_send_json(websocket, response)
            
            if not success:
                # Remove the websocket if sending fails
                for game_id, ws_list in self.games.items():
                    if websocket in ws_list:
                        ws_list.remove(websocket)
                        break
                        
            return success
                        
        except Exception as e:
            print(f"Error sending games page: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return False

    async def handle_pagination_request(self, websocket: WebSocket, message: dict):
        """Handle pagination requests from clients"""
        try:
            if message.get("type") == "request_page":
                page = message.get("page", 0)
                await self.send_games_page(websocket, page)
        except Exception as e:
            print(f"Error handling pagination request: {e}")

    def disconnect(self, game_id: str, websocket: WebSocket):
        if game_id in self.games and websocket in self.games[game_id]:
            self.games[game_id].remove(websocket)
            if not self.games[game_id]:
                del self.games[game_id]

    async def broadcast(self, game_id: str, message: dict):
        if game_id not in self.games:
            return
            
        # For broadcasts, send the first page to all connected clients
        # This ensures everyone sees updates when games are created/deleted
        websockets_to_remove = []
        for ws in self.games[game_id][:]:  # Create a copy of the list
            await self.send_games_page(ws, 0)
        
        # Note: send_games_page already handles websocket removal on failure

tracker = GameTracker()

def get_tracker():
    return tracker