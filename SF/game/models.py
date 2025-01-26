from django.db import models
from django.contrib.auth import get_user_model
import random
import string

User = get_user_model()

def generate_room_id():
    while True:
        # Generate a 6-digit number
        room_id = ''.join(random.choices(string.digits, k=6))
        # Check if this room_id already exists
        if not GameSession.objects.filter(room_id=room_id).exists():
            return room_id

class Character(models.Model):
    TYPES = (
        ('warrior', 'Warrior'),
        ('archer', 'Archer'),
        ('mage', 'Mage'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    character_type = models.CharField(max_length=20, choices=TYPES)
    level = models.IntegerField(default=1)
    health = models.IntegerField(default=100)
    experience = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Friendship(models.Model):
    STATUS = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    )
    
    sender = models.ForeignKey(User, related_name='friendship_requests_sent', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='friendship_requests_received', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender', 'receiver')

class Game(models.Model):
    GAME_STATUS = (
        ('waiting', 'Waiting for Players'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    )

    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_games')
    players = models.ManyToManyField(User, related_name='joined_games')
    status = models.CharField(max_length=20, choices=GAME_STATUS, default='waiting')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Game hosted by {self.host.username} ({self.status})"

    @property
    def player_count(self):
        return self.players.count()

    def join(self, user):
        if self.status == 'waiting' and self.player_count < 4:
            self.players.add(user)
            if self.player_count >= 2:  # Game can start with 2 players
                self.status = 'in_progress'
                self.save()
            return True
        return False

class GameSession(models.Model):
    STATUS = (
        ('waiting', 'Waiting for Players'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    
    host = models.ForeignKey(User, related_name='hosted_sessions', on_delete=models.CASCADE)
    players = models.ManyToManyField(User, related_name='joined_sessions')
    status = models.CharField(max_length=20, choices=STATUS, default='waiting')
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    room_id = models.CharField(max_length=6, unique=True, default=generate_room_id)

class GameProgress(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE)
    player = models.ForeignKey(User, on_delete=models.CASCADE)
    character = models.ForeignKey(Character, on_delete=models.CASCADE)
    current_health = models.IntegerField()
    score = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
