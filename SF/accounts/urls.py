from django.urls import path
from . import views

urlpatterns = [
    # Template Views
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),

    # API Views
    path('api/register/', views.RegisterView.as_view(), name='api-register'),
    path('api/login/', views.LoginView.as_view(), name='api-login'),
    path('api/logout/', views.LogoutView.as_view(), name='api-logout'),
    path('api/connect-spotify/', views.SpotifyConnectView.as_view(), name='api-connect-spotify'),
    path('api/disconnect-spotify/', views.SpotifyDisconnectView.as_view(), name='api-disconnect-spotify'),
]
