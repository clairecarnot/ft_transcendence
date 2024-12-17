from rest_framework import serializers
from users.models import User
# from django.db import models
from rest_framework.serializers import ModelSerializer


class StatusSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = ["users_blocked"]

