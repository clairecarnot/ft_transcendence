from rest_framework import serializers
from .models import Gamedata, Tournamentsdata
from users.serializers import UserStatSerializer

class GamedataSerializer(serializers.ModelSerializer):
    users = UserStatSerializer(many=True, read_only=True)

    class Meta:
        model = Gamedata
        fields = ['game_id', 'date_created', 'winner_name', 'loser_name', 'winner_score', 'loser_score', 'users']


class TournamentsdataSerializer(serializers.ModelSerializer):
    users = UserStatSerializer(many=True, read_only=True)

    class Meta:
        model = Tournamentsdata
        fields = ['tournament_id', 'winner_name', 'users']