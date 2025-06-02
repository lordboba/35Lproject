from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from users_api import router as users_router
from games_api import router as games_router
from game_manager import GameTracker
from game import TransactionModel
from fastapi import Body
import uvicorn


app = FastAPI(title="Card Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "https://35-lproject.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(games_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
