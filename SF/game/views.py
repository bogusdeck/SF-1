from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class MusicRoom(models.Model):
    """
    Represents a music room where users can join and listen to music together.
    """
    name = models.CharField(max_length=255, unique=True)  # Unique name for the room
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_music_rooms')  # Room creator
    spotify_playlist_id = models.CharField(max_length=255)  # Spotify playlist ID
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the room was created
    status = models.CharField(
        max_length=20,
        choices=[
            ('waiting', 'Waiting'),  # Room is waiting for users to join
            ('active', 'Active'),    # Room is active and playing music
            ('ended', 'Ended')       # Room has ended
        ],
        default='waiting'
    )

    def __str__(self):
        return f"MusicRoom: {self.name} (Host: {self.host.username})"

    @property
    def player_count(self):
        """Returns the number of users in the room."""
        return self.users_in_room.count()

    def add_user(self, user):
        """Adds a user to the room."""
        UserInRoom.objects.create(user=user, room=self)

    def remove_user(self, user):
        """Removes a user from the room."""
        UserInRoom.objects.filter(user=user, room=self).delete()
        if self.player_count == 0:
            self.status = 'ended'
            self.save()

    def start_room(self):
        """Starts the room and changes its status to active."""
        if self.host:
            self.status = 'active'
            self.save()

    def end_room(self):
        """Ends the room and changes its status to ended."""
        self.status = 'ended'
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
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friendships')  # User who sent the request
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friendships')  # User who received the request
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),  # Friendship request is pending
            ('accepted', 'Accepted'),  # Friendship request is accepted
            ('rejected', 'Rejected')  # Friendship request is rejected
        ],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp when the friendship was created

    def __str__(self):
        return f"Friendship: {self.sender.username} -> {self.receiver.username} ({self.status})"

    class Meta:
        unique_together = ('sender', 'receiver')  # Ensure unique friendships