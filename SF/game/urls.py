from django.urls import path
from . import views

urlpatterns = [
    # Template Views
    path('music_lobby/', views.music_lobby, name='music_lobby'),  
    path('music_lobby/<int:room_id>', views.music_room, name='music_room'),  

    # API Views
    path('api/host/', views.create_music_room, name='create_music_room'),  
    path('api/join/', views.join_music_room, name='join-music-room'),  

    # Music Room API
    path('api/rooms/', views.MusicRoomViewSet.as_view({'get': 'list', 'post': 'create'}), name='music-room-list'),
    path('api/rooms/<str:room_id>/join/', views.MusicRoomViewSet.as_view({'post': 'join'}), name='music-room-join'),
    path('api/rooms/<str:room_id>/start/', views.MusicRoomViewSet.as_view({'post': 'start'}), name='music-room-start'),
    path('api/rooms/<str:room_id>/players/', views.MusicRoomViewSet.as_view({'get': 'players'}), name='music-room-players'),
]
