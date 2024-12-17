<!-- Commandes utiles -->

<!-- Pour avoir tous les memes dependances -->
pip freeze > requirements.txt
pip install -r requirements.txt

<!-- Pour creer une app dans django -->
python manage.py startapp <nom_de_app>

<!-- Create admin user -->
<!-- username: chief -->
<!-- pwd: adminpass -->
docker-compose exec backend python manage.py createsuperuser

<!-- Docker : build, update, stop, and delete all -->
docker compose build --no-cache
docker compose up -d --build
docker compose down
docker system prune -af

si pb migrations :
docker exec -it backend bash

enlever tous les fichier du dossier migrations de l app qui pose pb , sauf le fichier init.py (sans chiffre)

puis dans le container faire : python manage.py makemigrations
puis : python manage.py migrate

=> Si marche pas, revenir comme avt, faire les deux commandes puis refaire les modif dans le back puis de nouveau les 2 cmd

<!-- websockets dans le Terminal -->
pip3 install httpx
pip install websockets==13.1

https://localhost:1234/game/

<!-- Posgres -->
docker exec -it postgres psql -U postgres  -W postgres => Pour rentrer dans docker postgres
\l => list les database
\c <database> => switch to a database
\dt => list les tables
\d <nom de la table> => donne la structure de la table

<!-- To create manually some Tournaments for the stats -->
docker exec -it backend bash
python manage.py shell
>>> from stats.models import Tournamentsdata
>>> from stats.models import User
>>> ophelie = User.objects.get(username="ophelie")
>>> antoine = User.objects.get(username="antoine")
>>> matthieu = User.objects.get(username="matthieu")
>>> hermine = User.objects.get(username="hermine")
>>> tournament4 = Tournamentsdata.objects.create(winner_name="matthieu")
>>> tournament4.users.add(hermine, matthieu)
>>> tournament3 = Tournamentsdata.objects.create(winner_name="hermine")
>>> tournament3.users.add(hermine, ophelie)
>>> tournament2 = Tournamentsdata.objects.create(winner_name="hermine")
>>> tournament2.users.add(hermine, ophelie)
>>> tournament1 = Tournamentsdata.objects.create(winner_name="hermine")
>>> tournament1.users.add(hermine, antoine)
>>> hermine.profile.tournaments_count = 4
>>> hermine.profile.won_tournaments_count = 3
>>> antoine.profile.tournaments_count = 1
>>> matthieu.profile.tournaments_count = 1
>>> ophelie.profile.tournaments_count = 2
>>> matthieu.profile.won_tournaments_count = 1
>>> hermine.save()
>>> ophelie.save()
>>> matthieu.save()
>>> antoine.save()

PBS:
- double click sur login?

