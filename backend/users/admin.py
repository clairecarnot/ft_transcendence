from django.contrib import admin
from .models import User, Profile, Code

# Register your models here.
class CustomUserAdmin(admin.ModelAdmin):
	list_display = ('id', 'username', 'email', 'password')
	search_fields = ('username', 'email')

admin.site.register(User, CustomUserAdmin)
# admin.site.register(Note)
admin.site.register(Profile)
admin.site.register(Code)