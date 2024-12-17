from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from .serializers import UserRegistrationSerializer, UserSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.shortcuts import redirect 
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password

#***
import requests
from django.http import JsonResponse
from users.models import Profile, Code
import os
from datetime import datetime, timezone, timedelta
from django.conf import settings
from django.core.mail import send_mail
import random
import string
#***

# A FAIRE 
# - faire une fonction intermediaire avec is_authenticate											X	
# - page index s'afficher apres login 42 + cookie send to the front									X
# - delete Code 42 user when the profile has been created											X
# - handle case when 42 user already exists 														X
# - automatically refresh tokens when the access token is close to expiration		    			X
# --> date is save now refresh token when date is close to expiration + delete date when log out 	X
# - maybe access token is visible in front and send via headers to show authentication

# - check the infinite loop when redirection to one page or the other
# - infinite loop at the beginning -> erreur 502 que Garance a apres quelques temps                 X
# - handle no refresh token                                                                         X
# - make the password more secure (capital, numbers and special characters)							X
# - check the hachage of the password																X
# - change to password when user login with 42                                                      X
# - do every error messages                                                                         X
# - do avatar for profile, user can choose and change it                                            X
# - do visual bootstrap

# - handle details in the editing profile :                                                         X
# image picture saved only when save button and not before                                          X
# see what is shown in profile page when user juste create                                          X
# and what is shown when change has been made                                                       X
# - handle alert message with bootstrap                                                             X
# - password policy : is it possible de handle in the front like the email policy                   X

# - faire bon visuel navbar home                                                            X
# - mettre fond d'ecran                                                                     X

# - handle details bootstrap visual game
#   click on the button only once 
#   everything center																		X
#   error message (name of the game + alert message when game start)						X
# - bootstrap for the chat                                                                  X
#   faire petite fenetre d'invit                                                            X
# - profile page for other users (from the chat)                                            X
# - key release on the login and register page									   	        X
# - faire une page not found																X
# - mettre updateAccessToken avant chaque fetch des fichiers js (sauf auth.js)
# - enlever tous les href= du index.html                                                    X
# - faire une belle fenetre pour double auth code typing									X
# - verifier que le code est bien de 4 chiffres											    X								
# - ajouter token csrf																		X										
# - bootstrap stats 


# quand on fait un jeu et qu'on revient sur la page d'accueil en mettant precedente
# on revient sur jeu et on tape un nom de jeu message d'erreur dans la console --> web socket ouverte

# docker compose -f docker-compose.yml up --build

