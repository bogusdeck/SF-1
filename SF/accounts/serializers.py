from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from datetime import datetime
import dateutil.parser

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'name', 'dob')
        read_only_fields = ('id',)

class RegisterSerializer(serializers.ModelSerializer):
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
        try:
            # Parse the ISO format date string
            parsed_date = dateutil.parser.parse(value).date()
            return parsed_date
        except (ValueError, TypeError):
            raise serializers.ValidationError("Invalid date format. Use YYYY-MM-DD or ISO format")

    def validate(self, data):
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
        validated_data.pop('confirm_password')
        user = User.objects.create_user(**validated_data)
        return user