FROM nginx:stable-alpine

RUN mkdir -p /etc/nginx/ssl && \
	chmod 777 /etc/nginx/ssl/

RUN apk add openssl && \
	openssl \
		req \
		-x509 \
		-nodes \
		-keyout /etc/nginx/ssl/transcendence.key \
		-out /etc/nginx/ssl/transcendence.crt \
		-subj \
		"/C=FR/ST=IDF/L=Paris/O=42/OU=42/CN=localhost"


EXPOSE 1234
EXPOSE 5678

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

COPY ../frontend/index.html /etc/nginx/index.html

COPY ../frontend/static/ /etc/nginx/static/

COPY ../backend/media/ /etc/nginx/media/

# RUN chmod -R 755 /usr/share/nginx/html

# Already set up in image
# CMD [ "nginx", "-g", "daemon off;" ]