from typing import Dict, Optional
from uuid import UUID
from ..models.room import Room, User
from datetime import datetime, timedelta
import time

class RoomService:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.room_expiry: Dict[str, float] = {}  # Tracks last activity time for rooms
        self.EXPIRE_MINUTES = 60  # Room expires after 1 hour of inactivity

    def create_room(self, room_name: str, host_username: str) -> Room:
        host = User(username=host_username, is_host=True)
        room = Room(name=room_name, host_id=host.id)
        room.add_user(host)
        self.rooms[room.id] = room
        self.room_expiry[room.id] = time.time()
        return room

    def get_room(self, room_id: str) -> Optional[Room]:
        return self.rooms.get(room_id)

    def add_user_to_room(self, room_id: str, username: str) -> tuple[Optional[Room], Optional[User]]:
        room = self.get_room(room_id)
        if not room:
            return None, None
            
        user = User(username=username)
        room.add_user(user)
        self.room_expiry[room.id] = time.time()  # Update last activity
        return room, user

    def remove_user_from_room(self, room_id: str, user_id: str) -> bool:
        room = self.get_room(room_id)
        if not room:
            return False
            
        was_removed = room.remove_user(user_id)
        
        # If no users left, mark room for expiration
        if not room.users:
            self.room_expiry[room_id] = time.time()
        else:
            # If host left, assign new host
            if user_id == room.host_id and room.users:
                new_host_id = next(iter(room.users.keys()))
                room.host_id = new_host_id
                room.users[new_host_id].is_host = True
                
        return was_removed

    def update_room_playback(self, room_id: str, is_playing: bool, current_time: float) -> bool:
        room = self.get_room(room_id)
        if not room:
            return False
            
        room.update_playback(is_playing, current_time)
        self.room_expiry[room_id] = time.time()
        return True

    def set_room_track(self, room_id: str, track: dict) -> bool:
        room = self.get_room(room_id)
        if not room:
            return False
            
        room.set_current_track(track)
        self.room_expiry[room_id] = time.time()
        return True

    def cleanup_inactive_rooms(self):
        current_time = time.time()
        to_remove = []
        
        for room_id, last_active in self.room_expiry.items():
            if current_time - last_active > (self.EXPIRE_MINUTES * 60):
                to_remove.append(room_id)
        
        for room_id in to_remove:
            if room_id in self.rooms:
                del self.rooms[room_id]
            if room_id in self.room_expiry:
                del self.room_expiry[room_id]

# Global instance
room_service = RoomService()
