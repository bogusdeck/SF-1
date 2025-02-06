"""
ASGI config for SF project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from game.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'SF.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # Handle HTTP requests
    "websocket": AuthMiddlewareStack(  # Handle WebSocket connections with authentication
        URLRouter(
            websocket_urlpatterns  # Use WebSocket URL patterns from game/routing.py
        )
    ),
})