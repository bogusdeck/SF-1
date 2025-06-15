import asyncio
import websockets
import json
import uuid

async def test_websocket():
    # Connect to the WebSocket server
    uri = "ws://localhost:8000/api/room/ws/test_room/test_user"
    
    async with websockets.connect(uri) as websocket:
        print("Connected to WebSocket server")
        
        # Send a test message
        test_message = {
            "type": "chat_message",
            "text": "Hello from test client!"
        }
        await websocket.send(json.dumps(test_message))
        print(f"Sent: {test_message}")
        
        # Listen for messages
        try:
            while True:
                message = await websocket.recv()
                print(f"Received: {message}")
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed")

# Run the test
if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_websocket())
