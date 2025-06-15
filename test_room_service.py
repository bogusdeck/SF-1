import unittest
from src.services.room_service import RoomService

class TestRoomService(unittest.TestCase):
    def setUp(self):
        self.room_service = RoomService()
        self.room_name = "Test Room"
        self.host_username = "test_host"
        self.room = self.room_service.create_room(self.room_name, self.host_username)
        self.host_id = self.room.host_id
    
    def test_create_room(self):
        self.assertEqual(self.room.name, self.room_name)
        self.assertEqual(len(self.room.users), 1)
        self.assertIn(self.host_id, self.room.users)
        self.assertTrue(self.room.users[self.host_id].is_host)
    
    def test_add_user_to_room(self):
        username = "test_user"
        room, user = self.room_service.add_user_to_room(self.room.id, username)
        
        self.assertIsNotNone(room)
        self.assertIsNotNone(user)
        self.assertEqual(user.username, username)
        self.assertIn(user.id, room.users)
        self.assertEqual(len(room.users), 2)  # Host + new user
    
    def test_remove_user_from_room(self):
        # Add a user first
        username = "test_user"
        room, user = self.room_service.add_user_to_room(self.room.id, username)
        user_id = user.id
        
        # Remove the user
        result = self.room_service.remove_user_from_room(self.room.id, user_id)
        self.assertTrue(result)
        self.assertNotIn(user_id, room.users)
        self.assertEqual(len(room.users), 1)  # Only host should remain
    
    def test_remove_host_reassigns_host(self):
        # Add a user first
        username = "test_user"
        room, user = self.room_service.add_user_to_room(self.room.id, username)
        
        # Remove the host
        result = self.room_service.remove_user_from_room(self.room.id, self.host_id)
        self.assertTrue(result)
        
        # The other user should now be the host
        self.assertTrue(room.users[user.id].is_host)
        self.assertEqual(room.host_id, user.id)
    
    def test_update_room_playback(self):
        is_playing = True
        current_time = 10.5
        
        self.room_service.update_room_playback(self.room.id, is_playing, current_time)
        
        self.assertEqual(self.room.is_playing, is_playing)
        self.assertEqual(self.room.last_playback_time, current_time)
    
    def test_set_room_track(self):
        track = {
            "id": "track_123",
            "title": "Test Track",
            "artist": "Test Artist",
            "url": "https://example.com/track.mp3",
            "duration": 180.5
        }
        
        self.room_service.set_room_track(self.room.id, track)
        
        self.assertEqual(self.room.current_track, track)
        self.assertEqual(self.room.is_playing, True)
        self.assertEqual(self.room.last_playback_time, 0.0)

if __name__ == "__main__":
    unittest.main()
