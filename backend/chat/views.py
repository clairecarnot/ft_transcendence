from django.http import HttpResponse
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse

import json
from chat.models import Message, GameInvit
from users.models import Profile
from users.serializers import ProfileSerializer
from chat.utils import CustomSerializer, get_id, get_user_by_username
from .serializers import StatusSerializer

async def getUserId(request, username_target, username_user):
    username_t =  await get_id(username_target);
    username_u =  await get_id(username_user);
    other_user_id = username_t.id
    current_user_id = username_u.id
    room_name = (
        f'{current_user_id}_{other_user_id}'
        if int(current_user_id) > int(other_user_id)
        else f'{other_user_id}_{current_user_id}'
    )
    return HttpResponse(room_name)

# @api_view(['GET'])
@permission_classes([IsAuthenticated])
async def getCurrentId(request, username_target):
    # print("getCurrentId <----")
    try :        
        user = await get_user_by_username(username_target)
        id = user.id
        return JsonResponse({'status' : 'success', 'id' : id})
    except :
        return JsonResponse({'status' : 'error'})
    # return HttpResponse(id)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def show_profile(request, username_target):
    profile = Profile.objects.get(user__username=username_target)
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def getOnlineStatus(request, username_target) :
    User = get_user_model()
    user = User.objects.get(username=username_target)
    status = user.status
    return HttpResponse(status)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def block_user(request):
    user_blocked = request.data.get('username')
    if not user_blocked in request.user.users_blocked:
        user = request.user
        user.users_blocked.append(user_blocked)
        user.save()
    return JsonResponse({'success':True, 'message': user_blocked + ' has been blocked'})
