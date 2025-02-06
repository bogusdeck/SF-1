import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import MusicRoom, UserInRoom
from django.utils import timezone

class MusicRoomConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for managing music room interactions.
    """
    async def connect(self):
        """
        Handles WebSocket connection.
        """
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'music_room_{self.room_id}'
        self.user = self.scope['user']

        # Add user to the music room
        await self.add_user_to_room(self.room_id, self.user.id)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        """
        Handles WebSocket disconnection.
        """
        # Remove user from the music room
        await self.remove_user_from_room(self.room_id, self.user.id)

        # Notify other users in the room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_left',
                'user': self.user.username
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Handles incoming WebSocket messages.
        """
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'play':
            # Handle play action
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'music_play',
                    'user': self.user.username,
                    'track_id': data.get('track_id')
                }
            )
        elif action == 'pause':
            # Handle pause action
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'music_pause',
                    'user': self.user.username
                }
            )
        elif action == 'skip':
            # Handle skip action
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'music_skip',
                    'user': self.user.username
                }
            )

    async def music_play(self, event):
        """
        Sends play action to all users in the room.
        """
        await self.send(text_data=json.dumps({
            'action': 'play',
            'user': event['user'],
            'track_id': event['track_id']
        }))

    async def music_pause(self, event):
        """
        Sends pause action to all users in the room.
        """
        await self.send(text_data=json.dumps({
            'action': 'pause',
            'user': event['user']
        }))

    async def music_skip(self, event):
        """
        Sends skip action to all users in the room.
        """
        await self.send(text_data=json.dumps({
            'action': 'skip',
            'user': event['user']
        }))

    async def user_left(self, event):
        """
        Notifies users when a user leaves the room.
        """
        await self.send(text_data=json.dumps({
            'action': 'user_left',
            'user': event['user']
        }))

    @database_sync_to_async
    def add_user_to_room(self, room_id, user_id):
        """
        Adds a user to the music room.
        """
        room = MusicRoom.objects.get(id=room_id)
        UserInRoom.objects.create(user_id=user_id, room=room)

    @database_sync_to_async
    def remove_user_from_room(self, room_id, user_id):
        """
        Removes a user from the music room.
        """
        room = MusicRoom.objects.get(id=room_id)
        UserInRoom.objects.filter(user_id=user_id, room=room).delete()

        # If no users are left in the room, end the room
        if room.users_in_room.count() == 0:
            room.status = 'ended'
            room.ended_at = timezone.now()
            room.save()