from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/music_room/(?P<room_id>\w+)/$', consumers.MusicRoomConsumer.as_asgi()),
]