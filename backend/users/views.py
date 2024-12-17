from django.shortcuts import render
# from .serializers import ProfileSerialize
from .models import User
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.response import Response

from rest_framework.response import Response
from django.contrib.auth.models import AbstractUser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Profile
from .serializers import ProfileSerializer

from rest_framework import status
import re
import os
from django.conf import settings

from django.http import JsonResponse

# from rest_framework import viewsets, generics
# from rest_framework.exceptions import PermissionDenied

# from .models import Profile


# Create your views here.
# class ProfileAPIView(APIView):
# 	def get(self, *args, **kwargs):
# 		users = User.objects.all()
# 		serializer = ProfileSerialize(users, many=True)
# 		return Response(serializer.data)

# class ProfileViewSet(ReadOnlyModelViewSet):
# 	serializer_class = ProfileSerialize

# 	def	get_queryset(self):
# 		if self.request.user.is_authenticated:
# 			# user = User.objects.filter(username=self.request.user.username)
# 			# # return HttpResponse(f"Bienvenue, {request.user.username}!")
# 			# return Response(serializer_class.data)
# 			return User.objects.filter(username=self.request.user.username)
# 		return User.objects.all()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    profile = Profile.objects.get(user=request.user)
    # profile = Profile.objects.create(
    # 	user=request.user,
    # 	bio="",
    # 	logged_in=True,
    # 	status='active',
    # 	auth_with_42=True
    # )
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    # print("update profile 0")
    username = request.data.get('username')
    
    try:
        # Get the User instance using the username
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    # print("update profile 1")
    # Get the Profile instance related to the user
    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
    # print("update profile 2")
    # Retrieve data from the request
    data = request.data
    # print("update profile 3")
    # Update fields if provided
    if 'pseudo' in data:
        new_pseudo = data['pseudo']

        if not (3 <= len(new_pseudo) <= 20):
            return JsonResponse({"error": "Pseudo has to be between 3 and 20 characters"})
    
        # Check if a profile with the same pseudo exists (excluding the current profile)
        if Profile.objects.filter(pseudo=new_pseudo).exclude(id=profile.id).exists():
            return JsonResponse({"error": "Pseudo already exists"})
        if not re.match(r'^[a-zA-Z0-9]+$', new_pseudo):
            return JsonResponse({"error": "Pseudo must contain only letters and digits"})

        # If no duplicate is found, update the pseudo
        profile.pseudo = new_pseudo
        profile.save()        

        profile.pseudo = data['pseudo']
    
    
    if 'status' in data:
        profile.status = data['status']
    if 'bio' in data:
        new_bio = data['bio']
        if not (0 <= len(new_bio) <= 100):
            return JsonResponse({"error": "Bio can't be longer than 100 characters"})
        if not re.match(r'^[a-zA-Z0-9 ]+$', new_bio):
            return JsonResponse({"error": "Bio must contain only letters, digits, and spaces"})

        profile.bio = data['bio']

    # print("update profile 4")
    # Save changes
    profile.save()
    # print("update profile 5")
    # Return the updated profile data in the response
    return Response({
        "message": "Profile updated successfully",
        "pseudo": profile.pseudo,
        "status": profile.status,
        "bio": profile.bio,
    }, status=status.HTTP_200_OK)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile_pictures(request):
    profile_pics_path = 'media/profile_pics/'
    image_files = os.listdir(profile_pics_path)
    image_urls = [f"{settings.MEDIA_URL}profile_pics/{img}" for img in image_files]
    return Response(image_urls)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_picture(request):
    user = request.user
    profile = user.profile
    new_image = request.data.get('image')

    if new_image:
        profile.image = new_image.replace(settings.MEDIA_URL, '')  # Save relative path
        profile.save()
        return Response({"success": "Profile picture updated."}, status=200)
    return Response({"error": "Invalid image."}, status=400)

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def get_notes(request):
# 	user = request.user
# 	notes = Note.objects.filter(owner=user)
# 	serializer = NoteSerializer(notes, many=True)
# 	return Response(serializer.data)

# @api_view(['POST'])
# @permission_classes([IsAuthenticated])
# def update_stats(request):
#     print("================== UPDATE STATS ==================")
#     winner_name = request.data.get('winner')
#     loser_name = request.data.get('loser')
#     print(f"winner = {winner_name}")   
#     print(f"loser = {loser_name}")   
#     if not winner_name or not loser_name:
#         return Response({"error": "Missing winner amd/or loser field"}, status=400)
    
#     winner = Profile.objects.get(user__username=winner_name)
#     loser = Profile.objects.get(user__username=loser_name)

#     winner.games_count += 1
#     loser.games_count += 1
#     winner.victories_count += 1
#     winner.save()
#     loser.save()

#     return Response({"message": "Stats updated successfully"}, status=200)