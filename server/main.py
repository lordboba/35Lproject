import os
import re
from typing import Optional, List

from fastapi import FastAPI, Body, HTTPException, status
from fastapi.responses import Response
from pydantic import ConfigDict, BaseModel, Field, EmailStr
from pydantic.functional_validators import BeforeValidator
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import certifi
from typing_extensions import Annotated

from bson import ObjectId
import motor.motor_asyncio
from pymongo import ReturnDocument
import pymongo
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="Card Game API",
    summary="Test version",
)

# Define allowed origins
origins = [
    "http://localhost:5173",  # frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, etc.)
    allow_headers=["*"],  # Allows all headers
)

client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URL"])
db = client.game
user_collection = db.get_collection("users")

# Represents an ObjectId field in the database.
# It will be represented as a `str` on the model so that it can be serialized to JSON.
PyObjectId = Annotated[str, BeforeValidator(str)]

class CardModel(BaseModel):
    """
    Container for a single card.
    """
    rank: int = Field(...)
    suit: int = Field(...)
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class TransactionModel(BaseModel):
    """
    Container for a single transaction.
    """
    sender: str = Field(...)
    receiver: str = Field(...)
    card: CardModel = Field(...)
    success: bool = Field(...)
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class TurnModel(BaseModel):
    """
    Container for a single turn.
    """
    player: str = Field(...)
    transactions: List[TransactionModel] = Field(default_factory=list)

class UserModel(BaseModel):
    """
    Container for a single user record.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    firebase_uid: str = Field(...)
    name: Optional[str] = Field(default=None)
    games: int = Field(default=0)
    wins: int = Field(default=0)
    username_set: bool = Field(default=False)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class UpdateUserModel(BaseModel):
    """
    A set of optional updates to be made to a document in the database.
    """

    name: Optional[str] = None
    games: Optional[int] = None
    wins: Optional[int] = None
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class UserCollection(BaseModel):
    """
    A container holding a list of `UserModel` instances.

    This exists because providing a top-level array in a JSON response can be a [vulnerability](https://haacked.com/archive/2009/06/25/json-hijacking.aspx/)
    """

    users: List[UserModel]


class FirebaseUserRegistrationRequest(BaseModel):
    firebase_uid: str = Field(...)

class CheckUsernameResponse(BaseModel):
    is_available: bool

class CompleteRegistrationRequest(BaseModel):
    firebase_uid: str = Field(...)
    username: str = Field(..., min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")


@app.post(
    "/users/initialize",
    response_description="Initialize or get user by Firebase UID",
    response_model=UserModel,
    status_code=status.HTTP_200_OK, 
    response_model_by_alias=False,
)
async def initialize_user(payload: FirebaseUserRegistrationRequest = Body(...)):
    """
    Initializes a new user record if one doesn't exist for the Firebase UID,
    or retrieves the existing user record.
    """
    existing_user = await user_collection.find_one({"firebase_uid": payload.firebase_uid})
    if existing_user:
        return existing_user

    new_user_data = {
        "firebase_uid": payload.firebase_uid,
        "name": None,
        "games": 0,
        "wins": 0,
        "username_set": False
    }
    insert_result = await user_collection.insert_one(new_user_data)
    created_user = await user_collection.find_one({"_id": insert_result.inserted_id})
    if not created_user:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create user.")
    return created_user


@app.get(
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


@app.put(
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


@app.post(
    "/users/",
    response_description="Add new user",
    response_model=UserModel,
    status_code=status.HTTP_201_CREATED,
    response_model_by_alias=False,
)
async def create_user(user: UserModel = Body(...)):
    """
    Insert a new user record.
    `firebase_uid` is mandatory. If `name` (username) is provided, it will be checked for uniqueness.
    `username_set` will be set to True if `name` is provided, False otherwise.
    Consider if this endpoint is still the primary way to create users vs. /users/initialize.
    """
    # firebase_uid is now mandatory in UserModel, Pydantic validation handles its presence.

    # Check for existing user by firebase_uid, as it should be unique
    existing_by_fb_uid = await user_collection.find_one({"firebase_uid": user.firebase_uid})
    if existing_by_fb_uid:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"User with Firebase UID {user.firebase_uid} already exists.")

    # Handle username (name field) if provided
    if user.name:
        if not re.match(r"^[a-zA-Z0-9_]{3,20}$", user.name):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username format invalid.")
        
        existing_by_name = await user_collection.find_one({"name": user.name})
        if existing_by_name:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Username '{user.name}' already taken.")
        user.username_set = True # If name is provided, username is considered set
    else:
        user.username_set = False # If name is not provided, it's not set

    # Ensure default values for games and wins are present if not supplied by client
    # Pydantic model now has defaults, so this explicit setting might be redundant but safe
    new_user_doc_data = user.model_dump(by_alias=True, exclude={"id"})
    new_user_doc_data.setdefault("games", 0)
    new_user_doc_data.setdefault("wins", 0)
    # username_set is handled above based on presence of 'name'

    insert_result = await user_collection.insert_one(new_user_doc_data)
    created_user = await user_collection.find_one(
        {"_id": insert_result.inserted_id}
    )
    if not created_user:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create and retrieve user.")
    return created_user


@app.get(
    "/users/",
    response_description="List all users",
    response_model=UserCollection,
    response_model_by_alias=False,
)
async def list_users():
    """
    List all of the user data in the database.

    The response is unpaginated and limited to 1000 results.
    """
    return UserCollection(users=await user_collection.find().to_list(1000))


@app.get(
    "/users/{id}",
    response_description="Get a single user",
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


@app.put(
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


@app.delete("/users/{id}", response_description="Delete a user")
async def delete_user(id: str):
    """
    Remove a single user record from the database.
    """
    delete_result = await user_collection.delete_one({"_id": ObjectId(id)})

    if delete_result.deleted_count == 1:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    raise HTTPException(status_code=404, detail=f"User {id} not found")

@app.put(
    "/game/transaction",
    response_description="Force a transaction",
    response_model=TransactionModel,
    response_model_by_alias=False,
)
async def apply_transaction(id: str, user: TransactionModel = Body(...)):
    """
    This causes a transaction between two deck objects
    """
    print("something")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)