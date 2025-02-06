from django.urls import path
from . import views

urlpatterns = [
    # Template Views
    path('accounts/login/', views.login_view, name='login'),
    path('accounts/signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),

    # API Views
    path('api/accounts/register/', views.RegisterView.as_view(), name='api-register'),
    path('api/accounts/login/', views.LoginView.as_view(), name='api-login'),
    path('api/accounts/logout/', views.LogoutView.as_view(), name='api-logout'),
    path('api/accounts/profile/', views.ProfileView.as_view(), name='api-profile'),
    path('api/accounts/connect-spotify/', views.SpotifyConnectView.as_view(), name='api-connect-spotify'),
    path('api/accounts/disconnect-spotify/', views.SpotifyDisconnectView.as_view(), name='api-disconnect-spotify'),
]