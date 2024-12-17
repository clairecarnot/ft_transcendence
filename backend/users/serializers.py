from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import User, Profile
# from django.db import models
from rest_framework.serializers import ModelSerializer

# from .models import Note

# User = get_user_model()

# class ProfileSerialize(ModelSerializer):
# 	class Meta:
# 		model = User
# 		fields = ("username", "email")

class ProfileSerializer(serializers.ModelSerializer):
	username = serializers.CharField(source='user.username')
	pseudo = serializers.CharField(allow_blank=True, required=False)
	email = serializers.CharField(source='user.email')
	status = serializers.CharField(read_only=True)
	bio = serializers.CharField(allow_blank=True, required=False)
	class Meta:
		model = Profile
		fields = ['username', 'pseudo', 'email', 'status', 'bio', 'image', 'games_count', 'victories_count']
		# fields = ['username', 'image']
	

class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ["username"]

# class NoteSerializer(serializers.ModelSerializer):
# 	class Meta:
# 		model = Note
# 		fields = ['id', 'description']

class UserStatSerializer(serializers.ModelSerializer):
	games_count = serializers.IntegerField(source='profile.games_count', read_only=True)
	victories_count = serializers.IntegerField(source='profile.victories_count', read_only=True)
	tournaments_count = serializers.IntegerField(source='profile.tournaments_count', read_only=True)
	won_tournaments_count = serializers.IntegerField(source='profile.won_tournaments_count', read_only=True)
	class Meta:
		model = User
		fields = ['id', 'username', 'games_count', 'victories_count', 'tournaments_count', 'won_tournaments_count']