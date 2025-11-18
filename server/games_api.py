from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from typing import List, Dict
from bson import ObjectId

try:
    from .core import GameModel, GameCreateModel
    from .game_manager import get_tracker
except ImportError:  # Allows running directly from server/
    from core import GameModel, GameCreateModel  # type: ignore
    from game_manager import get_tracker  # type: ignore

# Create router
router = APIRouter(
    prefix="/games",
    tags=["games"],
)

# Active game connections - maps game_id to a list of user_ids
active_game_users: Dict[str, List[str]] = {}
# Active WebSocket connections - maps connection_id to websocket and game_id
active_connections: Dict[str, Dict] = {}

@router.post("/", response_model=GameModel)
async def create_game(game_data: GameCreateModel):
    """
    Create a new game
    """
    # Generate a unique game ID
    game_id = str(ObjectId())
    
    # Initialize the list of players
    players = []
    print("creating new game...")
    # Create the game in the tracker
    try:
        # Store in the active_game_users dictionary
        active_game_users[game_id] = []
        print(active_game_users)
        # Create the game in the tracker with empty players list
        get_tracker().create_game(game_id, game_data.name, game_data.type, players)
        
        # Return the game model
        return {
            "_id": game_id,
            "name": game_data.name,
            "type": game_data.type,
            "players": players
        }
    except (ValueError, TypeError) as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{game_id}/users/{user_id}")
async def add_user_to_game(game_id: str, user_id: str):
    """
    Add a user to an existing game
    """
    #print(active_game_users)
    #if game_id not in active_game_users:
    #    raise HTTPException(status_code=404, detail="Game not found")
    
    # Check if game is at capacity based on the game type
    game_managers = get_tracker().game_managers
    print(game_managers)
    if game_id not in game_managers:
        raise HTTPException(status_code=404, detail="Game not found in tracker")
    
    game_manager = game_managers[game_id]
    game_type = game_manager.game_log.game_type
    
    # Get the max players for this game type
    try:
        from .game import GAME_RULES
    except ImportError:  # pragma: no cover - fallback for script execution
        from game import GAME_RULES  # type: ignore
    max_players = GAME_RULES.get(game_type, {}).get("max_players", 4)
    
    # Check if the game is already full
    if len(active_game_users[game_id]) >= max_players:
        raise HTTPException(status_code=400, detail="Game is already full")
    
    # Check if user is already in the game
    if user_id in active_game_users[game_id]:
        return {"message": "User already in game"}
    
    # Add user to the game
    active_game_users[game_id].append(user_id)
    
    # Update the game in the tracker with the new player list
    try:
        # We need to modify the players list in the game manager
        # For now, we'll just update our tracking dictionary
        return {"message": "User added to game"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.websocket("/ws/{game_id}/users")
async def list_users_websocket(websocket: WebSocket, game_id: str):
    """
    WebSocket endpoint that monitors the active list of users in a specific game
    """
    connection_id = str(ObjectId())
    
    # Accept the connection
    await websocket.accept()
    
    # Store the connection
    active_connections[connection_id] = {
        "websocket": websocket,
        "game_id": game_id
    }
    
    try:
        # Send initial list of users
        if game_id in active_game_users:
            await websocket.send_json({"users": active_game_users[game_id]})
        else:
            await websocket.send_json({"users": []})
        
        # Keep the connection open and listen for messages
        while True:
            # This will just keep the connection open
            # We'll broadcast updates when users join/leave
            data = await websocket.receive_text()
            # We could process messages here if needed
    except WebSocketDisconnect:
        # Remove the connection when disconnected
        if connection_id in active_connections:
            del active_connections[connection_id]

# Helper function to broadcast user updates to all connections for a game
async def broadcast_user_update(game_id: str):
    """
    Broadcast updated user list to all connections for a specific game
    """
    if game_id not in active_game_users:
        return
    
    users = active_game_users[game_id]
    
    # Find all connections for this game
    for conn_id, conn_info in active_connections.items():
        if conn_info["game_id"] == game_id:
            try:
                await conn_info["websocket"].send_json({"users": users})
            except:
                # Handle any exceptions (connection might be closed)
                pass

# Update broadcast_user_update when adding users to games
@router.get("/{game_id}/users")
async def get_game_users(game_id: str):
    """
    Get the list of users in a game
    """
    if game_id not in active_game_users:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return {"users": active_game_users[game_id]}
