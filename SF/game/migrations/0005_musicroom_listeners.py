# Generated by Django 5.1.5 on 2025-02-16 17:43

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0004_remove_gameprogress_character_remove_game_host_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='musicroom',
            name='listeners',
            field=models.ManyToManyField(blank=True, related_name='joined_rooms', to=settings.AUTH_USER_MODEL),
        ),
    ]
