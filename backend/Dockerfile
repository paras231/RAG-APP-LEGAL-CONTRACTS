FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# CMD (not ENTRYPOINT) so docker-compose's `command:` override for local
# dev (hot reload) still fully replaces this rather than being appended to
# it. Render and other plain `docker run`/`docker build` deployments — which
# don't override the command — get this: run migrations, then serve on
# $PORT (Render injects this; defaults to 8000 for a plain `docker run`).
CMD ["./docker-entrypoint.sh"]
