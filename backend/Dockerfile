FROM python:3.12.1-slim-bullseye

# Set environment variables
ENV PIP_DISABLE_PIP_VERSION_CHECK 1
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

RUN chmod 777 /app

ENV PIP_DISABLE_PIP_VERSION_CHECK=1
# prevent Python from writing .pyc files 
ENV PYTHONDONTWRITEBYTECODE=1
# ensure Python output is sent directly to the terminal without buffering
ENV PYTHONUNBUFFERED=1

# ENV HOST_IP=${hostname -I | awk '{print $1}'}
# RUN export HOST_IP=$(hostname -I | awk '{print $1}')
# RUN echo "export HOST_IP=`(hostname -I | awk '{print $1}')` >> /envfile
# RUN echo "export HOST_IP=`(hostname -I | awk '{print $1}')`" >> /envfile
# RUN . /envfile; echo $HOST_IP

RUN pip install --upgrade pip
# daphne HTTP/2 Support
RUN pip install -U "Twisted[tls,http2]"               

# --
# Pillow = Python Imaging Library (PIL)
RUN python -m pip install Pillow

# 2FA
RUN pip install django-otp django-two-factor-auth
RUN pip install pyotp

# 42 OAuth
RUN pip install requests
RUN pip install python-decouple
# RUN pip install django-truncate


# COPY ./requirements.txt app/requirements.txt
# RUN pip install -r app/requirements.txt
COPY ./requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# COPY ../../.env /app/.env 

COPY . /app
COPY ./.env /app/.env
# ARG ENV_FILE
# COPY ${ENV_FILE} /app/.env

# RUN ls -la /app 

RUN mkdir -p /app/static

RUN mkdir -p /app/staticfiles


# collects static files from each app's static/ directory and places them into the STATIC_ROOT
RUN python manage.py collectstatic --noinput

ENTRYPOINT ["/entrypoint.sh"]