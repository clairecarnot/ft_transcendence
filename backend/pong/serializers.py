from rest_framework import serializers
from .models import Game, Tournament

class GameSerializer(serializers.ModelSerializer):

    class Meta:
        model = Game
        fields = ['name', 'player', 'player1', 'player2']

class TournamentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Tournament
        fields = ['name', 'player', 'players', 'player_len', 'losers', 'winners']
