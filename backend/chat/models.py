from django.contrib.auth import get_user_model
from django.db import models


class Message(models.Model):
    sender = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    thread_name = models.CharField(null=True, blank=True, max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f'{self.sender.username}-{self.thread_name}' if self.sender else f'{self.message}-{self.thread_name}'
    
class GameInvit(models.Model):
    sender = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, null=True, blank=True, related_name='sent_game_invites')
    target = models.TextField(null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    status = models.TextField(null=True, blank=True)
    thread_name = models.CharField(null=True, blank=True, max_length=200)
 

    def __str__(self) -> str:
        return f'{self.sender.username}-{self.thread_name}' if self.sender else f'{self.message}-{self.thread_name}'
