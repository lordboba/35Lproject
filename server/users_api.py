from fastapi import APIRouter, Body, HTTPException, status, WebSocket, WebSocketDisconnect, Depends
from bson import ObjectId
import re
from pymongo import ReturnDocument
import time
from game_manager import GameTracker, get_tracker
import asyncio
from typing import List
from starlette.websockets import WebSocketState

from core import (
    user_collection,
    game_collection,
    replay_collection,
    UserModel,
    UpdateUserModel,
    FirebaseUserRegistrationRequest,
    CheckUsernameResponse,
    CompleteRegistrationRequest,
    UserCollectionModel,
    GameModel,
    GameCreateModel,
    GameCollection,
    TurnModel,
    ReplaySummaryModel,
    ReplaySearchModel,
    ReplayModel,
    ReplayCollectionModel,
    UserSearchModel
)

from game import Card, Transaction, Turn, GAME_RULES

router = APIRouter()

# --- ENDPOINTS ---

@router.post(
    "/users/initialize",
    response_description="Initialize or get user by Firebase UID",
    response_model=UserModel,
    status_code=status.HTTP_200_OK,
    response_model_by_alias=False,
)
async def initialize_user(payload: FirebaseUserRegistrationRequest = Body(...)):
    existing_user = await user_collection.find_one({"firebase_uid": payload.firebase_uid})
    if existing_user:
        return UserModel(**existing_user)

    # Use UserModel defaults
    new_user = UserModel(firebase_uid=payload.firebase_uid)
    new_user_data = new_user.model_dump(by_alias=True, exclude={"id"})


    insert_result = await user_collection.insert_one(new_user_data)
    created_user = await user_collection.find_one({"_id": insert_result.inserted_id})
    if not created_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user.")
    
    return UserModel(**created_user)

@router.get(
    "/users/check_username_availability/{username}",
    response_description="Check if a username is available",
    response_model=CheckUsernameResponse,
    status_code=status.HTTP_200_OK,
)
async def check_username_availability(username: str):
    """
    Checks if the given username is already taken.
    """
    if not re.match(r"^[a-zA-Z0-9_]{3,20}$", username):
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username format invalid. Must be 3-20 alphanumeric characters or underscores.")

    existing_user = await user_collection.find_one({"name": username})
    if existing_user:
        return CheckUsernameResponse(is_available=False)
    return CheckUsernameResponse(is_available=True)


@router.put(
    "/users/complete_registration",
    response_description="Complete user registration by setting a username",
    response_model=UserModel,
    status_code=status.HTTP_200_OK,
    response_model_by_alias=False,
)
async def complete_registration(payload: CompleteRegistrationRequest = Body(...)):
    """
    Sets or updates the username for a user identified by Firebase UID
    and marks their username as set.
    """
    conflicting_user = await user_collection.find_one({"name": payload.username})
    if conflicting_user and conflicting_user.get("firebase_uid") != payload.firebase_uid:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken.")

    user_to_update = await user_collection.find_one({"firebase_uid": payload.firebase_uid})
    if not user_to_update:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found with this Firebase UID.")

    if user_to_update.get("name") == payload.username and user_to_update.get("username_set"):
        return user_to_update
        
    updated_user_data = {
        "name": payload.username,
        "username_set": True
    }
    
    result = await user_collection.find_one_and_update(
        {"firebase_uid": payload.firebase_uid},
        {"$set": updated_user_data},
        return_document=ReturnDocument.AFTER
    )

    if not result:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user.")
    
    return result

@router.post(
    "/users/",
    response_description="Add new user",
    response_model=UserModel,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=False,
)
async def create_user(user: UserModel = Body(...)):
    existing_by_fb_uid = await user_collection.find_one({"firebase_uid": user.firebase_uid})
    if existing_by_fb_uid:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"User with Firebase UID {user.firebase_uid} already exists.")

    if user.name:
        if not re.match(r"^[a-zA-Z0-9_]{3,20}$", user.name):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username format invalid.")
        
        existing_by_name = await user_collection.find_one({"name": user.name})
        if existing_by_name:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{user.name}' already taken.")
        user.username_set = True
    else:
        user.username_set = False

    new_user_doc_data = user.model_dump(by_alias=True, exclude={"id"})

    insert_result = await user_collection.insert_one(new_user_doc_data)
    created_user = await user_collection.find_one(
        {"_id": insert_result.inserted_id}
    )
    if not created_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create and retrieve user.")
    return created_user