# return JsonResponse({'success':False, 'message':'user has been blocked'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unblock_user(request):
    user_blocked = request.data.get('username')
    if user_blocked in request.user.users_blocked:
        user = request.user
        user.users_blocked.remove(user_blocked)
        user.save()
    return JsonResponse({'success':True, 'message': user_blocked + ' has been unblocked'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_invit_friend(request):
    # print("Entering send_invit_friend : ")
    user = request.user
    friend = request.data.get('username')
    User = get_user_model()
    friend_user = User.objects.get(username=friend)
    if not friend in user.invit_send_friends and not user.username in friend_user.invit_send_friends:
        user.invit_send_friends.append(friend)
        friend_user.invit_received_friends.append(user.username)
        user.save()
        friend_user.save()
        return JsonResponse({'success':True, 'message': 'Invitation sent'})
    return JsonResponse({'success':False, 'message': 'Invitation already sent'})
   

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_invit_friend(request):
    # print("Entering add_friend : ")
    user = request.user
    # print("User : ", user)
    friend = request.data.get('username')
    # print("Friend : ", friend)
    User = get_user_model()
    friend_user = User.objects.get(username=friend)
    if not friend in user.users_friends:
        user.users_friends.append(friend)
        friend_user.users_friends.append(user.username)
        user.invit_received_friends.remove(friend)
        friend_user.invit_send_friends.remove(user.username)
        user.save()
        friend_user.save()
    return JsonResponse({'success': True, 'message': 'Friend added'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_friend(request):
    user = request.user
    friend = request.data.get('username')
    User = get_user_model()
    friend_user = User.objects.get(username=friend)
	# print("REMOVING FRIEND FROM BACKEND")
    if friend in user.users_friends:
        user.users_friends.remove(friend)
    if user.username in friend_user.users_friends:
        friend_user.users_friends.remove(user.username)
    if friend in user.invit_send_friends:
        user.invit_send_friends.remove(friend)
    if friend in user.invit_received_friends:
        user.invit_received_friends.remove(friend)
    if user.username in friend_user.invit_send_friends:
        friend_user.invit_send_friends.remove(user.username)
    if user.username in friend_user.invit_received_friends: 
        friend_user.invit_received_friends.remove(user.username)
    user.save()
    friend_user.save()
    return JsonResponse({'success':True, 'message': 'Friend removed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checkFriend(request, username_target):
    if username_target in request.user.users_friends:
        return JsonResponse({'status': 'is_friend'})
    if username_target in request.user.invit_send_friends:
        return JsonResponse({'status': 'invit_send'})
    if username_target in request.user.invit_received_friends:
        return JsonResponse({'status': 'invit_received'})
    return JsonResponse({'status': 'not_friend'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checkStatus(request, username_target):
    user = get_user_model().objects.get(username=request.user.username)
    # status = user.users_blocked.get(username_target)
    if username_target in user.users_blocked:
    # if (status == 'blocked'):
        return JsonResponse({'status': 'success', 'status': 'blocked'})
    return JsonResponse({'status': 'success', 'status': 'ok'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rmvInvit(request):
    username_target = request.data.get('target')
    invitPending = GameInvit.objects.filter(target=username_target)
    if invitPending.exists():  # Check if there are any matching objects
        # print("Deleting invitations from the database")
        invitPending.delete()  # This will delete all objects in the queryset
        return JsonResponse({'status': 'success', 'message': 'invit got deleted from database'})
    return JsonResponse({'status': 'success', 'message': 'no invitation to delete'})

def get_messages_history(room_group_name):
    custom_serializers = CustomSerializer()
    messages_history = custom_serializers.serialize(
        Message.objects.select_related().filter(thread_name=room_group_name),
        fields=(
            'sender__pk',
            'sender__username',
            # 'sender__last_name',
            # 'sender__first_name',
            'sender__email',
            # 'sender__last_login',
            # 'sender__is_staff',
            'sender__is_active',
            'sender__date_joined',
            'sender__is_superuser',
            'message',
            'thread_name',
            'timestamp',
        ),
    )
    return messages_history

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users_history(request, room_name):
    User = get_user_model()
    current_username = request.user.username
    users = (list)(User.objects.values('username'))
    filtered_users = [user for user in users if (user['username'] != current_username and user['username'] != 'user')]

    invit_send_friend = (list)(User.objects.get(username=current_username).invit_send_friends)
    invit_received_friend = (list)(User.objects.get(username=current_username).invit_received_friends)
    friends_list = (list)(User.objects.get(username=current_username).users_friends)

    room_group_name = f'chat_{room_name}'
    messages_history = get_messages_history(room_group_name)
    invit_history = get_invit_object(room_group_name)
    # print ("Content invit history")
    # print (invit_history)
    # print (type (invit_history))
    if (invit_history == '[]'):
        return JsonResponse({'users' : filtered_users, 'invit_send_friend' : invit_send_friend, 'invit_receive_friend' : invit_received_friend, 'friends' : friends_list, 'messages_history' : messages_history, 'invit_history' : 0})
    return JsonResponse({'users' : filtered_users, 'invit_send_friend' : invit_send_friend, 'invit_receive_friend' : invit_received_friend, 'friends' : friends_list, 'messages_history' : messages_history, 'invit_history' : invit_history})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_status_friend(request, friend):
    profile = Profile.objects.get(user__username=friend)
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_blocked_users(request):
    users = get_user_model().objects.get(username=request.user.username)
    users_blocked = users.users_blocked;
    return JsonResponse({'users_blocked' : users_blocked})

def get_invit_object(room_group_name):
    custom_serializers = CustomSerializer()
    invit_history = custom_serializers.serialize(
        GameInvit.objects.select_related().filter(thread_name=room_group_name),
        fields=(
            'sender__pk',
            'sender__username',
            # 'sender__last_name',
            # 'sender__first_name',
            'sender__email',
            # 'sender__last_login',
            # 'sender__is_staff',
            'sender__is_active',
            'sender__date_joined',
            'sender__is_superuser',
            'target',
            'message',
            'status',
            'thread_name',
        ),
    )
    return invit_history

# faire getter setter status pending / decline / accepted
# faire ne sorte qu'une invit apr joueur puisse etre active ou remplacer