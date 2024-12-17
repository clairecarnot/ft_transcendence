import json
from rest_framework.permissions import IsAuthenticated
from channels.db import database_sync_to_async
from rest_framework.decorators import permission_classes
from channels.generic.websocket import AsyncWebsocketConsumer
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.db import transaction

from chat.models import Message, GameInvit
from chat.utils import get_username, set_status, get_User_Object_from_scope
from pong.models import Tournament
from stats.models import Tournamentsdata


# connected_users = set()

@permission_classes([IsAuthenticated])
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope["url_route"]["kwargs"]["room_name"]
        self.room_group_name = f'chat_{self.room_name}'
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        sender = await get_User_Object_from_scope(self.scope)
        self.sender_username = sender.username
        await set_status(sender, 'online')
        await self.send(
        text_data=json.dumps(
            {
                'type' : 'status',
                'connection' : 'connected',
                'sender':self.sender_username,
            })
        )
        if (self.room_group_name != 'chat_public'):
            await self.channel_layer.group_send(
                'chat_public',
            {
                'type' : 'status',
                'connection' : 'connected',
                'sender':self.sender_username,
            })   

        await self.channel_layer.group_send(
                self.room_group_name,
            {
                'type' : 'status',
                'connection' : 'connected',
                'sender':self.sender_username,
            })
            
    async def receive(self, text_data=None, bytes_data=None):
        # print("Received data:", text_data)
        data = json.loads(text_data)
        user_id = self.scope['user']['user_id']
        sender = await get_username(user_id)
        sender_username = sender.username
        if (data['type'] == 'game_invit'):
            target = data['target']
            room = data['room']
            message = sender_username + " invited you to a game"
            await self.send(
            text_data=json.dumps(
                {
                    'sender':sender_username,
                    'type': 'game_invit',
                    'target' : target,
                    'room' : room,
                }
            )
        )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'sender': sender_username,
                    'type': 'game_invit',
                    'room': room,
                    'target': target,
                },
            )
            await self.save_invit(sender=sender, target=target, message=message, status="pending", thread_name=self.room_group_name)
        if (data['type'] == 'decline_invit'):
            target = data['target']
            room = data['room']
            message = sender_username + " has declined to join your game"
            await self.send(
            text_data=json.dumps(
                {
                    'sender': sender_username,
                    'type': 'decline_invit',
                    'target' : target,
                    'message': message,
                    'room' : room,
                }
            )
        )
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'sender': sender_username,
                    'type': 'decline_invit',
                    'target' : target,
                    'message': message,
                    'room' : room,
                },
            )
        if (data['type'] == 'chat_message'):
            message = data['message']
            await self.save_message(sender=sender, message=message, thread_name=self.room_group_name)

            # messages_history = await self.get_messages_history()

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'senderUsername': sender_username,
                    'room' : 'public'
                    # 'messages_history': messages_history,
                },
            )
    async def chat_message(self, event):
        message = event['message']
        username = event['senderUsername']
        room = event['room']
        # messages_history = event['messages_history']
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'chat_message',
                    'message': message,
                    'senderUsername': username,
                    'room' : room
                }
            )
        )

    async def status(self, event):
        connection = event['connection']
        sender = event['sender']
        await self.send(
            text_data=json.dumps(
            {
                'type' : 'status',
                'connection': connection,
                'sender':sender,
            }
            )
        )    
        
    async def game_invit(self, event):
        # messages_history = event['messages_history']
        # senderUsername = event['senderUsername']
        target = event['target']
        room = event['room']
        sender_username = event['sender']
        await self.send(
            text_data=json.dumps(
                {
                    'type': "game_invit",
                    'sender': sender_username,
                    'message' : event.get('message', sender_username + " invited you to a game"),
                    'room': room,
                    'target': target,
                }
            )
        )

    async def decline_invit(self, event):
        sender_username = event['sender']
        target = event['target']
        room = event['room']
        await self.send(
            text_data=json.dumps(
                {
                    'type': "decline_invit",
                    'sender': sender_username,
                    'message' : event.get('message', sender_username + " has declined to join your game"),
                    'room': room,
                    'target': target,
                }
            )
        )

    @database_sync_to_async
    def save_message(self, sender, message, thread_name):
        Message.objects.create(sender=sender, message=message, thread_name=thread_name)

    async def disconnect(self, code):
        sender = await get_User_Object_from_scope(self.scope)
        await set_status(sender, 'offline')    
        sender_username = sender.username
        await self.send(
        text_data=json.dumps(
            {
                'type' : 'status',
                'connection' : 'disconnected',
                'sender':sender_username,
            })
        )
        if (self.room_group_name != 'chat_public'):
            await self.channel_layer.group_send(
                'chat_public',
            {
                'type' : 'status',
                'connection' : 'disconnected',
                'sender':self.sender_username,
            })
            await self.channel_layer.group_discard("chat_public", self.channel_name)

        await self.channel_layer.group_send(
                self.room_group_name,
            {
                'type' : 'status',
                'connection' : 'disconnected',
                'sender':sender_username,
            })
        # await connected_users.discard(sender_username)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    @database_sync_to_async
    def save_invit(self, sender, target, message, status, thread_name):
        GameInvit.objects.create(sender=sender, target=target, message=message, status=status, thread_name=thread_name)

    @database_sync_to_async
    def save_message(self, sender, message, thread_name):
        Message.objects.create(sender=sender, message=message, thread_name=thread_name)

