from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Gamedata, Tournamentsdata
from .serializers import GamedataSerializer, TournamentsdataSerializer
from users.models import User
from users.serializers import UserStatSerializer

# Create your views here.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_stats(request):
    try:
        gamedata = Gamedata.objects.all()
        tenlatest = gamedata.order_by('-game_id')[:10]
        tenlatest_serializer = GamedataSerializer(tenlatest, many=True)
        top_users = User.objects.exclude(username='user').filter(profile__games_count__gt=0).order_by('-profile__victories_count', '-id')
        # top_users = User.objects.filter(profile__victories_count__gt=0).order_by('-id', '-profile__victories_count')
        top_users_serializer = UserStatSerializer(top_users, many=True)
        
        game_count = gamedata.count()
        active_users_count = User.objects.filter(gamedata__isnull=False).distinct().count()
        inactive_users_count = User.objects.filter(gamedata__isnull=True).exclude(username='user').distinct().count()
        
        # tournamentsdata = Tournamentsdata.objects.all()
        tournamentsdata = Tournamentsdata.objects.filter(started=True)
        tournaments_serializer = TournamentsdataSerializer(tournamentsdata, many=True)
        tournaments_count = tournamentsdata.count()
        top_users_tourn = User.objects.exclude(username='user').filter(profile__won_tournaments_count__gt=0).order_by('-profile__won_tournaments_count', '-id')
        # top_users_tourn = User.objects.exclude(username='user').filter(profile__tournaments_count__gt=0).order_by('-profile__won_tournaments_count', '-id')
        top_users_tourn_serializer = UserStatSerializer(top_users_tourn, many=True)

        response_data = {
            "history":tenlatest_serializer.data,
            "top_users": top_users_serializer.data,
            "games_count": game_count,
            "active_users_count": active_users_count,
            "inactive_users_count": inactive_users_count,
            "tournaments_data": tournaments_serializer.data,
            "tournaments_count": tournaments_count,
            "top_users_tourn": top_users_tourn_serializer.data,
        }
        return Response(response_data)
    except:
        return Response({"error": "Global stats not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def personal_stats(request):
    try:
        # print(f"Request body: {request.body}")
        user = request.user
        gamedata = user.gamedata.all()
        # gamedata = Gamedata.objects.filter(users=request.user)
        tenlatest = gamedata.order_by('-game_id')[:10]
        games_won = gamedata.filter(winner_name=user.username)
        kos_won = games_won.filter(loser_score=0).count()
        games_lost = gamedata.exclude(winner_name=user.username)
        kos_lost = games_lost.filter(loser_score=0).count()
        
        games_filter = request.data.get("hist_val")
        # print(f"games_filter = {games_filter}")
        if (games_filter == "vic-hist"):
            tenlatest_serializer = GamedataSerializer(games_won, many=True)
        elif (games_filter == "def-hist"):
            tenlatest_serializer = GamedataSerializer(games_lost, many=True)
        else:
            tenlatest_serializer = GamedataSerializer(tenlatest, many=True)
        game_count = gamedata.count()

        # tournamentsdata = user.tournamentsdata.all()
        tournamentsdata = user.tournamentsdata.filter(started=True)
        tournaments_serializer = TournamentsdataSerializer(tournamentsdata, many=True) #rajout
        tournaments_count = tournamentsdata.count()

        top_users = User.objects.exclude(username='user').filter(profile__games_count__gt=0).order_by('-profile__victories_count', '-id')
        users_count = top_users.count()
        rank = None
        for position, pos in enumerate(top_users, start=1):
            if pos == user:
                rank = position
                break
        if rank:
            user_rank = rank
        else:
            user_rank = -1
        # print(f"user_rank = {user_rank}")
        # print(f"users_count = {users_count}")

        response_data = {
            "history":tenlatest_serializer.data,
            "games_count": game_count,
            "own_username": user.username,
            "own_victories": user.profile.victories_count,
            "kos_won": kos_won,
            "kos_lost": kos_lost,
            "tournaments_data": tournaments_serializer.data,
            "tournaments_count": tournaments_count,
            "own_won_tournaments": user.profile.won_tournaments_count,
            "user_rank": user_rank,
            "users_count": users_count,
        }
        return Response(response_data)
    except:
        return Response({"error": "Personal stats not found"}, status=status.HTTP_404_NOT_FOUND)