@router.get(
    "/users/",
    response_description="List all users",
    response_model=UserCollectionModel,
    response_model_by_alias=False,
)
async def list_users():
    """
    List all of the user data in the database.

    The response is unpaginated and limited to 1000 results.
    """
    return UserCollectionModel(users=await user_collection.find().to_list(1000))

@router.get(
        "/users/name/{name}",
        response_description="Get a single user by name",
        response_model=UserModel,
        response_model_by_alias=False,
)
async def get_user_name(name: str):
    """
    Get the record for a specific user, looked up by 'name'
    """
    if(
        user := await user_collection.find_one({"name": name})
    ) is not None:
        return user
    
    raise HTTPException(status_code=404, detail=f"User with name '{name}' not found")

@router.put(
    "/users/{id}", # This endpoint operates on MongoDB's _id
    response_description="Update a user",
    response_model=UserModel,
    response_model_by_alias=False,
)
async def update_user(id: str, user_update_payload: UpdateUserModel = Body(...)):
    """
    Update individual fields of an existing user record, looked up by `id` (MongoDB _id).
    If 'name' (username) is being updated, it's checked for uniqueness and format.
    If 'name' is updated, 'username_set' is automatically set to True.
    Note: This endpoint doesn't use firebase_uid for lookup or updates directly.
    """
    update_data = {
        k: v for k, v in user_update_payload.model_dump(by_alias=False).items() if v is not None
    } # use by_alias=False if Pydantic model uses aliases like _id

    if not update_data:
        # No actual updates provided, try to return existing user or 404
        existing_user = await user_collection.find_one({"_id": ObjectId(id)})
        if existing_user:
            return existing_user
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {id} not found.")

    # If username (name field) is being updated, check for uniqueness and format
    if "name" in update_data:
        new_name = update_data["name"]
        if not re.match(r"^[a-zA-Z0-9_]{3,20}$", new_name):
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username format invalid.")
        
        # Check if the new username is taken by *another* user
        conflicting_user = await user_collection.find_one({"name": new_name, "_id": {"$ne": ObjectId(id)}})
        if conflicting_user:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{new_name}' already taken.")
        # If name is being set/updated, imply username_set is true for this user.
        update_data["username_set"] = True 

    updated_user_doc = await user_collection.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    
    if updated_user_doc is not None:
        return updated_user_doc
    else:
        # If find_one_and_update returns None, it means the document with 'id' was not found
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User {id} not found during update attempt.")

@router.delete(
    "/users/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_description="Delete a user"
)
async def delete_user(id: str):
    """
    Delete a single user. 
    """
    delete_result = await user_collection.delete_one({"_id": ObjectId(id)})

    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"User {id} not found")

# Games

@router.get(
    "/games/",
    response_description="List all games",
    response_model=GameCollection,
    response_model_by_alias=False,
)
async def list_games():
    """
    List all games in the database (max 1000).
    """
    games_docs = await game_collection.find().to_list(1000)
    # Convert raw MongoDB documents to GameModel instances for proper serialization
    games_models = []
    for game_doc in games_docs:
        game_model = GameModel(**game_doc)
        games_models.append(game_model)
    return GameCollection(games=games_models)

@router.post(
    "/games/",
    response_description="Create a new game",
    response_model=GameModel,
    response_model_by_alias=False,
)
async def create_game(game: GameCreateModel, tracker: GameTracker = Depends(get_tracker)):
    """
    Create a new game.
    """
    game_dict = game.dict()
    game_dict["players"] = []
    
    result = await game_collection.insert_one(game_dict)
    new_game = await game_collection.find_one({"_id": result.inserted_id})
    # Convert to GameModel to ensure proper ObjectId serialization
    game_model = GameModel(**new_game)
    
    # Broadcast to lobby that a new game was created
    await tracker.lobby_websocket_manager.broadcast("lobby", {})
    
    return game_model.model_dump(by_alias=True)

