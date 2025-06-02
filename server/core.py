from fastapi import Query
from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Union
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
game_collection = db.get_collection("games")
replay_collection = db.get_collection("replays")

# Game Object Models

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
    type: int = Field(...)

# Game Stat Models

class VietCongStatsModel(BaseModel):
    """
    Container for Viet Cong game stats.
    """
    games: int = Field(default=0)
    place_finishes: Dict[str, int] = Field(default_factory=lambda: {"first": 0, "second": 0, "third": 0, "fourth": 0})

class FishStatsModel(BaseModel):
    """
    Container for Fish game stats.
    """
    games: int = Field(default=0)
    wins: int = Field(default=0)
    claims: int = Field(default=0)
    successful_claims: int = Field(default=0)

# Users

class VietCongStatsModel(BaseModel):
    """
    Container for Viet Cong game stats.
    """
    games: int = Field(default=0)
    place_finishes: Dict[int, int] = Field(default_factory=lambda: {1: 0, 2: 0, 3: 0, 4: 0})

class FishStatsModel(BaseModel):
    """
    Container for Fish game stats.
    """
    games: int = Field(default=0)
    wins: int = Field(default=0)
    losses: int = Field(default=0)
    claims: int = Field(default=0)
    successful_claims: int = Field(default=0)

# Users

class UserModel(BaseModel):
    """
    Container for a single user record.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    firebase_uid: str = Field(...)
    name: Optional[str] = Field(default=None)
    stats: Dict[str, Union[VietCongStatsModel, FishStatsModel]] = Field(default_factory=lambda: {
        "vietcong": VietCongStatsModel(),
        "fish": FishStatsModel()
    })
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
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class UserSearchModel(BaseModel):
    """
    A container holding filters for user search in DB
    """
    name: Optional[str] = Query(None, description="Filter by username (partial match)")
    min_fish_games: Optional[int] = Query(None)
    min_vietcong_games: Optional[int] = Query(None)
    min_fish_win_rate: Optional[float] = Query(None)
    min_vietcong_score_rate: Optional[float] = Query(None)
    min_claims: Optional[int] = Query(None)
    min_claim_rate: Optional[float] = Query(None)

class UserCollectionModel(BaseModel):
    """
    A container holding a list of `UserModel` instances.

    This exists because providing a top-level array in a JSON response can be a [vulnerability](https://haacked.com/archive/2009/06/25/json-hijacking.aspx/)
    """

    users: List[UserModel]

# Firebase Models

class FirebaseUserRegistrationRequest(BaseModel):
    firebase_uid: str = Field(...)

class CheckUsernameResponse(BaseModel):
    is_available: bool

class CompleteRegistrationRequest(BaseModel):
    firebase_uid: str = Field(...)
    username: str = Field(..., min_length=3, max_length=20, pattern="^[a-zA-Z0-9_]+$")

# Game Models

class GameModel(BaseModel):
    """
    Container for a single game.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str = Field(...)
    type: str = Field(...)
    players: List[PyObjectId] = Field(default_factory=list)
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class GameCreateModel(BaseModel):
    name: str
    type: str
    
class GameCollection(BaseModel):
    games: List[GameModel]

# Game State Models

class OwnerModel(BaseModel):
    cards: List[CardModel]
    is_player: bool

class GameStateModel(BaseModel):
    game_type: str
    owners: Dict[str,OwnerModel]
    current_player: Optional[str] 
    last_turn: Optional[TurnModel]
    player_status: Dict[str, int]
    status: int

# Replays

class ReplayModel(BaseModel):
    """
    Container for a single replay.
    """
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    type: str = Field(...)
    name: str = Field(...)
    players: Dict[PyObjectId,int] = Field(default_factory=dict)
    game_states: List[GameStateModel] = Field(default_factory=list)
    timestamp: int = Field(...)
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class ReplaySummaryModel(BaseModel):
    """
    A summary of a replay, used for listing replays.
    """
    id: PyObjectId = Field(alias="_id")
    type: str = Field(...)
    name: str = Field(...)
    players: Dict[str, int]  # Maps player names to their scores
    timestamp: int

class ReplaySearchModel(BaseModel):
    """
    Container for all filters for replays
    """
    player_id: Optional[str] = Query(None)
    result_codes: Optional[List[int]] = Query(None)
    start_time: Optional[int] = Query(None)
    end_time: Optional[int] = Query(None)
    type: Optional[str] = Query(None)
    name: Optional[str] = Query(None)
    
class ReplayCollectionModel(BaseModel):
    """
    A container holding a list of `ReplaySummaryModel` instances
    """
    replays: List[ReplaySummaryModel]
