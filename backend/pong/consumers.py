import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.exceptions import StopConsumer
from django.contrib.auth import get_user_model
from users.models import Profile
from .models import GamePlay, Game, Tournament
from chat.utils import set_status, get_User_Object_from_scope
import asyncio


# GameArray aura cette forme:
# gameArray = {
#     "room_group_name" : gameplay instance,
# }
gameArray = {}

class setInterval():
    def __init__(self, callback, interval):
        self.callback = callback
        self.event = False
        self.interval = interval

    async def run(self):
        self.event = False
        while not self.event:
            self.event = await self.callback()
            if not self.event :
                await asyncio.sleep(0.005)
            # Why asyncio.sleep() and not sleep() ? 
                # sleep() is synchronous which blocks the event loop. To keep the loop non-blocking, 
                # replace it with await asyncio.sleep(1).
        print("quit loop")

# 1 instance de GameConsummer = 1 Websocket ; 1 Game = 1 room_groupe_name = 2 players = 2 websocket and so 2 GameConsumer if remote player (2 onglets) 
class GameConsumer(AsyncWebsocketConsumer):
    current_game = {}
    # Player identification ( and so GameConsumer ) => = L => LeftPlayer / = R => RightPlayer
    player_id = 'R'
    go = False
    gameLoop = None

    async def connect(self):
        print("=== connected ===")
        try :
            check = True
            self.game_name = self.scope["url_route"]["kwargs"]["game_name"]
            self.room_group_name = self.game_name
            
            # Check si une instance du Gameplay existe deja pour ce room_group_name et si elle contient moins de 2 players
            if self.room_group_name in gameArray:
                if gameArray[self.room_group_name].count_player() == 1:
                    gameArray[self.room_group_name].nb_player += 1
                    self.current_game = gameArray[self.room_group_name]
                elif gameArray[self.room_group_name].count_player() > 1:
                    check = False
            else:
                self.player_id = 'L'
                self.current_game = GamePlay(self.room_group_name)
                gameArray[self.room_group_name] = self.current_game
            
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)

            await self.accept()
            # If 2 players in the room_group_name, refuse connection
            if check == False :
                self.current_game = None
                await self.disconnect(close_code=3000)
        except Exception as e :
            print(f"Error connect : {e}")
            raise StopConsumer()

    @database_sync_to_async
    def erase_game_name(self, game_name):
        try :
            game = Game.objects.all().get(name=game_name)
            if game :
                # print(f"erase_game_name {game_name}")
                game.delete()
        except :
            pass                                                            

    async def disconnect(self, close_code):
        print("=== disconnected ===")
        if (self.current_game) :
            await self.erase_game_name(self.current_game.room_group_name)
            if close_code :
                await self.close(code=close_code)
            else :
                self.close()
            if self.current_game.remote == False :
                self.current_game.active = 'quit'
                # print(f"delete game {self.room_group_name}")
                await self.erase_game_name(self.room_group_name)
                if self.room_group_name in gameArray :
                    del gameArray[self.room_group_name]
            elif self.current_game.remote == True and (self.current_game.quit == 1 or self.current_game.nb_player == 1):
                # print(f"delete game {self.room_group_name}")
                await self.erase_game_name(self.room_group_name)
                if self.room_group_name in gameArray :
                    del gameArray[self.room_group_name]
                self.current_game.quit += 1
            else :
                self.current_game.quit += 1
                if self.current_game.db_recorded == False:
                    if self.player_id == 'R' :
                        self.current_game.result = 'L'
                    else :
                        self.current_game.result = 'R'
                    # print("send quit to front")
                    await self.current_game.update_stats()
                await self.channel_layer.group_send(self.room_group_name,
                {
                    "type": "send_state",
                    "message": self.current_game.result,
                    "quit": "yes",
                })
                self.current_game.active = 'quit'
                return
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        raise StopConsumer()

    async def game_loop(self):
        if self.current_game.active == 'quit':
            return True
        if self.current_game.active == 'pause':
            return False
        if self.current_game.result == 'L' or self.current_game.result == 'R' :
            if self.current_game.active == 'L' or self.current_game.active == 'R' :
                return True
            else:
                await asyncio.sleep(1)
        self.current_game.result = await self.current_game.ball.move_ball(self.current_game.paddle)
        if (self.current_game.result == 'L' or self.current_game.result == 'R') :
            self.current_game.active = await self.current_game.count_points()
        await self.channel_layer.group_send(self.room_group_name,
            {
                "type": "send_state",
                "message": self.current_game.active,
                "quit": "no",
            })
        return False

    # Backend => Frontend
    # Send through the websocket of the current GameConsummer the data needed to print the game
    async def send_state(self, event):
        text_json = self.current_game.to_json()
        text_json["active"] = event.get("message")
        text_json["quit"] = event.get("quit")
        await self.send(text_data=json.dumps(text_json))
    
    async def send_state_start(self, event):
        text_json = self.current_game.to_json()
        text_json["active"] = event.get("message")
        text_json["paddle_left_pos_top_x"] = event.get("paddle_left_pos_top_x")
        text_json["paddle_right_pos_top_x"] = event.get("paddle_right_pos_top_x")
        text_json["quit"] = event.get("quit")
        if self.current_game.active == 'quit':
            return
        await self.send(text_data=json.dumps(text_json))

    async def   main(self, gameLoop):
        if gameLoop :
            if (not self.current_game.remote) :
                task = [
                    gameLoop.run(),
                    self.current_game.paddle['L'].update_up('keyW'),
                    self.current_game.paddle['L'].update_down('keyS'),
                    self.current_game.paddle['R'].update_up('ArrowUp'),
                    self.current_game.paddle['R'].update_down('ArrowDown') ]
                self.go = True
                await asyncio.gather(*task)
            else :
                if (self.player_id == 'R') :
                    task_remote_r = [
                        gameLoop.run(),
                        self.current_game.paddle['R'].update_up('ArrowUp'),
                        self.current_game.paddle['R'].update_down('ArrowDown') ]
                else :
                    task_remote_r = [
                        gameLoop.run(),
                        self.current_game.paddle['L'].update_up('keyW'),
                        self.current_game.paddle['L'].update_down('keyS') ]
                self.go = True
                await asyncio.gather(*task_remote_r)
        elif (self.current_game.remote and self.go == False) :
            if (self.player_id == 'L') :
                task_remote_l = [
                    self.current_game.paddle['L'].update_up('keyW'),
                    self.current_game.paddle['L'].update_down('keyS') ]
            else :
                task_remote_l = [
                    self.current_game.paddle['R'].update_up('ArrowUp'),
                    self.current_game.paddle['R'].update_down('ArrowDown') ]
            self.go = True
            await asyncio.gather(*task_remote_l)
        # await asyncio.gather(
        #     gameLoop.run(),
        #     self.current_game.paddle['L'].update_up('keyW'),
        #     self.current_game.paddle['L'].update_down('keyS'),
        #     self.current_game.paddle['R'].update_up('ArrowUp'),
        #     self.current_game.paddle['R'].update_down('ArrowDown'),
        # )

    @database_sync_to_async
    def get_username(self, user_id) :
        return get_user_model().objects.filter(id=user_id).first()
    
    @database_sync_to_async
    def get_pseudo(self, user_id) :
        return Profile.objects.filter(id=user_id).first()

    # Frontend => Backend
    # 1.Receive through the websocket of the current GameConsummer datas from the frontend (Player has joined game / paddle_move)
    # 2.If two_players =>launch the game loop
    async def receive(self, text_data):
        # print (f"self.player_id {self.player_id}")
        text_data_json = json.loads(text_data)
        action = text_data_json["action"]
        # print("receive")

        if action == "playing" :
            if not self.current_game.remote :
                # print("no remote")
                self.current_game.keyW = text_data_json["keyW"]
                self.current_game.keyS = text_data_json["keyS"]
                self.current_game.arrowUp = text_data_json["arrowUp"]
                self.current_game.arrowDown = text_data_json["arrowDown"]
                self.go = True
            elif self.current_game.remote and self.player_id == 'L' :
                self.current_game.keyW = text_data_json["arrowUp"]
                self.current_game.keyS = text_data_json["arrowDown"]
            else :
                self.current_game.arrowUp = text_data_json["arrowUp"]
                self.current_game.arrowDown = text_data_json["arrowDown"]
            if not self.go :
                asyncio.create_task(self.main(None))
        
        elif action == "pause":
            if self.current_game.active == "playing" :
                self.current_game.active = "pause"
            else :
                self.current_game.active = "playing"

        elif (action == "new" and self.player_id == 'L') or (action == "replay" and self.current_game.nb_player == 2) or action == "local":
            if action == "new" :
                user = await self.get_username(self.scope["user"]["user_id"])
                self.current_game.name_l = user.username
                profile = await self.get_pseudo(self.scope["user"]["user_id"])
                if len(profile.pseudo) > 8 :
                    self.current_game.pseudo_l = profile.pseudo[:5] + "..."
                else :
                    self.current_game.pseudo_l = profile.pseudo
            if action == "local" :
                self.current_game.name_l = "Player 1"
                self.current_game.pseudo_l = "Player 1"
            paddle_h = float(text_data_json["paddle_h"])
            paddle_w = float(text_data_json["paddle_w"])
            container_h  = float(text_data_json["container_h"])
            container_w  = float(text_data_json["container_w"])
            ball_radius  = float(text_data_json["ball_radius"])
            self.current_game.init_elements(container_w, container_h, paddle_h, paddle_w, ball_radius)
            self.current_game.flag_start = True
            if action == "replay" :
                self.current_game.nb_player -= 1
                self.go = False
            if (action == "new" or action == "replay" and self.current_game.remote == True) :
                return
            # print("test1")

        # Launch the loop game only by the right player (to avoid 2 asynchrone game_loop)
        if (action == "new") or ((action == "local" or action == "replay") and self.current_game.nb_player == 1):
            while (not self.current_game.flag_start) :
                await asyncio.sleep(0.2)
            if action == "new" :
                user = await self.get_username(self.scope["user"]["user_id"])
                self.current_game.name_r = user.username
                profile = await self.get_pseudo(self.scope["user"]["user_id"])
                if len(profile.pseudo) > 8 :
                    self.current_game.pseudo_r = profile.pseudo[:5] + "..."
                else :
                    self.current_game.pseudo_r = profile.pseudo
            if action == "local":
                self.current_game.nb_player += 1
                self.current_game.remote = False
                self.current_game.name_r = "Player 2"
                self.current_game.pseudo_r = "Player 2"
            if action == "replay" :
                self.current_game.nb_player += 1
            if not self.gameLoop:
                self.gameLoop = setInterval(self.game_loop, 500)
            self.current_game.active = "start"
            await self.channel_layer.group_send(self.room_group_name,
            {
                "type": "send_state_start",
                "message": self.current_game.active,
                "paddle_left_pos_top_x": self.current_game.paddle["L"].pos_top_x,
                "paddle_right_pos_top_x": self.current_game.paddle["R"].pos_top_x,
                "quit": "no",
            })
            self.current_game.active = "playing"

            tasks = asyncio.all_tasks()
            for task in tasks:
                if task.done():
                    await task.cancel()

                    
            asyncio.create_task(self.main(self.gameLoop))
        
        elif action == "backtomenu" : #action qui pourra permettre de quitter le jeu en cas de control C
            self.current_game.active = 'quit'
            await self.disconnect(None)
        
        elif action == "terminal_quit" :
            self.current_game.active = 'quit'
            await self.disconnect(1000)

            # asyncio.create_task() allows the game loop to run in the background while the WebSocket 
            # 	consumer can still receive and process incoming messages like player movements or 
            # 	other actions. => voir def en bas
       



