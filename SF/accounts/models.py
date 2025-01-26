from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import MinLengthValidator
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    name = models.CharField(max_length=255)
    email = models.EmailField(_('email address'), unique=True)
    dob = models.DateField(verbose_name='Date of Birth')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    high_score = models.IntegerField(default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'name', 'dob']

    def __str__(self):
        return self.email

class Friendship(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='friendships')
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='friend')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'friend')
    
    def __str__(self):
        return f"{self.user} and {self.friend}"
