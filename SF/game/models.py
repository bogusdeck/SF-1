from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import random
import string

User = get_user_model()

def generate_room_id():
    """Generate a unique 6-digit room ID."""
    while True:
        room_id = ''.join(random.choices(string.digits, k=6))
        if not MusicRoom.objects.filter(room_id=room_id).exists():
            return room_id

class MusicRoom(models.Model):
    """
    Represents a music room where users can join and listen to music together.
    """
    STATUS_CHOICES = (
        ('waiting', 'Waiting for Users'),  # Room is waiting for users to join
        ('active', 'Active'),              # Room is active and playing music
        ('ended', 'Ended'),                # Room has ended
    )

    name = models.CharField(max_length=255, unique=True)  # Unique name for the room
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_music_rooms')  # Room creator
    spotify_playlist_id = models.CharField(max_length=255)  # Spotify playlist ID
    room_id = models.CharField(max_length=6, unique=True, default=generate_room_id)  # Unique room ID
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')  # Room status
    listeners = models.ManyToManyField(User, related_name='joined_rooms', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the room was created
    ended_at = models.DateTimeField(null=True, blank=True)  # Timestamp when the room ended

    def __str__(self):
        return f"MusicRoom: {self.name} (Host: {self.host.username})"

    @property
    def player_count(self):
        """Returns the number of users in the room."""
        return self.users_in_room.count()

    def add_user(self, user):
        """Adds a user to the room."""
        if not UserInRoom.objects.filter(user=user, room=self).exists():
            UserInRoom.objects.create(user=user, room=self)

    def remove_user(self, user):
        """Removes a user from the room."""
        UserInRoom.objects.filter(user=user, room=self).delete()
        if self.player_count == 0:
            self.status = 'ended'
            self.ended_at = timezone.now()
            self.save()

    def start_room(self):
        """Starts the room and changes its status to active."""
        if self.host:
            self.status = 'active'
            self.save()

    def end_room(self):
        """Ends the room and changes its status to ended."""
        self.status = 'ended'
        self.ended_at = timezone.now()
        self.save()


class UserInRoom(models.Model):
    """
    Represents a user in a music room.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='music_rooms_joined')  # User in the room
    room = models.ForeignKey(MusicRoom, on_delete=models.CASCADE, related_name='users_in_room')  # Room the user is in
    joined_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the user joined the room

    def __str__(self):
        return f"{self.user.username} in {self.room.name}"

    class Meta:
        unique_together = ('user', 'room')  # Ensure a user can only join a room once


class Friendship(models.Model):
    """
    Represents a friendship between two users.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),  # Friendship request is pending
        ('accepted', 'Accepted'),  # Friendship request is accepted
        ('rejected', 'Rejected')  # Friendship request is rejected
    )

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friendships')  # User who sent the request
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friendships')  # User who received the request
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')  # Friendship status
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the friendship was created

    def __str__(self):
        return f"Friendship: {self.sender.username} -> {self.receiver.username} ({self.status})"

    class Meta:
        unique_together = ('sender', 'receiver')  # Ensure unique friendships   