from django.shortcuts import render, get_object_or_404, redirect
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Character, Friendship, GameSession, GameProgress, Game
from django.db import models
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication


@login_required
def game_lobby(request):
    return render(request, 'game/lobby.html')

@login_required
def game_room(request, room_id):
    game = get_object_or_404(GameSession, room_id=room_id)
    return render(request, 'game/room.html', {'game': game})

# Template views for chat, friends, and profile
def chat_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'game/chat.html')

def friends_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'game/friends.html')

def profile_view(request):
    if not request.user.is_authenticated:
        return redirect('login')
    return render(request, 'game/profile.html')

class CharacterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Character.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class FriendshipViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Friendship.objects.filter(
            models.Q(sender=user) | models.Q(receiver=user)
        )
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        friendship = self.get_object()
        if friendship.receiver != request.user:
            return Response(
                {'error': 'Only the receiver can accept the request'},
                status=status.HTTP_403_FORBIDDEN
            )
        friendship.status = 'accepted'
        friendship.save()
        return Response({'status': 'accepted'})

class GameSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return GameSession.objects.filter(
            models.Q(host=self.request.user) | 
            models.Q(players=self.request.user)
        ).distinct()
    
    def perform_create(self, serializer):
        session = serializer.save(host=self.request.user)
        session.players.add(self.request.user)
        
        # Create initial game progress for host
        character = Character.objects.get(user=self.request.user)
        GameProgress.objects.create(
            session=session,
            player=self.request.user,
            character=character,
            current_health=character.health
        )
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        session = self.get_object()
        if session.status != 'waiting':
            return Response(
                {'error': 'Game has already started'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session.players.add(request.user)
        character = Character.objects.get(user=request.user)
        GameProgress.objects.create(
            session=session,
            player=request.user,
            character=character,
            current_health=character.health
        )
        return Response({'status': 'joined'})
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        session = self.get_object()
        if session.host != request.user:
            return Response(
                {'error': 'Only the host can start the game'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        session.status = 'in_progress'
        session.save()
        return Response({'status': 'started'})

@api_view(['POST'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def host_game(request):
    print(f"User: {request.user}, Authenticated: {request.user.is_authenticated}")
    print(f"Headers: {request.headers}")
    print(f"Data: {request.data}")
    
    try:
        # Create a new game session
        game = GameSession.objects.create(
            host=request.user,
            status='waiting'
        )
        # Add the host as the first player
        game.players.add(request.user)
        
        return Response({
            'success': True,
            'message': 'Game created successfully',
            'data': {
                'game_id': game.id,
                'room_id': game.room_id,
                'host': {
                    'id': game.host.id,
                    'username': game.host.username
                },
                'status': game.status,
                'player_count': game.players.count(),
                'players': [{
                    'id': player.id,
                    'username': player.username
                } for player in game.players.all()],
                'created_at': game.created_at,
                'room_url': f'/game/room/{game.room_id}/'
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({
            'success': False,
            'message': 'Failed to create game',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def available_games(request):
    games = GameSession.objects.filter(status='waiting').exclude(host=request.user)
    return Response([{
        'id': game.id,
        'room_id': game.room_id,
        'host': game.host.username,
        'players': game.players.count(),
        'created_at': game.created_at
    } for game in games])

@api_view(['POST'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def join_game(request):
    room_id = request.data.get('room_id')
    if not room_id:
        return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    game = get_object_or_404(GameSession, room_id=room_id)
    
    if game.status != 'waiting':
        return Response({'error': 'Game is no longer available'}, status=status.HTTP_400_BAD_REQUEST)
    
    if game.players.count() >= 4:
        return Response({'error': 'Game is full'}, status=status.HTTP_400_BAD_REQUEST)
    
    if request.user in game.players.all():
        return Response({'error': 'You are already in this game'}, status=status.HTTP_400_BAD_REQUEST)
    
    game.players.add(request.user)
    return Response({
        'success': True,
        'message': 'Successfully joined the game',
        'data': {
            'game_id': game.id,
            'room_id': game.room_id,
            'status': game.status,
            'player_count': game.players.count(),
            'room_url': f'/game/room/{game.room_id}/'
        }
    })