@permission_classes([IsAuthenticated])
class TournamentConsumer(AsyncWebsocketConsumer):
    # flag_connect = False
    async def connect(self):
        # flag_connect = True
        # self.room_group_name = 'chat_tournament'
        self.room_name = self.scope["url_route"]["kwargs"]["game_name"]
        self.room_group_name = f'{self.room_name}'
        user_id = self.scope['user']['user_id']
        sender = await get_username(user_id)
        self.sender_username = sender.username
        
        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        # await connected_users.add(self.sender_username)

    async def receive(self, text_data=None, bytes_data=None):
        await self.start_countdown()

    async def start_countdown(self):
        # while (self.flag_connect == False):
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'tournament_message',
            })

    async def tournament_message(self, event):
        type = event['type']
        await self.send(
            text_data=json.dumps(
                {
                    'type' : type,
                }
            )
        )

    @database_sync_to_async
    def get_count(self):
        return cache.get('tournament_count', 0)

    @database_sync_to_async
    def set_count(self, count):
        cache.set('tournament_count', count, timeout=None)

    @database_sync_to_async
    @transaction.atomic
    def remove_player(self) :
        try :
            obj = Tournament.objects.select_for_update().get(name=self.room_group_name)
            user_id = self.scope['user']['user_id']
            sender = get_user_model().objects.filter(id=user_id).first()
            sender_username = sender.username
            # Tournament has begun
            if len(obj.players)  == 4:
                if obj.player == 0 :
                    return (obj.delete())
                if sender_username in obj.winners :
                    obj.winners.remove(sender_username)
                    obj.losers.append(sender_username)
                    obj.player -= 1
                    obj.save()
                    # print(f"player {sender_username} deleted from tournament {obj.name}")
                pass
            # Before Tournament begins
            else :
                # STAT CLAIRE
                tournamentdata = Tournamentsdata.objects.select_for_update().get(tournament_id=obj.stats_id)
                if tournamentdata.users.filter(id=user_id).exists():
                    tournamentdata.users.remove(sender)
                if len(obj.players) > 1:
                    obj.players.remove(sender_username)
                    obj.player_len -= 1
                    obj.save()
                    # print(f"player {sender_username} deleted from tournament {obj.name}")
                # Before Tournament begins and only one player waiting in the Tournament
                else :
                    print(f"player {sender_username} deleted from tournament {obj.name}")
                    return obj.delete()
        except Exception as e:
            print(f"Error: {str(e)}")

    async def disconnect(self, close_code):
        # Leave room group
        if close_code == 4002 or close_code == 4001:
            print("User left the page")
            await self.remove_player()
        # connected_users.discard(self.sender_username)
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
