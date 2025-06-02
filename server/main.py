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

# Updated CORS configuration for CloudFront
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173", 
        "https://35-lproject.vercel.app",
        "https://*.elasticbeanstalk.com",
        "http://*.elasticbeanstalk.com",
        "https://*.cloudfront.net",
        "https://d11u6fgyzepl0v.cloudfront.net",
        "https://*.amazonaws.com",
        "*"  # Temporarily allow all origins for debugging
    ],
    allow_credentials=False,  # Changed to False for broader compatibility
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language", 
        "Content-Type",
        "X-Requested-With",
        "X-Forwarded-Host",
        "Origin",
        "Referer",
        "User-Agent",
        "Sec-WebSocket-Key",
        "Sec-WebSocket-Version", 
        "Sec-WebSocket-Protocol",
        "Sec-WebSocket-Extensions"
    ],
)

# Add middleware to handle CloudFront headers and CORS
@app.middleware("http")
async def handle_cloudfront_and_cors(request: Request, call_next):
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        from fastapi.responses import Response
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, X-Forwarded-Host, Origin, Referer, User-Agent"
        response.headers["Access-Control-Max-Age"] = "86400"
        response.status_code = 200
        return response
    
    # CloudFront sends X-Forwarded-Proto header
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    
    if forwarded_proto:
        request.scope["scheme"] = forwarded_proto
    
    if forwarded_host:
        request.scope["server"] = (forwarded_host, request.scope.get("server", ("localhost", 80))[1])
    
    response = await call_next(request)
    
    # Add CORS headers to all responses
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, X-Forwarded-Host, Origin, Referer, User-Agent"
    response.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Range"
    
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
    return {"status": "healthy", "service": "35L Backend API", "websocket_support": "enabled"}

@app.options("/{path:path}")
async def options_handler(request: Request):
    """Handle all OPTIONS requests for CORS preflight"""
    from fastapi.responses import Response
    response = Response()
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, X-Forwarded-Proto, X-Forwarded-Host, Origin, Referer, User-Agent"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
