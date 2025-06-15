import asyncio
import websockets
import json
import uuid
from datetime import datetime

async def test_room():
    # Create a test room
    room_id = str(uuid.uuid4())
    user_id = f"test_user_{int(datetime.now().timestamp())}"
    
    uri = f"ws://localhost:8000/api/room/ws/{room_id}/{user_id}"
    
    async with websockets.connect(uri) as websocket:
        print(f"Connected to room {room_id} as {user_id}")
        
        # Send a chat message
        chat_message = {
            "type": "chat_message",
            "text": "Hello from test user!"
        }
        await websocket.send(json.dumps(chat_message))
        print(f"Sent chat message: {chat_message}")
        
        # Simulate playback update (only works if this is the host)
        playback_update = {
            "type": "playback_update",
            "is_playing": True,
            "current_time": 10.5
        }
        await websocket.send(json.dumps(playback_update))
        print(f"Sent playback update: {playback_update}")
        
        # Listen for messages
        try:
            while True:
                message = await websocket.recv()
                print(f"Received: {message}")
                
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed")

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_room())
