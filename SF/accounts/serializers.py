from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from datetime import datetime
import dateutil.parser

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the User model.
    """
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'name', 'dob', 'profile_picture',
            'spotify_access_token', 'spotify_refresh_token'
        )
        read_only_fields = ('id', 'spotify_access_token', 'spotify_refresh_token')

    def get_profile_picture(self, obj):
        """Returns the URL of the user's profile picture."""
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            return obj.profile_picture.url
        return None  # Return None if no profile picture is set

class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.
    """
    confirm_password = serializers.CharField(write_only=True, required=True)
    dob = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'confirm_password', 'name', 'dob')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'name': {'required': True}
        }

    def validate_dob(self, value):
        """Validate and parse the date of birth."""
        try:
            # Parse the ISO format date string
            parsed_date = dateutil.parser.parse(value).date()
            return parsed_date
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD or ISO format")

    def validate(self, data):
        """Validate registration data."""
        # Check if passwords match
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })

        # Validate password strength
        try:
            validate_password(data['password'])
        except exceptions.ValidationError as e:
            raise serializers.ValidationError({
                "password": list(e.messages)
            })

        # Validate email uniqueness
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                "email": "This email address is already in use."
            })

        # Validate username uniqueness
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError({
                "username": "This username is already taken."
            })

        return data

    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information.
    """
    dob = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ('name', 'dob', 'profile_picture')
        extra_kwargs = {
            'profile_picture': {'required': False}
        }

    def validate_dob(self, value):
        """Validate and parse the date of birth."""
        try:
            # Parse the ISO format date string
            parsed_date = dateutil.parser.parse(value).date()
            return parsed_date
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD or ISO format")

class SpotifyConnectSerializer(serializers.Serializer):
    """
    Serializer for connecting a Spotify account.
    """
    access_token = serializers.CharField(required=True)
    refresh_token = serializers.CharField(required=True)

    def validate(self, data):
        """Validate Spotify tokens."""
        if not data.get('access_token') or not data.get('refresh_token'):
            raise serializers.ValidationError("Both access_token and refresh_token are required.")
        return data