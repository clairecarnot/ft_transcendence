from django.db import models, transaction
import math
import random
import asyncio
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from stats.models import Gamedata
from users.models import User

# Create your models here.
class Ball(models.Model) :
    def __init__(self, container_h, ball_radius) :
        random.seed()
        self.radius = (ball_radius / 2) * 100 / container_h # Rayon
        self.pos_center_x = 50.0 
        self.pos_center_y = 50.0
        #  Dans le pong, le vecteur vitesse pointe toujours vers le meme endroit que le vecteur direction
        self.unit_velocity = 0.20 
        self.coef_velocity = 1
        self.velocity = self.unit_velocity * self.coef_velocity # coef de deplacement par unite de temps
        self.init_angle(0)

    def init_angle(self, sign) :
        if (sign == 0):
            sign = random.choice([-1, 1])
        angle = random.randint(30, 150)
        self.angle = math.radians(angle * sign)
        self.dir_x = math.sin(self.angle) * self.velocity
        self.dir_y = -math.cos(self.angle) * self.velocity

    async def angle_calculation(self, paddle, player_id, y_hit_point) :
        y_hit_paddle = y_hit_point - paddle.pos_top_y
        # TROP RAPIDE DANS ANGLE ? REDUIRE 1.5
        self.coef_velocity = math.fabs(1 - y_hit_paddle * 2 / paddle.length) * 1.1 + 1
        self.velocity = self.unit_velocity * self.coef_velocity
        if self.velocity > 0.6 :
            self.velocity = 0.6
        if (player_id == 'R'):
            angle = - ((120 * y_hit_paddle) / paddle.length) - 30
        else :
            angle = (120 * (y_hit_paddle)) / paddle.length + 30
        self.angle = math.radians(angle)
        self.dir_x = math.sin(self.angle) * self.velocity
        self.dir_y = -math.cos(self.angle) * self.velocity

    async def hit_paddle(self, paddle):
        if (self.pos_center_y + self.radius >= paddle.pos_top_y and self.pos_center_y - self.radius<= paddle.length + paddle.pos_top_y):
            return 1
        return 0

    async def re_init_position(self, paddles, point) :
        paddles["R"].pos_top_y = 50.0 - paddles["R"].length / 2
        paddles["L"].pos_top_y = 50.0 - paddles["L"].length / 2
        self.pos_center_x = 50.0
        self.pos_center_y = 50.0 
        self.unit_velocity = 0.20
        self.coef_velocity = 1
        self.velocity = self.unit_velocity * self.coef_velocity
        if point == 'L':
            self.init_angle(1)
        else :
            self.init_angle(-1)

    async def move_ball(self, paddles) :
        
        next_x = self.pos_center_x + self.dir_x
        # Hit window side or paddle left or right :
        if next_x > paddles["R"].hit_x - self.radius and self.angle > 0.0:
            if await self.hit_paddle(paddles["R"]):
                self.unit_velocity += 0.005
                await self.angle_calculation(paddles["R"], "R", self.pos_center_y)
            elif next_x > 100.0 - self.radius and self.angle > 0.0:
                await self.re_init_position(paddles, "L")
                return ('L')
        elif next_x < paddles["L"].hit_x + self.radius and self.angle < 0.0:
            if await self.hit_paddle(paddles["L"]):
                self.unit_velocity += 0.005
                await self.angle_calculation(paddles["L"], "L", self.pos_center_y)
            elif next_x < self.radius and self.angle < 0.0:
                await self.re_init_position(paddles, "R")
                return ('R')
        # Hit window top :
        elif (self.pos_center_y + self.dir_y > 100 - self.radius or self.pos_center_y + self.dir_y < self.radius) :
            self.dir_y *= -1

        self.pos_center_x += self.dir_x
        self.pos_center_y += self.dir_y
        return 'D'

class Paddle(models.Model) :
    def __init__(self, pos_top_x, container_w, container_h, paddle_h, paddle_w, dir_w, current_game) :
        self.current_game = current_game
        self.point = 0
        self.length = paddle_h * 100 / container_h
        self.width = paddle_w * 100 / container_w
        self.pos_top_x = pos_top_x
        self.hit_x = pos_top_x + self.width * dir_w
        self.pos_top_y = 50.0 - self.length / 2
        self.var = 0.2

    # Move paddle up
    async def update_up(self, key) :
        if key == "keyW":
            while not (self.current_game.active == 'quit' or self.current_game.active == 'L' or self.current_game.active == 'R') :
                if self.current_game.keyW and self.current_game.active == 'playing':
                    if self.pos_top_y - self.var >= 0 :
                        self.pos_top_y -= self.var
                    else :
                        self.pos_top_y = 0
                await asyncio.sleep(0.005)
        else :
            while not (self.current_game.active == 'quit' or self.current_game.active == 'L' or self.current_game.active == 'R') :
                if self.current_game.arrowUp and self.current_game.active == 'playing':
                    if self.pos_top_y - self.var >= 0 :
                        self.pos_top_y -= self.var
                    else :
                        self.pos_top_y = 0
                await asyncio.sleep(0.005)

    # Move paddle down
    async def update_down(self, key) :
        if key == "keyS":
            while not (self.current_game.active == 'quit' or self.current_game.active == 'L' or self.current_game.active == 'R') :
                if self.current_game.keyS and self.current_game.active == 'playing':
                    if self.pos_top_y + self.length + self.var <= 100 :
                        self.pos_top_y += self.var
                    else :
                        self.pos_top_y = 100 - self.length
                await asyncio.sleep(0.005)
        else :
            while not (self.current_game.active == 'quit' or self.current_game.active == 'L' or self.current_game.active == 'R') :
                if self.current_game.arrowDown and self.current_game.active == 'playing':
                    # print("Down")
                    if self.pos_top_y + self.length + self.var <= 100 :
                        self.pos_top_y += self.var
                    else :
                        self.pos_top_y = 100 - self.length
                await asyncio.sleep(0.005)
    
