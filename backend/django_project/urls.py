"""
URL configuration for django_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
# from users.views import ProfileViewSet, get_notes
# from authent.views import RegistrationViewSet, LoginViewSet, LogoutViewSet

# Ici le router va nous permettre de definir les routes
#  -> Il faut importer les ViewSet
#  -> 
# router = routers.SimpleRouter()
# router.register('register', RegistrationViewSet, basename='register')
# router.register('login', LoginViewSet, basename='login')
# router.register('logout', LogoutViewSet, basename='logout')

# router_1 = routers.SimpleRouter()
# router_1.register('profile', ProfileViewSet, basename='profile')

# router_1.register('note', get_notes, basename='note')


# router_2 = routers.SimpleRouter()
# # # Start game
# # # balle_position_recup_et_update_en_back
# # # paddle1_update_position
# # # paddle2_update_position
# router_2.register('game', GameStartedViewSet, basename='game_started')

urlpatterns = [
    # path("", include('user_auth_app.urls')),
	# path("", include('main.urls')),
	path("backend/authent/", include("authent.urls")),
	path("backend/users/", include("users.urls")),
	# path("backend/users/", include(router.urls)),
	# path("backend/authent/", include(router.urls)),
	# path("backend/users/", include(router_1.urls)), 
	path("backend/chat/", include("chat.urls")), 
	path("backend/pong/", include("pong.urls")),
	path("backend/stats/", include("stats.urls")),
    path('admin/', admin.site.urls),
]
