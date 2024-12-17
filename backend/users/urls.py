from django.urls import path, include
from rest_framework.routers import DefaultRouter
# from .views import ProfileAPIView

# from .views import ProfileViewSet
# simplifies URL config by automatically generating standard routes for a registered viewset
router = DefaultRouter()

# router.register(r"profile", ProfileViewSet, basename="profile")

from .views import user_profile, update_profile, get_profile_pictures, update_profile_picture

urlpatterns = [
    # path("register", views.register, name="register"),
	path("", include(router.urls)),
	# path("profile/", ProfileAPIView.as_view(), name="profile"),
	# path("notes/", get_notes),
    path("profile/", user_profile),
    path("updateprofile/", update_profile),
    path("get_profile_pictures/", get_profile_pictures),
    path("update_profile_picture/", update_profile_picture),
]