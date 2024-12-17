from django.db.models import Q
from django.db import transaction
from django.core.exceptions import BadRequest
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .serializers import GameSerializer, TournamentSerializer
from .models import Game, Tournament
from stats.models import Tournamentsdata
from users.models import User

# Return true if player already connect to a game or a tournament
# def check_game_tournament_connection(username) :
#     game_check = Game.objects.filter(Q(player1=username) | Q(player2=username))
#     tournament_check = Tournament.objects.filter(players__contains=[username])
#     if game_check or tournament_check :
#         return True
#     return False

# TO DO : voir avec Maelle question securite
@permission_classes([IsAuthenticated])
class RegisterGameViewSet(ViewSet) :
    
    # Return all the games that are waiting for one player
    def get(self, request, *args, **kwargs) :
        games = Game.objects.all().filter(player=1)
        serializer = GameSerializer(games, many=True)
        return Response(serializer.data)

    # PROTEGE
    # Creation of a local or remote game if doesn't exist
    def create(self, request, *args, **kwargs) :
        try :
            # Checke if player already register in a game
            if self.gameExists(request.data["gameName"]):
                return Response({"game_status":"exist"})
            # REMOTE PLAYER
            if request.data["action"] == "create" :
                Game.objects.create(name=request.data["gameName"], player=1, player1=request.user.username)
            # LOCAL PLAYERS
            else :
                Game.objects.create(name=request.data["gameName"], player=2, player1=request.user.username)
            return Response({"game_status":"created"})
        except Exception as e :
            raise BadRequest("Error occur in creation of the game")
    
    # PROTEGE
    # Second Player join a game in remote mode
    @transaction.atomic
    def join(self, request, *args, **kwargs) :
        # # Create the game if doen't exist
        # if check_game_tournament_connection(request.user.username) :
        #     return Response({"game_status":"already-logged"})
        # In case a second player join
        try :
            obj = Game.objects.select_for_update().get(name=request.data["gameName"])
            if obj:
                if obj.player > 1 :
                    return Response({"game_status":"playing"})
                else :
                    if obj.player1 == request.user.username :
                        return Response({"game_status":"already-logged"})
                    obj.player2 = request.user.username
                    obj.player += 1
                    obj.save()
                    return Response({"game_status":"joined"})
            else :
                return Response({"game_status":"absent"})
        except Exception as e :
            print(f"Error join : {e}")
            return Response({"game_status":"absent"})

    # delete a game from database if exist
    def delete(self, request, *args, **kwargs) :
        obj = Game.objects.all().filter(name=request.data["gameNameValue"])
        if obj :
            # print(f"delete game {request.data} true")
            obj.delete()
            return Response({"game_deleted":True})
        return Response({"game_deleted":False})

    # return true in database if a game exist with this name 
    def gameExists(self, game_name) :
        game = Game.objects.all().filter(name=game_name)
        if not game :
            return False
        return True
    
    def game_check(self, request, *args, **kwargs):
        res = self.gameExists(request.data["gameName"])
        if res :
            return Response({"game_exist":"yes"})
        return Response({"game_exist":"no"})

