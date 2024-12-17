from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    logout,
	clear_cookie,
    is_authenticated,
	pre_is_authenticated,
    register,
    authorize42,
    login42,
    get42User,
    userExists,
	updateTokenTime,
	doubleAuthView,
	verifyCode,
)

urlpatterns = [
	path("login/", CustomTokenObtainPairView.as_view(), name="login"),
	path("authorize42/", authorize42, name="authorize42"),
	path("login42/", login42, name="login42"),
	path("get42User/", get42User, name="get42User"),
	path("userExists/", userExists, name="userExists"),
	path("refreshToken/", CustomTokenRefreshView.as_view(), name="token_refresh"),
	path("updateTokenTime/", updateTokenTime, name="updateTokenTime"),
	path("logout/", logout, name="logout"),
	path("clearCookie/", clear_cookie, name="clearCookie"),
	path("preAuthenticated/", pre_is_authenticated, name="pre_is_authenticated"),
	path("authenticated/", is_authenticated, name="is_authenticated"),
	path("doubleAuth/", doubleAuthView.as_view(), name="double_authentication"),
	path("verifyCode/", verifyCode, name="verifyCode"),
	path("register/", register, name="register")
]