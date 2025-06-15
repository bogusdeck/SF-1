from typing import Dict, List, Optional
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Structure: {room_id: {user_id: websocket}}

    async def connect(self, room_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = {}
        self.active_connections[room_id][user_id] = websocket

    def disconnect(self, room_id: str, user_id: str):
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            del self.active_connections[room_id][user_id]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast(self, room_id: str, message: dict, exclude_user_id: str = None):
        if room_id not in self.active_connections:
            return
            
        for user_id, connection in self.active_connections[room_id].items():
            if user_id == exclude_user_id:
                continue
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to {user_id}: {e}")
                self.disconnect(room_id, user_id)

    async def send_personal_message(self, room_id: str, user_id: str, message: dict):
        if room_id in self.active_connections and user_id in self.active_connections[room_id]:
            try:
                await self.active_connections[room_id][user_id].send_json(message)
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")
                self.disconnect(room_id, user_id)

# Global instance
manager = ConnectionManager()
