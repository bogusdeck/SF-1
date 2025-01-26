from django.urls import path
from . import views

urlpatterns = [
    # Template Views
    path('', views.game_lobby, name='game_lobby'),
    path('room/<str:room_id>/', views.game_room, name='game_room'),
    path('chat/', views.chat_view, name='chat'),
    path('friends/', views.friends_view, name='friends'),
    path('profile/', views.profile_view, name='profile'),
    
    # API Views
    path('api/host/', views.host_game, name='host-game'),
    path('api/join/', views.join_game, name='join-game'),
    path('api/games/available/', views.available_games, name='available-games'),
    
    path('api/characters/', views.CharacterViewSet.as_view({'get': 'list', 'post': 'create'}), name='character-list'),
    path('api/friends/', views.FriendshipViewSet.as_view({'get': 'list', 'post': 'create'}), name='friend-list'),
    path('api/friends/<int:pk>/accept/', views.FriendshipViewSet.as_view({'post': 'accept'}), name='friend-accept'),
    path('api/games/', views.GameSessionViewSet.as_view({'get': 'list', 'post': 'create'}), name='game-list'),
    path('api/games/<str:room_id>/join/', views.GameSessionViewSet.as_view({'post': 'join'}), name='game-join'),
    path('api/games/<str:room_id>/start/', views.GameSessionViewSet.as_view({'post': 'start'}), name='game-start'),
]