class CustomTokenObtainPairView(TokenObtainPairView):    
    
    def post(self, request, *args, **kwargs):
        # # Pass the request data to the serializer for validation
        serializer = self.get_serializer(data=request.data)
        # username = data.get("username")
        # password = data.get("password")

        if serializer.is_valid():
            # If valid, the login was successful, return the user information
            # return Response({"message": "Login successful", "token": serializer.response.tokens }, status=status.HTTP_200_OK)
       
        
            try :
                response = super().post(request, *args, **kwargs)
                tokens = response.data

                access_token = tokens['access']
                refresh_token = tokens['refresh']

                serializer = UserSerializer(request.user, many=False)
    
                
                res = Response()
                res.data = {'success':True}
                res.set_cookie(
                    key='access_token',
                    value=str(access_token),
                    httponly=True,		# True : can't be accessible by our js files
                    secure=True,		# True : sending the cookie only if it's https
                    samesite='Strict',	# Strict : the cookie can't be sent with cross-site requests
                    path='/',
                )
                res.set_cookie(
                    key='refresh_token',
                    value=str(refresh_token),
                    httponly=True,
                    secure=True,
                    samesite='Strict',
                    path='/',
                )
                res.data.update(tokens)
                return res
                
            except Exception as e:
                print(e)
                return JsonResponse({'status': 'error while generating token'}, status=401)
        else:
            # If invalid, return validation errors
            return JsonResponse({'status': 'error wrong username or password'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def updateTokenTime(request):
    user = get_user_model()
    access_token_lifetime = settings.SIMPLE_JWT.get("ACCESS_TOKEN_LIFETIME")
    exp_time = datetime.now(timezone.utc) + access_token_lifetime
    # print("----> EXPIRATION access token time : ", exp_time)
    user.objects.filter(username=request.user.username).update(exp_time=exp_time)
    return Response({'success':True, 'exp_time':exp_time}, status=200)

class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kargs):
        # if not request.COOKIES.get('access_token'):
        
        if request.COOKIES.get('refresh_token'):
            try:
                # print("refresh token 1")
                refresh_token = request.COOKIES.get('refresh_token')
                # print("refresh token 2")
                request.data['refresh'] = refresh_token
                # print("refresh token 3")
                response = super().post(request, *args, **kargs)
                # print("refresh token 4")
                tokens = response.data
                access_token = tokens['access']
                # print("refresh token 5")
                res = Response()
                # print("refresh token 6")
                res.data = {'refreshed':True}
                # print("refresh token 7")
                res.set_cookie (
                        key='access_token',
                        value=access_token,
                        httponly=True,
                        secure=True,
                        samesite='Strict',
                        path='/'
                )
                # print("refresh token 8")
                return res
            except:
                return Response({'error': 'while refreshing token'}, status=400)
        else:
            return Response({'error': 'no refresh token to refresh the access token'}, status=200)
        # else:
        #     return Response({'error': 'access token is still valid, no need to refresh it'}, status=200)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    try:
        res = Response()
        res.data = {'success': True}
        res.delete_cookie('access_token', path='/', samesite='None')
        res.delete_cookie('refresh_token', path='/', samesite='None')
        res.delete_cookie('access_42token', path='/', samesite='None')
        
        return res
    except:
        return Response({'success': False})

@api_view(['POST'])
@permission_classes([AllowAny])
def clear_cookie(request):
    try:
        res = Response()
        res.data = {'success': True}
        res.delete_cookie('access_token', path='/', samesite='None')
        res.delete_cookie('refresh_token', path='/', samesite='None')
        res.delete_cookie('access_42token', path='/', samesite='None')
        
        return res
    except:
        return Response({'success': False})  

# @api_view(['GET'])
# @permission_classes([AllowAny])
# def 

@api_view(['GET'])
@permission_classes([AllowAny])
def pre_is_authenticated(request):
    # print("pre_is_authenticated")
    access_token = request.COOKIES.get('access_token')
    refresh_token = request.COOKIES.get('refresh_token')
    if not access_token or not refresh_token:
        return JsonResponse({'authenticated':False})
    else:
        return JsonResponse({'authenticated':True})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def is_authenticated(request):
    return Response({'authenticated':True})

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    # print("serializer.errors : ", serializer.errors)
    return Response({'error': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    

@api_view(['POST'])
@permission_classes([AllowAny])
def userExists(request):
    # username = request.body.get('username')
    username = request.data.get('username')
    # print("userExists -> username : ", username)
    if not username:
        return Response({'error': 'in userExists, username is required.'}, status=400)
    User = get_user_model()
    user_exists = User.objects.filter(username=username).exists()
    if (user_exists):
        return Response({'exists':True})
    return Response({'exists':False})

# @csrf_exempt 
# @ensure_csrf_cookie
def authorize42(request):
    # print("--- request 42 API for login ---")
    authorize_url = 'https://api.intra.42.fr/oauth/authorize'
    client_id =  os.environ.get('CLIENT_ID')
    redirect_uri = 'https://localhost:1234/backend/authent/login42'
    response_type = 'code'
    scope = 'public'
    # print("--- > client_id : ", client_id)
    url_finale = f"{authorize_url}?client_id={client_id}&redirect_uri={redirect_uri}&response_type={response_type}&scope={scope}"
    return redirect(url_finale)

def get42User(request):
    # print("get42User 0")
    user = Code.objects.last()
    # print("get42User 1")
    # if (user == None):
    if not user:
        return JsonResponse({'error': 'no 42user in tempuser'}, status=200)
    # print("get42User 2")
    # print("user object : ", user)
    # print("get42User 3")
    # print("42 username :", user.username)
    # print("42 password :", user.password)
    # print("42 email :", user.email)
    username = user.username
    password = user.password
    
    email = user.email
    # Code.objects.all().delete()
    # print("get42User 4")	
    user.delete()
    return JsonResponse({'username': username, 'email': email, 'password': password }, status=200)


def generate42Password():
    length = 9

    # Define character sets
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    special = string.punctuation

    # Pick one character from each required set
    password = [
        random.choice(lowercase),
        random.choice(uppercase),
        random.choice(digits),
        random.choice(special)
    ]

    # Fill the rest of the password length with random characters from all sets
    all_characters = lowercase + uppercase + digits + special
    password += random.choices(all_characters, k=length - 4)

    # Shuffle to ensure randomness
    random.shuffle(password)
    password = ''.join(password)

    
    # Join list to form the final password string
    return password


def login42(request):
    # print("1")
    params = {
        'grant_type': 'authorization_code',
        'client_id': os.environ.get('CLIENT_ID'), 
        'client_secret': os.environ.get('CLIENT_SECRET'), 
        'redirect_uri': "https://localhost:1234/backend/authent/login42",
        'code': request.GET.get('code'),
    }
    # print("client_id : ", params.client_id)
    # print("client_secret : ", params.client_secret)
    # cookies = {
    #     'csrftoken': request.COOKIES.get('csrftoken')
    # }
    # token url is the 42 API endpoint to exchange an authorization code for an access token :
    token_url = 'https://api.intra.42.fr/oauth/token'

    try: 
        # sending a post request to the token url with the params as JSON data :
        response = requests.post(token_url, json=params)
        # handle errors here

        # taking the response json data :
  
        response_data = response.json()

        # saving the access token from the response :
        access_token = response_data['access_token']


        info_42user_url = 'https://api.intra.42.fr/v2/me'
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        # access_token.delete()

        response_user_info = requests.get(info_42user_url, headers=headers)
        # handle errors here
        user_data = response_user_info.json()
        user42_password = user_data['login'] + 'M' + '42' + '*'
        # user42_password = generate42Password()
        # print("login = ", user_data['login'])
        # print("email =", user_data['email'])
        # print("password 42 : ", user42_password)
    
        new_tmpuser = Code(username=user_data['login'], email=user_data['email'], password=user42_password)
        new_tmpuser.save()

        return redirect('/home')

    except Exception as e:
        print("Error : ", e)
        return redirect('/home')

# def generateCode():
#     return random.randint(0000, 9999)
def generateCode():
    return f"{random.randint(0, 9999):04}"


class doubleAuthView(TokenObtainPairView):
    permission_classes = [AllowAny]

    def post(self, request):
        # print('doubleAuth 1')
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            return JsonResponse({'status': 'error', 'message': 'Missing username or password'})
        
        # print('doubleAuth 2')
        try:
            # Step 3: Retrieve the user by username
            User = get_user_model()
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # If the user does not exist, return an error
            return JsonResponse({'status': 'error', 'message': 'Error wrong username or password'}) 

        # Step 4: Verify that the password is correct
        if check_password(password, user.password):
            # Password is correct, proceed with further authentication steps (e.g., send a one-time code)

            subject = 'Transcendence - Double Authentication'
            # print('doubleAuth 3')
            code = generateCode()
            user = get_user_model()
            user.objects.filter(username=username).update(doubleAuthCode=code)
            # user.save()
            # print('doubleAuth ----> code =', code)
            message = 'Please type this code to confirm your email : ' + str(code)
            # print('doubleAuth 5')
            user = get_user_model()
            user_instance = user.objects.filter(username=username).first() # AJOUTER PROTECTION
            # print('doubleAuth 6')
            email = user_instance.email
            # print('doubleAuth 7 : email =', email)
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                return JsonResponse({'status': 'success', 'message': 'Email sent successfully'})
            except Exception as e:
                return JsonResponse({'status': 'error', 'message': str(e)})        
        
        
        else:
            # Password is incorrect
            return JsonResponse({"status": 'error', 'message' : "Invalid password"})        

    
@api_view(['POST'])
@permission_classes([AllowAny])
def verifyCode(request):
    try:
        # print("verify code 1")
        code = request.data.get('code')
        # print("verify code 2")
        username = request.data.get('username')
        # print("verify code 3")
        user = get_user_model()
        user_instance = user.objects.filter(username=username).first()
        # print("verify code 4")
        if (user_instance.doubleAuthCode == code):
            # print("verify code 5")
            user.objects.filter(username=username).update(doubleAuthCode=None)
            # print("verify code 6")
            return JsonResponse({'status':'success'})
        return JsonResponse({'status':'error'})
    except Exception as e:
        return JsonResponse({'status':'error 2'})