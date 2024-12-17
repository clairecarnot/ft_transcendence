from rest_framework import serializers
from django.contrib.auth import authenticate
import re
from rest_framework.response import Response
# from django.contrib.auth import get_user_model

from users.models import User

# User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer): 
    password = serializers.CharField(write_only=True, required=True)
    password_confirmation = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirmation']  # Include all relevant fields

    def validate(self, data):
        print("Checking password")
        if len(data['password']) < 9:
            print("Password must be at least 9 characters long")
            # return Response("Password must be at least 9 characters long")
            raise serializers.ValidationError("Password must be at least 9 characters long")
        if not re.search(r'[a-z]', data['password']):
            raise serializers.ValidationError("Password must contain at least one lowercase letter")        
        if not re.search(r'[A-Z]', data['password']):
            raise serializers.ValidationError("Password must contain at least one uppercase letter")
        if not re.search(r'\d', data['password']):
            raise serializers.ValidationError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', data['password']):
            raise serializers.ValidationError("Password must contain at least one special character")
		# Ensure that password and password_confirmation match
        try:
            if data['password'] != data['password_confirmation']:
                return serializers.ValidationError("Passwords do not match")
			# raise serializers.ValidationError("Passwords do not match.")
            return data
        except:
            return serializers.ValidationError("Error")

    def create(self, validated_data):
        try:
		
		# Remove password_confirmation from validated_data before saving
            validated_data.pop('password_confirmation')

		# Create the user
		# user = User(
		#     username=validated_data['username'],
		#     email=validated_data.get('email')
		# )
		# user.set_password(validated_data['password'])
		# user.save()
            user = User.objects.create_user(**validated_data)
            return user
        except:
            return serializers.ValidationError("Error")

class UserRegistration42Serializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']
    # def create(self):
        
        # user = User.objects.create_user(login=user_login, password=password, email=email)
        # return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username']