from django.contrib.auth.models import AbstractUser, User
from django.db import models

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.postgres.fields import JSONField

# Create your models here.
class User(AbstractUser):
    doubleAuthCode = models.CharField(max_length=255,blank=True, null=True)
    # starting_time = models.DateTimeField(blank=True, null=True)
    exp_time = models.DateTimeField(blank=True, null=True)
	# users_blocked = models.JSONField(default=dict, blank=True, null=True)
    users_blocked = models.JSONField(default=list, blank=True, null=True)
    invit_send_friends = models.JSONField(default=list, blank=True, null=True)
    invit_received_friends = models.JSONField(default=list, blank=True, null=True)
    users_friends = models.JSONField(default=list, blank=True, null=True)
    status = models.CharField(
    max_length=10,
    choices=[('online', 'Online'), ('offline', 'Offline'), ('busy', 'Busy')],
    default='offline'
    )

	# pass
	# pass take all the possible parameters of User
    # name = models.CharField(max_length=255)
    # email = models.EmailField(unique=True)
    # description = models.TextField('Description', max_length=600, default='', blank=True)

    # def __str__(self):
    #     return self.username

class Profile(models.Model):
    user = models.OneToOneField(User, related_name="profile", on_delete=models.CASCADE)
    pseudo = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=255, blank=True, default='none')
    bio = models.TextField(max_length=255, blank=True, default='none')
    image = models.ImageField(upload_to='profile_pics', default='profile_pics/default.jpg')
    games_count = models.IntegerField(default=0)
    victories_count = models.IntegerField(default=0)
    tournaments_count = models.IntegerField(default=0)
    won_tournaments_count = models.IntegerField(default=0)

    def save(self, *args, **kwargs):
        # Set the pseudo to the user's username if pseudo is empty upon profile creation
        if not self.pseudo:
            self.pseudo = self.user.username
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user} Profile' 


# class Note(models.Model):
# 	description = models.CharField(max_length=255)
# 	owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='note')
    # login = models.CharField(max_length=255)
    # password = models.CharField(max_length=255)
    # email = models.EmailField()


# tempUser
class Code(models.Model):
    username = models.CharField(max_length=255,blank=True, null=True)
    email = models.CharField(max_length=255,blank=True, null=True)
    password = models.CharField(max_length=255,blank=True, null=True)
    code = models.CharField(max_length=255,blank=True, null=True)