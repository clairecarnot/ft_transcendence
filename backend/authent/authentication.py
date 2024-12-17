from rest_framework_simplejwt.authentication import JWTAuthentication
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from channels.db import database_sync_to_async

class CookiesJWTAuthentication(JWTAuthentication):
	def authenticate(self, request):
		access_token = request.COOKIES.get('access_token')

		if not access_token:
			return None
		validated_token = self.get_validated_token(access_token)

		try:
			user = self.get_user(validated_token)
		except:
			return None
		
		return (user, validated_token)
	

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
    
        token = self.get_token_from_scope(scope)
        if token != None:
            user = await self.get_user_from_token(token) 
            if user:
                scope['user'] = user

            else:
                scope['error'] = 'Invalid token'

        if token == None:
            scope['error'] = 'provide an auth token'    
    
                
        return await super().__call__(scope, receive, send)

    def get_token_from_scope(self, scope):
        headers = dict(scope.get("headers", []))

        cookie_header = headers.get(b'cookie', b'').decode('utf-8')

        # Parse the cookies to find the access token
        cookies = dict(cookie.split('=') for cookie in cookie_header.split('; '))
        access_token = cookies.get('access_token', None)

        return access_token
        
    @database_sync_to_async
    def get_user_from_token(self, token):
            try:
                access_token = AccessToken(token)
                return access_token
            except:
                return None