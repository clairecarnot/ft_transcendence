from django.urls import path

from .views import global_stats, personal_stats

urlpatterns = [
	path("", global_stats),
	path("perso/", personal_stats),
]