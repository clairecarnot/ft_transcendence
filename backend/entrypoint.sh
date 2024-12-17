#!/bin/sh

# HOST_IP=$(hostname -I | awk '{print $1}')
# export HOST_IP

# echo "HOST_IP === "
# echo $HOST_IP

set -x

echo "Apply database migrations"
python manage.py makemigrations
python manage.py migrate

# exec "$@"

python manage.py createsuperuser --noinput
# daphne -e ssl:443:privateKey=key.pem:certKey=crt.pem django_project.asgi:application    #enables HTTP/2 Support

# a effacer => unniquement pour tester pendant devellopement pong
python manage.py init_local_dev

python manage.py truncate --apps pong --models Game Tournament

python manage.py runserver 0.0.0.0:8000
daphne -b 0.0.0.0 -p 8000 django_project.asgi:application                               #point daphne to django_project.ascgi.application