from django.urls import path
# from .views import RegisterGameAPIView, RegisterTournamentViewSet
from .views import RegisterGameViewSet, RegisterTournamentViewSet

urlpatterns = [
    # path("register_game/", RegisterGameAPIView.as_view()),
    # path("getgames/", RegisterGameAPIView.as_view()),
    # path("deletegame/", RegisterGameAPIView.as_view()),
    path("register_game/", RegisterGameViewSet.as_view({"post" : "create"})),
    path("join_game/", RegisterGameViewSet.as_view({"post" : "join"})),
    path("gameExist/", RegisterGameViewSet.as_view({"post" : "game_check"})),
    path("getgames/", RegisterGameViewSet.as_view({"get" : "get"})),
    path("deletegame/", RegisterGameViewSet.as_view({"delete" : "delete"})),
    path("register_tournament/", RegisterTournamentViewSet.as_view({"post" : "create"})),
    path("join_tournament/", RegisterTournamentViewSet.as_view({"post" : "join"})),
    path("get_tournaments/", RegisterTournamentViewSet.as_view({"get" : "get"})),
    path("players_count/", RegisterTournamentViewSet.as_view({"post" : "players_count"})),
    path("next_game/", RegisterTournamentViewSet.as_view({"post" : "next_game"})),
    path("winners_count/", RegisterTournamentViewSet.as_view({"post" : "winners_count"})),
    path("first_room/", RegisterTournamentViewSet.as_view({"post" : "first_room"})),
    path("next_room/", RegisterTournamentViewSet.as_view({"post" : "next_room"})),
    path("remove_player/", RegisterTournamentViewSet.as_view({"post" : "remove_player"})),
    path("delete_tournament/", RegisterTournamentViewSet.as_view({"delete" : "delete"})),
    # ajout temporaire Orlando
    path("delete_all_tournaments/", RegisterTournamentViewSet.as_view({"delete" : "delete_all"})),
]