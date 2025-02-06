from django.urls import path
from . import views

urlpatterns = [
    # Template Views
    path('', views.music_lobby, name='music_lobby'),  # Updated to music lobby
    path('room/<str:room_id>/', views.music_room, name='music_room'),  # Updated to music room
    path('chat/', views.chat_view, name='chat'),  # Retained for chat functionality
    path('friends/', views.friends_view, name='friends'),  # Retained for friends functionality
    path('profile/', views.profile_view, name='profile'),  # Retained for profile functionality

    # API Views
    path('api/host/', views.host_music_room, name='host-music-room'),  # Updated to host music room
    path('api/join/', views.join_music_room, name='join-music-room'),  # Updated to join music room
    path('api/rooms/available/', views.available_music_rooms, name='available-music-rooms'),  # Updated to list available music rooms

    # Friends API (Retained)
    path('api/friends/', views.FriendshipViewSet.as_view({'get': 'list', 'post': 'create'}), name='friend-list'),
    path('api/friends/<int:pk>/accept/', views.FriendshipViewSet.as_view({'post': 'accept'}), name='friend-accept'),

    # Music Room API
    path('api/rooms/', views.MusicRoomViewSet.as_view({'get': 'list', 'post': 'create'}), name='music-room-list'),
    path('api/rooms/<str:room_id>/join/', views.MusicRoomViewSet.as_view({'post': 'join'}), name='music-room-join'),
    path('api/rooms/<str:room_id>/start/', views.MusicRoomViewSet.as_view({'post': 'start'}), name='music-room-start'),
    path('api/rooms/<str:room_id>/players/', views.MusicRoomViewSet.as_view({'get': 'players'}), name='music-room-players'),
]