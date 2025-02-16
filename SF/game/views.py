from django.shortcuts import render, get_object_or_404, redirect
from django.utils.crypto import get_random_string
from django.db.utils import IntegrityError
from django.urls import reverse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from .models import MusicRoom

@login_required
def music_lobby(request):
    return render(request, 'music/lobby.html')

@login_required
def music_room(request, room_id):
    room = get_object_or_404(MusicRoom, room_id=room_id)
    context = {
        'room': room,
        'csrf_token': get_token(request),
    }
    return render(request, 'music/room.html', context)

class MusicRoomViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = MusicRoom.objects.all()

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        room = self.get_object()
        if request.user in room.listeners.all():
            return Response({'message': 'Already in the room'}, status=status.HTTP_400_BAD_REQUEST)
        room.listeners.add(request.user)
        return Response({'message': 'Joined the room successfully'})

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        room = self.get_object()
        if request.user not in room.listeners.all():
            return Response({'message': 'Not in the room'}, status=status.HTTP_400_BAD_REQUEST)
        room.listeners.remove(request.user)
        return Response({'message': 'Left the room successfully'})

@api_view(['POST'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def create_music_room(request):
    try:
        unique_name = f"Room-{get_random_string(8)}"

        room = MusicRoom.objects.create(
            name=unique_name,
            host=request.user,
            status='waiting'
        )
        room.listeners.add(request.user)
        room_url = request.build_absolute_uri(reverse('music_room', kwargs={'room_id': room.room_id}))
        return Response({
            'success': True,
            'message': 'Music room created successfully',
            'data': {
                'room_id': room.room_id,
                'room_name':room.name,
                'host': request.user.username,
                'listeners': [listener.username for listener in room.listeners.all()],
                'room_url': room_url
            }
        }, status=status.HTTP_201_CREATED)

    except IntegrityError:
        return Response({'error':'Room name already Exists. Try again'}, status=status.HTTP_400_BAD_REQUEST) 
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def join_music_room(request):
    try:
        room_id = request.data.get('room_id')
        room = get_object_or_404(MusicRoom, room_id=room_id)
        # if request.user in room.listeners.all():
        #     return Response({'message': 'Already in the room'}, status=status.HTTP_400_BAD_REQUEST)
        room.listeners.add(request.user)
        room_url = request.build_absolute_uri(reverse('music_room', kwargs={'room_id': room.room_id}))
        return Response({
                'success': True,
                'message': 'Joined the room successfully',
                'data': {
                    'room_id': room.room_id,
                    'host': room.host.username,
                    'listeners': [listener.username for listener in room.listeners.all()],
                    'room_url': room_url  
                }
            }, status=status.HTTP_200_OK)

    except MusicRoom.DoesNotExist:
        return Response({'error': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@authentication_classes([SessionAuthentication, JWTAuthentication])
@permission_classes([IsAuthenticated])
def leave_music_room(request):
    room_id = request.data.get('room_id')
    room = get_object_or_404(MusicRoom, room_id=room_id)
    if request.user not in room.listeners.all():
        return Response({'message': 'Not in the room'}, status=status.HTTP_400_BAD_REQUEST)
    room.listeners.remove(request.user)
    return Response({'message': 'Left the room successfully'})

