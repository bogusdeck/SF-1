import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock
from src.websocket.manager import ConnectionManager

class TestConnectionManager(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.manager = ConnectionManager()
        self.room_id = "test_room"
        self.user_id = "test_user"
        self.websocket = AsyncMock()
    
    async def test_connect(self):
        await self.manager.connect(self.room_id, self.user_id, self.websocket)
        
        # Verify the connection was added
        self.assertIn(self.room_id, self.manager.active_connections)
        self.assertIn(self.user_id, self.manager.active_connections[self.room_id])
        self.websocket.accept.assert_awaited_once()
    
    async def test_disconnect(self):
        # First connect
        await self.manager.connect(self.room_id, self.user_id, self.websocket)
        
        # Then disconnect
        self.manager.disconnect(self.room_id, self.user_id)
        
        # Verify the connection was removed
        self.assertNotIn(self.user_id, self.manager.active_connections.get(self.room_id, {}))
        # Room should also be removed since it's empty
        self.assertNotIn(self.room_id, self.manager.active_connections)
    
    async def test_broadcast(self):
        # Set up two users in the same room
        user1_ws = AsyncMock()
        user2_ws = AsyncMock()
        
        await self.manager.connect(self.room_id, "user1", user1_ws)
        await self.manager.connect(self.room_id, "user2", user2_ws)
        
        # Test broadcast to all users
        message = {"type": "test", "data": "hello"}
        await self.manager.broadcast(self.room_id, message)
        
        # Both users should receive the message
        user1_ws.send_json.assert_awaited_once_with(message)
        user2_ws.send_json.assert_awaited_once_with(message)
    
    async def test_broadcast_exclude_user(self):
        # Set up two users in the same room
        user1_ws = AsyncMock()
        user2_ws = AsyncMock()
        
        await self.manager.connect(self.room_id, "user1", user1_ws)
        await self.manager.connect(self.room_id, "user2", user2_ws)
        
        # Test broadcast excluding user1
        message = {"type": "test", "data": "hello"}
        await self.manager.broadcast(self.room_id, message, exclude_user_id="user1")
        
        # Only user2 should receive the message
        user1_ws.send_json.assert_not_awaited()
        user2_ws.send_json.assert_awaited_once_with(message)
    
    async def test_send_personal_message(self):
        # Set up a user
        await self.manager.connect(self.room_id, self.user_id, self.websocket)
        
        # Send a personal message
        message = {"type": "private", "data": "secret"}
        await self.manager.send_personal_message(self.room_id, self.user_id, message)
        
        # The user should receive the message
        self.websocket.send_json.assert_awaited_once_with(message)
    
    async def test_send_personal_message_nonexistent_user(self):
        # Try to send a message to a non-existent user
        message = {"type": "private", "data": "secret"}
        await self.manager.send_personal_message("nonexistent_room", "nonexistent_user", message)
        
        # No error should be raised, and no message should be sent
        self.websocket.send_json.assert_not_awaited()

if __name__ == "__main__":
    unittest.main()
