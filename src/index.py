from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
from contextlib import asynccontextmanager

from .routers import room_router
from .services.room_service import room_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize services
    print("Starting up...")
    
    # Start background task for cleaning up inactive rooms
    async def cleanup_task():
        while True:
            try:
                room_service.cleanup_inactive_rooms()
            except Exception as e:
                print(f"Error in cleanup task: {e}")
            await asyncio.sleep(300)  # Run every 5 minutes
    
    task = asyncio.create_task(cleanup_task())
    
    yield  # This is where the app runs
    
    # Shutdown
    print("Shutting down...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(room_router.router, prefix="/api/room", tags=["room"])

@app.get("/")
async def root():
    return {"message": "Music Sync API is running"}

# For development
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
