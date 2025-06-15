from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    username: str
    is_host: bool = False
    
class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    host_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    users: Dict[str, User] = {}
    current_track: Optional[dict] = None
    is_playing: bool = False
    last_playback_time: float = 0.0
    
    def add_user(self, user: User):
        self.users[user.id] = user
        
    def remove_user(self, user_id: str):
        if user_id in self.users:
            del self.users[user_id]
            return True
        return False
    
    def set_current_track(self, track: dict):
        self.current_track = track
        self.is_playing = True
        self.last_playback_time = 0.0
    
    def update_playback(self, is_playing: bool, time: float):
        self.is_playing = is_playing
        self.last_playback_time = time
