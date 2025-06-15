import pytest
import time
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocketDisconnect

from src.routers.room_router import router as room_router
from src.services.room_service import room_service, RoomService

# Test the room service directly without HTTP
def test_room_service():
    # Test room creation
    room = room_service.create_room("Test Room", "test_user")
    assert room is not None
    assert room.name == "Test Room"
    assert room.host_id in room.users
    assert room.users[room.host_id].username == "test_user"
    assert room.users[room.host_id].is_host is True
    
    # Test adding a user to the room
    room, user = room_service.add_user_to_room(room.id, "test_user_2")
    assert user is not None
    assert user.id in room.users
    assert user.username == "test_user_2"
    assert user.is_host is False
    
    # Test removing a user from the room
    result = room_service.remove_user_from_room(room.id, user.id)
    assert result is True
    assert user.id not in room.users
    
    # Test room cleanup
    room_id = room.id
    del room_service.rooms[room_id]
    if room_id in room_service.room_expiry:
        del room_service.room_expiry[room_id]

# Test WebSocket manager
def test_websocket_manager():
    from src.websocket.manager import ConnectionManager
    
    manager = ConnectionManager()
    room_id = "test_room"
    user_id = "test_user"
    
    # Mock WebSocket connection
    class MockWebSocket:
        async def accept(self):
            pass
        
        async def send_json(self, data):
            pass
    
    websocket = MockWebSocket()
    
    # Test connection
    import asyncio
    asyncio.run(manager.connect(room_id, user_id, websocket))
    
    # Test disconnection
    manager.disconnect(room_id, user_id)
    assert user_id not in manager.active_connections.get(room_id, {})
