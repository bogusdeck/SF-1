from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import home_view

urlpatterns = [
    path('', home_view, name='home'),
    path('admin/', admin.site.urls),
    path('', include('accounts.urls')),  # This will include both regular and API URLs
    path('game/', include('game.urls')),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
