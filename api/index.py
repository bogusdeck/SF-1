from fastapi import APIRouter

# Create API router
router = APIRouter()

# Include room router
from src.routers import room_router
router.include_router(room_router.router, prefix="/room")