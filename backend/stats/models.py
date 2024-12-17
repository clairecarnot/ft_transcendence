from django.db import models
from users.models import User

# Create your models here.

class Gamedata(models.Model):
	game_id = models.AutoField(primary_key=True)
	# game_id = models.IntegerField(default=0, primary_key=True)
	date_created = models.DateTimeField(auto_now_add=True)
	winner_name = models.CharField(max_length=255, blank=True, default='winner')
	loser_name = models.CharField(max_length=255, blank=True, default='loser')
	winner_score = models.IntegerField(default=0)
	loser_score = models.IntegerField(default=0)
	users = models.ManyToManyField(User, related_name="gamedata")

class Tournamentsdata(models.Model):
	tournament_id = models.AutoField(primary_key=True)
	# tournament_id = models.IntegerField(default=0, primary_key=True)
	# date_created = models.DateTimeField(auto_now_add=True)
	winner_name = models.CharField(max_length=255, blank=True, default='user')
	# loser_name = models.CharField(max_length=255, blank=True, default='loser')
	# winner_score = models.IntegerField(default=0)
	# loser_score = models.IntegerField(default=0)
	users = models.ManyToManyField(User, related_name="tournamentsdata")
	started = models.BooleanField(default=False)