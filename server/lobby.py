# lobby.py
# Have users join the lobby
# POST /join/lobby
# GET /getlobbies
# POST /create/lobby
# POST /leave/lobby

# Each lobby has: list of users, game(either fish or vietcong(vc))
from fastapi import APIRouter
import motor, os

router = APIRouter()
client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGODB_URL"])
db = client.game
lobby_collection = db.get_collection("active-games")
@router.get("/getlobbies")
async def get_lobbies():
    return {"message": "List of lobbies"}
    
@router.post("/create/lobby")
async def create_lobby():
    return {"message": "Lobby created"}

@router.post("/join/lobby")
async def join_lobby():
    return {"message": "Joined lobby"}
    
@router.post("/leave/lobby")
async def leave_lobby():
    return {"message": "Left lobby"}