@router.get("/games/{game_id}/get_game",
             response_description="Get game by ID",
    response_model=GameModel,
    response_model_by_alias=False,
)
async def get_game_by_id(game_id: str):
    """
    Get a game by its ID.
    """
    game = await game_collection.find_one({"_id": ObjectId(game_id)})
    print(game)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Convert to GameModel to ensure proper ObjectId serialization
    game_model = GameModel(**game)
    return game_model.model_dump(by_alias=True)

@router.patch(
    "/games/{game_id}/add_user/{user_id}",
    response_description="Add a user to a game",
    response_model=GameModel,
    response_model_by_alias=False,
)
async def add_user_to_game(game_id: str, user_id: str, tracker: GameTracker = Depends(get_tracker)):
    """
    Add a user to the game's players list.
    """
    game = await game_collection.find_one({"_id": ObjectId(game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if ObjectId(user_id) in game["players"]:
        raise HTTPException(status_code=400, detail="User already in game")
    
    if len(game["players"]) >= GAME_RULES[game["type"]]["max_players"]:
        raise HTTPException(status_code=400, detail="Game is already full")

    await game_collection.update_one(
        {"_id": ObjectId(game_id)},
        {"$addToSet": {"players": ObjectId(user_id)}}
    )
    updated_game = await game_collection.find_one({"_id": ObjectId(game_id)})
    # Convert to GameModel to ensure proper ObjectId serialization
    game_model = GameModel(**updated_game)
    
    # Broadcast the updated game data to all waiting room clients for this game
    await tracker.waiting_websocket_manager.broadcast(game_id, game_model.model_dump(by_alias=True))
    
    # Also broadcast to lobby to update player counts
    await tracker.lobby_websocket_manager.broadcast("lobby", {})
    
    return game_model.model_dump(by_alias=True)


@router.patch(
    "/games/{game_id}/remove_user/{user_id}",
    response_description="Remove a user from a game",
    response_model=GameModel,
    response_model_by_alias=False,
)
async def remove_user_from_game(game_id: str, user_id: str, tracker: GameTracker = Depends(get_tracker)):
    """
    Remove a user from the game's players list.
    """
    game = await game_collection.find_one({"_id": ObjectId(game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if ObjectId(user_id) not in game["players"]:
        raise HTTPException(status_code=400, detail="User not in game")

    await game_collection.update_one(
        {"_id": ObjectId(game_id)},
        {"$pull": {"players": ObjectId(user_id)}}
    )
    updated_game = await game_collection.find_one({"_id": ObjectId(game_id)})
    # Convert to GameModel to ensure proper ObjectId serialization
    game_model = GameModel(**updated_game)
    
    # Broadcast the updated game data to all waiting room clients for this game
    await tracker.waiting_websocket_manager.broadcast(game_id, game_model.model_dump(by_alias=True))
    
    # Also broadcast to lobby to update player counts
    await tracker.lobby_websocket_manager.broadcast("lobby", {})
    
    return game_model.model_dump(by_alias=True)

@router.patch(
    "/games/{game_id}/start",
    response_description="Start game",
    status_code=204,
)
async def start_game(game_id: str, tracker: GameTracker = Depends(get_tracker)):
    """
    Start game by ID
    """
    game = await game_collection.find_one({"_id": ObjectId(game_id)})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if len(game["players"]) != GAME_RULES[game["type"]]["max_players"]:
        raise HTTPException(status_code=400, detail="Game not full yet")
    
    tracker.create_game(game_id, game["name"], game["type"], list(map(str,game["players"])))

    await game_collection.delete_one({"_id": ObjectId(game_id)})
    
    # Broadcast to lobby that a game was started (removed from available games)
    await tracker.lobby_websocket_manager.broadcast("lobby", {})

@router.patch(
    "/games/{game_id}/play",
    response_description="Play turn",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def play_turn(game_id: str, turn: TurnModel = Body(...), tracker: GameTracker = Depends(get_tracker)):
    """
    Play a turn in an ongoing game by ID
    """

    if game_id not in tracker.get_active_games():
        raise HTTPException(status_code=400, detail="Game not started or no active manager")
    
    success = await tracker.play_turn(game_id, turn)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid turn or game state")
    
@router.delete(
    "/games/all",
    response_description="Delete all games",
    status_code=204,
)
async def delete_all_games(tracker: GameTracker = Depends(get_tracker)):
    """
    Delete all games from both the database and active games in memory.
    """
    try:
        # Get all games from the database first
        all_games = await game_collection.find().to_list(1000)
        print(f"Found {len(all_games)} games in database")
        
        # Delete each game individually from the database
        for game in all_games:
            await game_collection.delete_one({"_id": game["_id"]})
        print(f"Deleted {len(all_games)} games from database")
        
        # Delete all active games from the tracker
        active_game_ids = list(tracker.games.keys())
        print(f"Found {len(active_game_ids)} active games")
        
        for game_id in active_game_ids:
            tracker.delete_game(game_id)
        print(f"Deleted {len(active_game_ids)} active games")
        
        return {}
    except Exception as e:
        print(f"Error in delete_all_games: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete(
    "/games/{game_id}",
    response_description="Delete game",
    status_code=204,
)
async def delete_game(game_id: str, tracker: GameTracker = Depends(get_tracker)):
    """
    Delete a game from the database.
    """
    delete_result = await game_collection.delete_one({"_id": ObjectId(game_id)})

    if delete_result.deleted_count == 1:
        # Broadcast to lobby that a game was deleted
        await tracker.lobby_websocket_manager.broadcast("lobby", {})
        return {}

    raise HTTPException(status_code=404, detail=f"Game {game_id} not found")

# WebSocket

@router.websocket("/game/ws/{game_id}")
async def game_ws(websocket: WebSocket, game_id: str,tracker: GameTracker = Depends(get_tracker)):
    await tracker.websocket_manager.connect(game_id, websocket)
    try:
        while True:
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        tracker.websocket_manager.disconnect(game_id, websocket)

# For waiting room
@router.websocket("/games/{game_id}/waiting/ws")
async def waiting_room_ws(websocket: WebSocket, game_id: str, tracker: GameTracker = Depends(get_tracker)):
    # Handle waiting room connections
    await tracker.waiting_websocket_manager.connect(game_id, websocket)
    try:
        while True:
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        tracker.waiting_websocket_manager.disconnect(game_id, websocket)
    pass

# For lobby
@router.websocket("/lobby/ws")
async def lobby_ws(websocket: WebSocket, tracker: GameTracker = Depends(get_tracker)):
    # Handle lobby connections - no specific game_id needed for general lobby
    try:
        await tracker.lobby_websocket_manager.connect("lobby", websocket)
        
        while True:
            # Listen for incoming messages for pagination requests
            try:
                # Check if websocket is still connected before trying to receive
                if websocket.client_state != WebSocketState.CONNECTED:
                    break
                    
                message = await websocket.receive_json()
                await tracker.lobby_websocket_manager.handle_pagination_request(websocket, message)
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"Error handling lobby websocket message: {e}")
                # Continue listening for more messages
                continue
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error in lobby WebSocket connection: {e}")
    finally:
        tracker.lobby_websocket_manager.disconnect("lobby", websocket)


# Dev

@router.get(
    "/games/active",
    response_description="Get active game not in DB",
    response_model=List[str],
    response_model_by_alias=False,
)
async def get_active_games(tracker: GameTracker = Depends(get_tracker)):
    """
    Get active game not in DB
    """
    return tracker.get_active_games()

@router.get(
    "/games/active/{game_id}/debug",
    response_description="Get active game owners",
    response_model=List[str],
    response_model_by_alias=False,
)
async def get_active_game_debug(game_id: str, tracker: GameTracker = Depends(get_tracker)):
    """
    Get a list showing each card and its owner (string format)
    """
    result = []
    owners = tracker.game_managers[game_id].game.owners
    for owner_name, owner_obj in owners.items():
        for card in owner_obj.cards:
            result.append(f"{owner_name}: {card}")
    return result


# async def get_active_game_debug(game_id: str, tracker: GameTracker = Depends(get_tracker)):
#     """
#     Get active game owners
#     """
#     return [str(card) for card in list(tracker.game_managers[game_id].game.owners.values())[0].cards]

# DB Query 

@router.get(
    "/replays/search",
    response_model=List[ReplaySummaryModel],
    response_description="Search replays with filters"
)
async def search_replays(filters: ReplaySearchModel = Depends()):
    query = {}

    if filters.player_id:
        if filters.result_codes:
            query[f"players.{filters.player_id}"] = {"$in": filters.result_codes}
        else:
            query[f"players.{filters.player_id}"] = {"$exists": True}

    if filters.start_time or filters.end_time:
        query["timestamp"] = {}
        if filters.start_time:
            query["timestamp"]["$gte"] = filters.start_time
        if filters.end_time:
            query["timestamp"]["$lte"] = filters.end_time

    if filters.type:
        query["type"] = filters.type

    if filters.name:
        query["name"] = filters.name

    results = await replay_collection.find(query).to_list(1000)

    projection = {
        "_id": 1,
        "type": 1,
        "name": 1,
        "players": 1,
        "timestamp": 1,
    }

    cursor = replay_collection.find(query, projection)
    results = await cursor.to_list(length=1000)

    return ReplayCollectionModel(replays=[ReplaySummaryModel(**doc) for doc in results])

@router.get(
    "/replays/{replay_id}",
    response_model=ReplayModel,
    response_description="Get a single replay by ID"
)
async def get_replay_by_id(replay_id: str):
    """
    Retrieves a replay document by its MongoDB ID.
    """
    try:
        obj_id = ObjectId(replay_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid replay ID format.")

    replay = await replay_collection.find_one({"_id": obj_id})
    if not replay:
        raise HTTPException(status_code=404, detail="Replay not found.")

    return replay

@router.get(
    "/users/search",
    response_model=UserCollectionModel,
    response_model_by_alias=False,
    summary="Search for users by game statistics and filters",
)
async def search_users(filters: UserSearchModel = Depends()):
    query = {}

    if filters.name:
        query["name"] = {"$regex": filters.name, "$options": "i"}

    # Filters for fish games
    if filters.min_fish_games is not None:
        query["stats.fish.games"] = {"$gte": filters.min_fish_games}

    if filters.min_claims is not None:
        query["stats.fish.claims"] = {"$gte": filters.min_claims}

    # Filters for vietcong games
    if filters.min_vietcong_games is not None:
        query["stats.vietcong.games"] = {"$gte": filters.min_vietcong_games}

    users_raw = await user_collection.find(query).to_list(1000)

    results = []
    for doc in users_raw:
        stats = doc.get("stats", {})
        fish = stats.get("fish", {})
        viet = stats.get("vietcong", {})

        # Handle fish win rate
        if filters.min_fish_win_rate is not None:
            games = fish.get("games", 0)
            wins = fish.get("wins", 0)
            if games == 0 or (wins / games) < filters.min_fish_win_rate:
                continue

        # Handle fish claim rate
        if filters.min_claim_rate is not None:
            claims = fish.get("claims", 0)
            successful = fish.get("successful_claims", 0)
            if claims == 0 or (successful / claims) < filters.min_claim_rate:
                continue

        # Handle vietcong scoring rate
        if filters.min_vietcong_score_rate is not None:
            vc_games = viet.get("games", 0)
            finishes = viet.get("place_finishes", {})
            score = (
                finishes.get("first", 0) * 1.0
                + finishes.get("second", 0) * 0.6
                + finishes.get("third", 0) * 0.3
            )
            rate = score / vc_games if vc_games else 0
            if rate < filters.min_vietcong_score_rate:
                continue

        # Convert to UserModel
        results.append(UserModel(**doc))

    return UserCollectionModel(users=results)

@router.get(
    "/users/{id}",
    response_description="Get a single user by id",
    response_model=UserModel,
    response_model_by_alias=False,
)
async def show_user(id: str):
    """
    Get the record for a specific user, looked up by `id`.
    """
    if (
        user := await user_collection.find_one({"_id": ObjectId(id)})
    ) is not None:
        return user

    raise HTTPException(status_code=404, detail=f"User {id} not found")