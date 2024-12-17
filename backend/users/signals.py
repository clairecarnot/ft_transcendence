from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profile, User
# from django.contrib.auth.models import get_user_model

# User = get_user_model()

# create a profile automatically for each user
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

# save the profile automatically for each user
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    try:
        instance.profile.save()
    except Profile.DoesNotExist:
        Profile.objects.create(user=instance)