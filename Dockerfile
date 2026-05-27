# Stage 1: Build React frontend
# Use the host's native platform so npm ci/build run without QEMU emulation.
# The output (dist/) is pure JS/CSS/HTML — architecture-independent.
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --prefer-offline
COPY frontend/ .
# VITE_API_URL left unset — defaults to /api (proxied by nginx inside container)
RUN npm run build

# Stage 2: Runtime (nginx + Python)
FROM python:3.11-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx \
 && rm -rf /var/lib/apt/lists/*

# Python backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/main.py .

# Built frontend
COPY --from=frontend-builder /build/dist /var/www/html

# nginx config (proxies /api/* to uvicorn on :5050)
COPY nginx.conf /etc/nginx/sites-enabled/default
RUN rm -f /etc/nginx/sites-enabled/*.conf 2>/dev/null || true

# Startup script
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# /data is the HA-managed persistent storage volume
VOLUME ["/data"]

EXPOSE 8099

CMD ["/run.sh"]