@permission_classes([IsAuthenticated])
class RegisterTournamentViewSet(ViewSet) :
    
    # Return all the games that are waiting for one player
    def get(self, request, *args, **kwargs) :
        # MODIF 8
        tournaments = Tournament.objects.all().filter(Q(player_len=1) | Q(player_len=2) |Q(player_len=3))
        serializer = TournamentSerializer(tournaments, many=True)
        return Response(serializer.data)

     # PROTEGE
    @transaction.atomic
    def players_count(self, request, *args, **kwargs) :
        try :
            tournament = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            serializer = TournamentSerializer(tournament, many=False)
            return Response(serializer.data)
        except Exception as e:
            print(f"error in players_count : {e}")
            raise BadRequest("Tournament not found")

    # PROTEGE
    @transaction.atomic
    def winners_count(self, request, *args, **kwargs) :
        try :
            tournament = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            if len(tournament.losers) + 1 == len(tournament.players):
                tournamentdata = Tournamentsdata.objects.get(tournament_id=tournament.stats_id)
                user = User.objects.get(username=request.user)
                profile = user.profile
                profile.won_tournaments_count += 1
                profile.save()
                tournamentdata.winner_name = user.username
                tournamentdata.save()
                return Response({"next" : "end"})
            if len(tournament.winners) == tournament.player :
                return Response({"next":"yes"})
            return Response({"next" : "no"})
        except  Exception as e:
            print(f"error in winners_count : {e}")
            raise BadRequest("Tournament not found")
        
            # PROTEGE
    @transaction.atomic
    def first_room(self, request, *args, **kwargs) :
        try :
            tournament = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            tournament.start = True
            if (tournament.player == 0):
                tournamentdata = Tournamentsdata.objects.select_for_update().get(tournament_id=tournament.stats_id)
                for user in tournamentdata.users.all():
                    user = User.objects.get(username=request.user)
                    profile = user.profile
                    profile.tournaments_count += 1
                    profile.save()
                tournamentdata.started = True
                tournamentdata.save()
            if len(tournament.losers) + 1 == len(tournament.players):
                return Response({"next" : "end"})
            tournament.player += 1
            tournament.save()
            # Si dernier player sans avoir ete matche encore et que nb impair donc pas de match sur ce tour possible
            if (tournament.player + len(tournament.losers) == 8 and tournament.player % 2 == 1):
                tournament.winners.append(request.user.username)
                tournament.save()
                return Response({"next" : "no"})
            room_nb = int(tournament.player / 2) + int(tournament.player % 2)
            room_name = request.data["gameNameSave"] + "_" +  room_nb.__str__()
            # print(f"room_name = {room_name}")
            return Response({"next":"yes", "room_name":room_name})
        except  Exception as e:
            print(f"error in first_room : {e}")
            raise BadRequest("Tournament not found")
    
    # PROTEGE
    @transaction.atomic
    def next_room(self, request, *args, **kwargs) :
        try :
            tournament = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            if len(tournament.losers) + 1 == len(tournament.players):
                tournamentdata = Tournamentsdata.objects.get(tournament_id=tournament.stats_id)
                user = User.objects.get(username=request.user)
                profile = user.profile
                profile.won_tournaments_count += 1
                profile.save()
                tournamentdata.winner_name = user.username
                tournamentdata.save()
                return Response({"next" : "end"})
            tournament.winner_nb += 1
            # Si dernier player sans avoir ete matche encore et que nb impair donc pas de match sur ce tour possible
            if (tournament.player == tournament.winner_nb and tournament.winner_nb % 2 == 1):
                tournament.winner_nb -= 1
                tournament.save()
                return Response({"next" : "no"})
            tournament.save()
            room_nb = int(tournament.winner_nb / 2) + int(tournament.winner_nb % 2)
            room_name = request.data["gameNameSave"] + "_" +  room_nb.__str__()
            # print(f"room_name = {room_name}")
            return Response({"next":"yes", "room_name":room_name})
        except  Exception as e:
            print(f"error in next_room : {e}")
            raise BadRequest("Tournament not found")

    # PROTEGE
    # Create the tournament if doen't exist
    @transaction.atomic
    def create(self, request, *args, **kwargs) :
        try :
            if self.tournamentExists(request.data["gameName"]):
                return Response({"game_status":"exist"})
            Tournament.objects.create(name=request.data["gameName"], player=0, player_len=1, players=[request.user.username])
            tournament = Tournament.objects.get(name=request.data["gameName"])
            tournamentdata = Tournamentsdata()
            tournamentdata.save()
            user = User.objects.get(username=request.user)
            tournamentdata.users.add(user)
            tournamentdata.save()
            tournament.stats_id = tournamentdata.tournament_id
            tournament.save()
            return Response({"game_status":"created"})
        except Exception as e :
            print(f"Error: {str(e)}")
            raise BadRequest("Error occur in creation of the tournament")
        
    # PROTEGE
    # In case a player join a tournament
    @transaction.atomic
    def join(self, request, *args, **kwargs) :
        # if check_game_tournament_connection(request.user.username) :
        #     return Response({"game_status":"already-logged"})
        try :
            # print(f"gameName = {request.data["gameName"]}")
            obj = Tournament.objects.select_for_update().get(name=request.data["gameName"])
            if obj :
                # MODIF 8
                if len(obj.players) > 3 :
                    return Response({"game_status":"playing"})
                else :
                    if request.user.username in obj.players :
                        return Response({"game_status":"already-logged"})
                    obj.players.append(request.user.username)
                    # obj.player += 1
                    obj.player_len += 1
                    obj.save()
                    tournamentdata = Tournamentsdata.objects.get(tournament_id=obj.stats_id)
                    user = User.objects.get(username=request.user)
                    tournamentdata.users.add(user)
                    tournamentdata.save()
                    return Response({"game_status":"joined"})
            else :
                return Response({"game_status":"absent"})
        except :
            return Response({"game_status":"absent"})
    
    # PROTEGE
    # Defeat => Say to front no more game
    # Win => Say to front to join the waiting list for next game + update database
    @transaction.atomic
    def next_game(self, request, *args, **kwargs) :
        try :
            obj = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            # print(f"TEST")
            if request.data["loser"] == request.user.username :
                return Response({"game_status":"lost", "room_name":""})
            else :
                if request.user.username not in obj.winners :
                    obj.winners.append(request.user.username)
                if request.data["loser"] in obj.winners :
                    # print(f"erase {request.data["loser"]} from obj.winners")
                    obj.winners.remove(request.data["loser"])
                obj.losers.append(request.data["loser"])
                obj.player -= 1
                obj.save()
                return Response({"game_status":"win"})
        except :
            raise BadRequest("Tournament not found")

    # delete a game from database if exist
    def delete(self, request, *args, **kwargs) :
        obj = Tournament.objects.all().filter(name=request.data["gameNameSave"])
        if obj :
            obj.delete()
            # print(f"delete tournament {request.data} true")
            return Response({"res":True})
        return Response({"res":False})
    
    # PROTEGE
    # In case of salvage quit from one player
    @transaction.atomic
    def remove_player(self, request, *args, **kwargs) :
        try :
            obj = Tournament.objects.select_for_update().get(name=request.data["gameNameSave"])
            # Tournament has begun
            # MODIF 8 
            if len(obj.players)  == 4:
                # if cas ou tous les players quittent avant le compte a rebours tous looser
                if obj.player == 0 :
                    return (self.delete(request))
                if request.user.username in obj.winners :
                    obj.winners.remove(request.user.username)
                    obj.losers.append(request.user.username)
                    obj.player -= 1
                    obj.save()
                    # TO DO : QUE SE PASSE T IL SI IL RESTE 1 SEUL PLAYER ? ET OU LE GERER ?
                    # print(f"player {request.user.username} deleted from tournament {obj.name}")
                    return Response({"res":True})
                return Response({"res":True})
            # Before Tournament begins
            else :
                # STAT CLAIRE
                tournamentdata = Tournamentsdata.objects.select_for_update().get(tournament_id=obj.stats_id)
                if tournamentdata.users.filter(id=request.user.id).exists():
                    tournamentdata.users.remove(request.user)
                if len(obj.players) > 1:
                    obj.players.remove(request.user.username)
                    # obj.player -= 1
                    obj.player_len -= 1
                    obj.save()
                    # print(f"player {request.user.username} deleted from tournament {obj.name}")
                    return Response({"res":True})
                # Before Tournament begins and only one player waiting in the Tournament
                else :
                    return (self.delete(request))
        except Exception as e:
            print(f"Error: {str(e)}")
            return Response({"res":False})

    # return true in database if a game exist with this name 
    def tournamentExists(self, game_name) :
        tournament = Tournament.objects.all().filter(name=game_name)
        if not tournament :
            return False
        return True