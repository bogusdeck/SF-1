from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    """
    name = models.CharField(max_length=255, verbose_name='Full Name')  # User's full name
    email = models.EmailField(_('email address'), unique=True)  # Unique email address
    dob = models.DateField(verbose_name='Date of Birth')  # User's date of birth
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True,
        verbose_name='Profile Picture'
    )  # User's profile picture
    spotify_access_token = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Spotify Access Token'
    )  # Spotify access token for API integration
    spotify_refresh_token = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Spotify Refresh Token'
    )  # Spotify refresh token for API integration

    USERNAME_FIELD = 'email'  # Use email as the unique identifier for authentication
    REQUIRED_FIELDS = ['username', 'name', 'dob']  # Additional required fields

    def __str__(self):
        return self.email  # String representation of the user

    @property
    def profile_picture_url(self):
        """Returns the URL of the user's profile picture."""
        if self.profile_picture and hasattr(self.profile_picture, 'url'):
            return self.profile_picture.url
        return settings.DEFAULT_PROFILE_PICTURE_URL  # Default profile picture URL

    def get_full_name(self):
        """Returns the user's full name."""
        return self.name

    def get_short_name(self):
        """Returns the user's short name (first name)."""
        return self.name.split()[0] if self.name else self.username