from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from game import consumers
from accounts import views
urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Accounts App
    path('accounts/', include('accounts.urls')),  # Ensure accounts URLs are properly prefixed

    # Game App (Updated for Music Platform)
    path('', include('game.urls')),

    path('', views.home_view, name="home"),

    # WebSocket Routing for Music Rooms
    path('ws/music_room/<str:room_id>/', consumers.MusicRoomConsumer.as_asgi()),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
