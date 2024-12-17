from django.core.serializers.json import Serializer
from channels.db import database_sync_to_async
from django.core.serializers import serialize
from django.contrib.auth import get_user_model

JSON_ALLOWED_OBJECTS = (dict, list, tuple, str, int, bool)


async def get_User_Object_from_scope(scope) :
    user_id = scope['user']['user_id']
    sender = await get_username(user_id)
    return sender

async def set_status(sender, status) :
    sender.status = status
    await database_sync_to_async(sender.save)()

@database_sync_to_async
def get_user_by_username(username):
    return get_user_model().objects.get(username=username)

@database_sync_to_async
def get_username(user_id):
    return get_user_model().objects.filter(id=user_id).first()


@database_sync_to_async
def get_id(username):
    return get_user_model().objects.filter(username=username).first()


class CustomSerializer(Serializer):
    def end_object(self, obj):
        for field in self.selected_fields:
            if field == 'pk':
                continue
            elif field in self._current.keys():
                continue
            else:
                try:
                    if '__' in field:
                        fields = field.split('__')
                        value = obj
                        for f in fields:
                            value = getattr(value, f)
                        if value != obj and isinstance(value, JSON_ALLOWED_OBJECTS) or value == None:
                            self._current[field] = value

                except AttributeError:
                    pass
        super(CustomSerializer, self).end_object(obj)