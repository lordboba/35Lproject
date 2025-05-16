from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from users_api import router as users_router

app = FastAPI(title="Card Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)

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
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)