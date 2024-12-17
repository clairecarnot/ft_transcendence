from django.core.management.base import BaseCommand
# from django.contrib.auth import get_user_model

# from pong.models import Game

# # UserModel = get_user_model()

# GAME = [
#     {
#         'name': 'Claire_vs_Garance',
#         'height_w': 100.00,
#         'width_w': 100.00,
#         'active': True,
#         'balls': [
#             {
#                 'radius': 1.00,
#                 'pos_center_x': 50.00,
#                 'pos_center_y': 50.00,
#                 'angle': 45.00,
#                 'velocity': 10.00,
#                 'v_x': 2,
#                 'v_y': 2,
#             },
#         ],
#         'paddles': [
#             {
#                 'length' : 4.00,
#                 'width' : 1.00,
#                 'pos_top_x' : 1,
#                 'pos_top_y' : 48,
#             },
#             {
#                 'length' : 4.00,
#                 'width' : 1.00,
#                 'pos_top_x' : 99,
#                 'pos_top_y' : 48,
#             },
#         ]
#     },
#     {
#         'name': 'ClaireF_vs_GaranceF',
#         'height_w': 46.00,
#         'width_w': 46.00,
#         'active': False,
#         'balls': [
#             {
#                 'radius': 18.00,
#                 'pos_center_x': 508.00,
#                 'pos_center_y': 508.00,
#                 'angle': 458.00,
#                 'velocity': 108.00,
#                 'v_x': 28,
#                 'v_y': 28,
#             },
#         ],
#         'paddles': [
#             {
#                 'length' : 48.00,
#                 'width' : 18.00,
#                 'pos_top_x' : 18,
#                 'pos_top_y' : 488,
#             },
#             {
#                 'length' : 48.00,
#                 'width' : 18.00,
#                 'pos_top_x' : 998,
#                 'pos_top_y' : 488,
#             },
#         ]
#     },
# ]

# # ADMIN_ID = 'admin-oc'
# # ADMIN_PASSWORD = 'password-oc'


class Command(BaseCommand):

#     help = 'Initialize project for local development'

    def handle(self, *args, **options):
        pass
#         self.stdout.write(self.style.MIGRATE_HEADING(self.help))

#         Game.objects.all().delete()

#         for data_game in GAME:
#             game = Game.objects.create(name=data_game['name'],
#                                                active=data_game['active'],
#                                                height_w=data_game['height_w'],
#                                                width_w=data_game['width_w'])
#             for data_ball in data_game['balls']:
#                 ball = game.balls.create(radius=data_ball['radius'],
#                                                    pos_center_x=data_ball['pos_center_x'],
#                                                    pos_center_y=data_ball['pos_center_y'],
#                                                    angle=data_ball['angle'],
#                                                    velocity=data_ball['velocity'],
#                                                    v_x=data_ball['v_x'],
#                                                    v_y=data_ball['v_y'],)
#             for data_paddle in data_game['paddles']:
#                 game.paddles.create(length=data_paddle['length'],
#                                         width=data_paddle['width'],
#                                         pos_top_x=data_paddle['pos_top_x'],
#                                         pos_top_y=data_paddle['pos_top_y'])

#         # UserModel.objects.create_superuser(ADMIN_ID, 'admin@oc.drf', ADMIN_PASSWORD)

#         self.stdout.write(self.style.SUCCESS("All Done !"))
