from fastapi import Body, HTTPException, status
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from typing_extensions import Annotated
from pydantic.functional_validators import BeforeValidator
from dotenv import load_dotenv
import motor.motor_asyncio
import certifi
import os

load_dotenv()

PyObjectId = Annotated[str, BeforeValidator(str)]

client = motor.motor_asyncio.AsyncIOMotorClient(
    os.environ["MONGODB_URL"],
    tls=True,
    tlsCAFile=certifi.where()
)
db = client.game
user_collection = db.get_collection("users")
cards_collection = db.get_collection("cards")


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
