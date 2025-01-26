from django.shortcuts import render, redirect
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login
from .serializers import RegisterSerializer, UserSerializer
from django.contrib.auth import get_user_model
from rest_framework.permissions import AllowAny
from datetime import datetime
from django.contrib.auth import logout

User = get_user_model()

# Function-based views for rendering templates
def home_view(request):
    return render(request, 'home.html')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('game_lobby')
    return render(request, 'login.html')

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('game_lobby')
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