# BOUT DE COURS : Fonction ASYNChrone et fonctionnalite du mot cle AWAIT
    # En programmation asynchrone, au lieu de bloquer le programme pendant qu'une tâche est en attente
    # (comme une requête réseau ou une lecture de fichier), la fonction se "suspend" temporairement,
    # libérant le processeur pour d'autres tâches. Le mot-clé await permet précisément cette suspension
    # et la reprise des coroutines (fonction asynchrone declarees avec : async def).
    # Le mot-clé await est utilisé pour attendre l'achèvement d'une coroutine ou d'une tâche qui peut 
    # être en attente. Lorsqu'une coroutine est appelée, elle ne s'exécute pas immédiatement jusqu'à 
    # la fin. Au lieu de cela, elle retourne un objet spécial appelé coroutine qui représente son état 
    # suspendu.
# asyncio.create_task() is used to schedule the execution of a coroutine (an async function) in the 
    # background without blocking the main thread of execution. It creates a new task that runs concurrently 
    # with other tasks, allowing you to execute multiple coroutines "at the same time" without waiting for 
    # each to complete before moving on.
    # When you call create_task(), it does the following:
        # Starts the coroutine immediately: It schedules the coroutine to run in the event loop
            #  as a background task.
        # Runs in parallel: The task runs asynchronously in the background while the rest of your
            #  code (e.g., receiving messages) continues executing. This allows the game loop to run
            #  continuously every second while the WebSocket connection remains responsive to incoming
            #  messages.
        # Non-blocking: Unlike calling await on a coroutine, which waits for the coroutine to complete
            #  before continuing execution, create_task() lets the coroutine run independently, without
            #  pausing the rest of the program.
    # Differences from Traditional Background Workers:
        # Unlike traditional background workers that are often associated with threads or processes, tasks
        #  created by create_task() are not separate threads or processes. They are:
            # Coroutines: These tasks are just functions that pause at certain points (using await)
                #  to allow other tasks to run. They don't run in parallel like threads, but rather
                #  concurrently (they share the same execution thread and are interleaved by the event loop).
            # Single-threaded: asyncio tasks all run in the same thread unless you explicitly create
                #  threads or use multi-processing. This means they are more lightweight than thread-based
                #  workers and don’t involve the overhead of creating separate threads or processes.
    # When to Use create_task() vs Traditional Background Workers:
        # create_task(): Use this when you're working within an asynchronous framework (like Django
            #  Channels or aiohttp) and want to schedule tasks that run concurrently without blocking
            #  the rest of your code. It's ideal for I/O-bound tasks like network requests or handling
            #  multiple WebSocket connections.
        # Traditional Background Workers (Threads or Processes): Use these when you need to run CPU-bound
            #  tasks or handle tasks that truly need to run in parallel (e.g., doing heavy computation in
            #  the background). In those cases, you might use threading or multi-processing to take
            #  advantage of multiple CPU cores.
