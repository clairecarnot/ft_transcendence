from django.urls import path

from . import views

urlpatterns = [
    path("<str:username_target>" + "_" +  "<str:username_user>" + "/", views.getUserId, name="UserId"),
    path("profile/<str:username_target>", views.show_profile, name="show_profile"),
    path("block/", views.block_user, name="block"),
    path("unblock/", views.unblock_user, name="unblock"),
	path("sendinvitfriend/", views.send_invit_friend, name="invit"),
	path("acceptinvitfriend/", views.accept_invit_friend, name="accept"),
	path("getstatusfriend/<str:friend>", views.get_status_friend, name="statusFriend"),
    path("removefriend/", views.remove_friend, name="remove"),
    path("check/<str:username_target>", views.checkStatus, name="status"),
	path("checkfriend/<str:username_target>", views.checkFriend, name="checkFriend"),
    path("status/invit/", views.rmvInvit, name="statusInvit"),
    path("users/<str:room_name>", views.get_users_history, name="users_history"),
    path("list/", views.get_blocked_users, name="list"),
    path("statusIcone/<str:username_target>", views.getOnlineStatus, name="OnlineStatus"),
    path("currentId/<str:username_target>", views.getCurrentId, name="CurrentId")
]