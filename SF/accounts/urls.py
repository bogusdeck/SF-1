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
    path('api/acounts/logout/', views.LogoutView.as_view(), name='api-logout'),
]