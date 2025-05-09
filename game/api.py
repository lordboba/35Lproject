import uvicorn
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    # Call your function or script here
    result = your_function()
    return {"result": result}



def send_api():
    print("lol")
    