class GamePlay(models.Model) :
    def	__init__(self, room_group_name):
        self.room_group_name = room_group_name
        self.nb_player = 1
        self.active = "stop" # state game : stop, start , L or R for victory
        self.result = 'D'
        self.remote = True
        self.quit = 0
        self.arrowUp = False
        self.arrowDown = False
        self.keyW = False
        self.keyS = False
        self.name_l = "Player 1"
        self.name_r = "Player 2"
        self.pseudo_l = "Player 1"
        self.pseudo_r = "Player 2"
        self.db_recorded = False
        self.flag_start = False

    def init_elements(self, container_w, container_h, paddle_h, paddle_w, ball_radius):
        self.height_w = 100
        self.width_w = 100
        self.ball = Ball(container_h, ball_radius / 2)
        self.paddle = {
            "R" : Paddle(99.0, container_w, container_h, paddle_h, paddle_w, -1, self),
            "L" : Paddle(1.0, container_w, container_h, paddle_h, paddle_w, 1, self),
        }
        self.db_recorded = False
    
    def count_player(self):
        return self.nb_player

    def to_json(self):
        return {
            "active": self.active,
            # Ball
            "ball_pos_center_x": (self.ball.pos_center_x),
            "ball_pos_center_y": (self.ball.pos_center_y),
            # Paddle_left
            "paddle_left_pos_top_y": self.paddle["L"].pos_top_y,
            # Paddle_right
            "paddle_right_pos_top_y": self.paddle["R"].pos_top_y,
            # Points
            "paddle_left_points": self.paddle["L"].point,
            "paddle_right_points": self.paddle["R"].point,
            "playerLPseudo": self.pseudo_l,
            "playerRPseudo": self.pseudo_r,
            "playerLName": self.name_l,
            "playerRName": self.name_r,
            }
    
    async def count_points(self) :
        self.paddle[self.result].point += 1
        if self.paddle[self.result].point >= 3 :
            await self.update_stats()
            return self.result
        return "playing"

    @database_sync_to_async
    def update_stats(self):
        if self.db_recorded == False:
            self.db_recorded = True
            if self.name_l != "Player 1" and self.name_r != "Player 2":
                # user_l = get_user_model().objects.get(username=self.name_l)
                # user_r = get_user_model().objects.get(username=self.name_r)
                # player_l = get_user_model().objects.get(username=self.name_l).profile
                # player_r = get_user_model().objects.get(username=self.name_r).profile
                user_l = User.objects.get(username=self.name_l)
                user_r = User.objects.get(username=self.name_r)
                player_l = user_l.profile
                player_r = user_r.profile
                player_l.games_count += 1
                player_r.games_count += 1
                gamedata = Gamedata()
                # gamedata.game_id = Gamedata.objects.count()
                gamedata.save()
                # user_l.save()
                # user_r.save()
                gamedata.users.add(user_l, user_r)
                if self.result == 'L':
                    player_l.victories_count += 1
                    gamedata.winner_name = self.name_l
                    gamedata.loser_name = self.name_r
                    gamedata.winner_score = self.paddle['L'].point
                    gamedata.loser_score = self.paddle['R'].point
                else:
                    player_r.victories_count += 1
                    gamedata.winner_name = self.name_r
                    gamedata.loser_name = self.name_l
                    gamedata.winner_score = self.paddle['R'].point
                    gamedata.loser_score = self.paddle['L'].point

                player_l.save()
                player_r.save()
                gamedata.save()
                return
    
class Game(models.Model) :
    name = models.CharField(max_length=255)
    player = models.IntegerField(default=0) # A EFFACER
    player1 = models.CharField(max_length=255)
    player2 = models.CharField(max_length=255)

    def __str__(self) :
        return self.name

class Tournament(models.Model) :
    name = models.CharField(max_length=255)
    player = models.IntegerField(default=0)
    start = models.BooleanField(default=False)
    winner_nb = models.IntegerField(default=0)
    players = models.JSONField(default=list)
    player_len = models.IntegerField(default=0)
    losers = models.JSONField(default=list)
    winners = models.JSONField(default=list)
    stats_id = models.IntegerField(default=-1)

    def __str__(self) :
        return self.name