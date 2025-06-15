from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import json
import asyncio

from ..models.room import Room, User
from ..websocket.manager import manager
from ..services.room_service import room_service

router = APIRouter()

@router.post("/create")
async def create_room(room_name: str, username: str):
    """Create a new room and return the room ID and host user ID"""
    room = room_service.create_room(room_name, username)
    return {
        "room_id": room.id,
        "host_id": room.host_id,
        "room_name": room.name
    }

@router.get("/{room_id}/exists")
async def check_room_exists(room_id: str):
    """Check if a room exists"""
    room = room_service.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"exists": True, "room_name": room.name}

@router.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, user_id: str):
    room = room_service.get_room(room_id)
    if not room:
        await websocket.close(code=4000)
        return
    
    # Get user from room or create new one if joining
    user = room.users.get(user_id)
    if not user:
        # In a real app, you'd want to handle this differently
        await websocket.close(code=4001, reason="User not found in room")
        return
    
    # Connect to the WebSocket
    await manager.connect(room_id, user_id, websocket)
    
    try:
        # Notify others that user joined
        await manager.broadcast(
            room_id,
            {
                "type": "user_joined",
                "user_id": user_id,
                "username": user.username,
                "is_host": user.is_host,
                "timestamp": str(datetime.utcnow())
            },
            exclude_user_id=user_id
        )
        
        # Send current room state to the new user
        await manager.send_personal_message(
            room_id,
            user_id,
            {
                "type": "room_state",
                "room": {
                    "id": room.id,
                    "name": room.name,
                    "host_id": room.host_id,
                    "current_track": room.current_track,
                    "is_playing": room.is_playing,
                    "last_playback_time": room.last_playback_time
                },
                "users": [
                    {"id": u.id, "username": u.username, "is_host": u.is_host}
                    for u in room.users.values()
                ]
            }
        )
        
        # Keep connection alive and process messages
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_websocket_message(room_id, user_id, message)
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        # Handle disconnect
        manager.disconnect(room_id, user_id)
        room_service.remove_user_from_room(room_id, user_id)
        
        # Notify others that user left
        await manager.broadcast(
            room_id,
            {
                "type": "user_left",
                "user_id": user_id,
                "username": user.username,
                "timestamp": str(datetime.utcnow())
            }
        )
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(room_id, user_id)
        room_service.remove_user_from_room(room_id, user_id)

async def handle_websocket_message(room_id: str, user_id: str, message: dict):
    message_type = message.get("type")
    
    if message_type == "playback_update":
        # Only host can update playback
        room = room_service.get_room(room_id)
        if room and room.host_id == user_id:
            is_playing = message.get("is_playing", False)
            current_time = message.get("current_time", 0)
            room_service.update_room_playback(room_id, is_playing, current_time)
            
            # Broadcast to all other users
            await manager.broadcast(
                room_id,
                {
                    "type": "playback_update",
                    "is_playing": is_playing,
                    "current_time": current_time,
                    "timestamp": str(datetime.utcnow())
                },
                exclude_user_id=user_id
            )
    
    elif message_type == "track_change":
        # Only host can change track
        room = room_service.get_room(room_id)
        if room and room.host_id == user_id:
            track = message.get("track")
            if track:
                room_service.set_room_track(room_id, track)
                
                # Broadcast to all other users
                await manager.broadcast(
                    room_id,
                    {
                        "type": "track_change",
                        "track": track,
                        "timestamp": str(datetime.utcnow())
                    },
                    exclude_user_id=user_id
                )
    
    elif message_type == "chat_message":
        # Broadcast chat message to all users
        text = message.get("text", "")
        if text.strip():
            room = room_service.get_room(room_id)
            user = room.users.get(user_id) if room else None
            if user:
                await manager.broadcast(
                    room_id,
                    {
                        "type": "chat_message",
                        "user_id": user_id,
                        "username": user.username,
                        "text": text,
                        "timestamp": str(datetime.utcnow())
                    }
                )
