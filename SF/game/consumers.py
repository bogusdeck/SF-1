import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import GameSession, GameProgress
from django.utils import timezone

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.game_group_name = f'game_{self.game_id}'
        self.player = self.scope['user']

        await self.add_player_to_session(self.game_id, self.player.id)
        # Join game group
        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.remove_player_from_session(self.game_id, self.player_id)

        await self.channel_layer.group_send(
            self.game_group_namem,
            {
                'type' : 'player_left'
                'player' : self.player.username
            }
        )

        # Leave game group
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def player_disconnected(self, event):
        username = event['username']
        await = self.send(text_data=json.dumps({
            'event':'player_disconnected',
            'username':username
        }))

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'move':
            # Handle player movement
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_move',
                    'player': self.player.username,
                    'position': data.get('position')
                }
            )
        elif action == 'attack':
            # Handle player attack
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_attack',
                    'player': self.player.username,
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

    async def player_left(self, event):
        await self.send(text_data=json.dumps({
            'action':'player_left',
            'player':event['player']
       }))

    @database_sync_to_async
    def add_player_to_session(self, game_id, player_id):
        session = GameSession.objects.get(id=game_id)
        session.players.add(player_id)
        session.save()
    
    @database_sync_to_async
    def remove_player_from_session(self, game_id, player_id):
        session = GameSession.objects.get(id=game_id)
        session.players.remove(player_id)
        session.save()

    @database_sync_to_async
    def update_game_progress(self, player_id, health, score):
        progress = GameProgress.objects.get(
            session_id=self.game_id,
            player_id=player_id
        )
        progress.current_health = health
        progress.score = score
        progress.save()
