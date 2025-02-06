from django.shortcuts import render, redirect
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny, IsAuthenticated
from datetime import datetime
import requests
from django.conf import settings

User = get_user_model()

# Function-based views for rendering templates
def home_view(request):
    return render(request, 'home.html')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('music_lobby')  # Redirect to music lobby instead of game lobby
    return render(request, 'login.html')

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('music_lobby')  # Redirect to music lobby instead of game lobby
    return render(request, 'signup.html')

def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
    return redirect('home')

# API views for user authentication
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data.copy()

        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            if user:
                return Response({
                    "message": "Registration successful",
                    "user": UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({
                "error": "Please provide both email and password"
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(request, email=email, password=password)

        if user is not None:
            login(request, user)
            return Response({
                "message": "Login successful",
                "user": UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({
            "error": "Invalid email or password"
        }, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    def post(self, request):
        if request.user.is_authenticated:
            logout(request)
            return Response({
                "message": "Logout successful"
            }, status=status.HTTP_200_OK)
        return Response({
            "error": "You are not logged in"
        }, status=status.HTTP_400_BAD_REQUEST)

# Profile and Spotify Integration Views
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve the authenticated user's profile."""
        user = request.user
        return Response({
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

    def put(self, request):
        """Update the authenticated user's profile."""
        user = request.user
        data = request.data

        # Update profile fields
        user.name = data.get('name', user.name)
        user.dob = data.get('dob', user.dob)
        if 'profile_picture' in request.FILES:
            user.profile_picture = request.FILES['profile_picture']
        user.save()

        return Response({
            "message": "Profile updated successfully",
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)

class SpotifyConnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Connect the user's Spotify account."""
        user = request.user
        access_token = request.data.get('access_token')
        refresh_token = request.data.get('refresh_token')

        if not access_token or not refresh_token:
            return Response({
                "error": "Both access_token and refresh_token are required"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save Spotify tokens to the user's profile
        user.spotify_access_token = access_token
        user.spotify_refresh_token = refresh_token
        user.save()

        return Response({
            "message": "Spotify account connected successfully"
        }, status=status.HTTP_200_OK)

class SpotifyDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Disconnect the user's Spotify account."""
        user = request.user

        # Clear Spotify tokens
        user.spotify_access_token = None
        user.spotify_refresh_token = None
        user.save()

        return Response({
            "message": "Spotify account disconnected successfully"
        }, status=status.HTTP_200_OK)