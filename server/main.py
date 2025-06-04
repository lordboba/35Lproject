from fastapi import FastAPI, Body, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from users_api import router as users_router
from games_api import router as games_router
from game_manager import GameTracker
from game import TransactionModel
from fastapi import Body
import uvicorn
import os


app = FastAPI(title="Card Game API")

# CORS configuration - more permissive for CloudFront
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins temporarily to debug
    allow_credentials=False,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Enhanced middleware to handle CloudFront headers and ensure CORS
@app.middleware("http")
async def handle_cloudfront_and_cors(request: Request, call_next):
    # Get the origin from the request
    origin = request.headers.get("origin", "*")
    
    # Handle preflight OPTIONS requests explicitly
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        response.headers["Access-Control-Allow-Credentials"] = "false"
        response.headers["Vary"] = "Origin"
        return response
    
    # CloudFront forwarding headers
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    
    if forwarded_proto:
        request.scope["scheme"] = forwarded_proto
    
    if forwarded_host:
        request.scope["server"] = (forwarded_host, request.scope.get("server", ("localhost", 80))[1])
    
    # Process the request
    response = await call_next(request)
    
    # Always add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    response.headers["Access-Control-Expose-Headers"] = "*"
    response.headers["Vary"] = "Origin"
    
    # Additional headers for CloudFront compatibility
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    # Additional headers for security when using HTTPS
    if forwarded_proto == "https" or request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
    
    return response

app.include_router(users_router)
app.include_router(games_router)

@app.get("/")
async def root():
    """Root endpoint for basic health check"""
    return {"message": "35L Backend API is running", "status": "ok"}

@app.get("/test-cors")
async def test_cors():
    """Test endpoint to verify CORS headers are working"""
    return {"message": "CORS test successful", "timestamp": "2024-01-01T00:00:00Z"}

@app.get("/health")
async def health_check():
    """Health check endpoint for CloudFront"""
    return {"status": "healthy", "service": "35L Backend API", "websocket_support": "enabled"}

@app.options("/{path:path}")
async def options_handler(request: Request):
    """Handle all OPTIONS requests for CORS preflight"""
    origin = request.headers.get("origin", "*")
    
    response = Response(status_code=200)
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    response.headers["Vary"] = "Origin"
    
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
