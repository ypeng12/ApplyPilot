import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environmental variables from .env
load_dotenv()

# Import endpoints router
from app.api.endpoints import router as api_router

app = FastAPI(
    title="ApplyPilot AI API",
    description="Backend API powering the ApplyPilot Chrome Extension for smart job applications",
    version="1.0.0"
)

# Configure CORS Middleware
# Chrome extensions can have origin like "chrome-extension://<id>" or we can allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For extension development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check at root
@app.get("/")
def read_root():
    return {
        "name": "ApplyPilot AI Backend",
        "status": "online",
        "documentation": "/docs"
    }

# Include routers
app.include_router(api_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting ApplyPilot Backend on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=True)
