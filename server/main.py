from fastapi import FastAPI, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from users_api import router as users_router
from games_api import router as games_router
from game_manager import GameTracker
from game import TransactionModel
from fastapi import Body
import uvicorn
import os


app = FastAPI(title="Card Game API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "https://35-lproject.vercel.app",
        "https://*.elasticbeanstalk.com",  # Allow HTTPS from Elastic Beanstalk domains
        "http://*.elasticbeanstalk.com",   # Keep HTTP for backward compatibility during transition
        "https://*.cloudfront.net",       # Allow CloudFront domains
        "https://d11u6fgyzepl0v.cloudfront.net",  # Specific CloudFront domain
        "https://*.amazonaws.com",        # Allow other AWS domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware to handle X-Forwarded-Proto header from CloudFront
@app.middleware("http")
async def handle_forwarded_proto(request: Request, call_next):
    # CloudFront sends X-Forwarded-Proto header
    forwarded_proto = request.headers.get("x-forwarded-proto")
    if forwarded_proto:
        # Update the request scheme based on CloudFront header
        request.scope["scheme"] = forwarded_proto
    
    response = await call_next(request)
    
    # Add security headers for HTTPS
    if forwarded_proto == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

app.include_router(users_router)
app.include_router(games_router)

@app.get("/health")
async def health_check():
    """Health check endpoint for CloudFront"""
    return {"status": "healthy", "service": "35L Backend API"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
