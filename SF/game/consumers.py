import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import GameSession, GameProgress
from django.utils import timezone

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.game_group_name = f'game_{self.game_id}'

        # Join game group
        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave game group
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'move':
            # Handle player movement
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_move',
                    'player': self.scope['user'].username,
                    'position': data.get('position')
                }
            )
        elif action == 'attack':
            # Handle player attack
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_attack',
                    'player': self.scope['user'].username,
                    'target': data.get('target')
                }
            )

    async def game_move(self, event):
        # Send movement update to WebSocket
        await self.send(text_data=json.dumps({
            'action': 'move',
            'player': event['player'],
            'position': event['position']
        }))

    async def game_attack(self, event):
        # Send attack update to WebSocket
        await self.send(text_data=json.dumps({
            'action': 'attack',
            'player': event['player'],
            'target': event['target']
        }))

    @database_sync_to_async
    def update_game_progress(self, player_id, health, score):
        progress = GameProgress.objects.get(
            session_id=self.game_id,
            player_id=player_id
        )
        progress.current_health = health
        progress.score = score
        progress.save()
