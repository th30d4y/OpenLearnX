# Multi-stage Dockerfile for OpenLearnX Platform
FROM node:18-alpine AS frontend-builder

# Build Frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

COPY frontend/ ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

# Main Python image with everything
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV TF_CPP_MIN_LOG_LEVEL=2
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install system dependencies (Python + Node.js)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libpq-dev \
        curl \
        wget \
        ca-certificates \
        gnupg \
        nginx \
        supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create necessary directories
RUN mkdir -p /var/log/supervisor \
    && mkdir -p /app/logs \
    && mkdir -p /app/uploads

# Configure Nginx
COPY <<EOF /etc/nginx/sites-available/openlearnx
server {
    listen 80;
    server_name localhost;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
EOF

RUN ln -s /etc/nginx/sites-available/openlearnx /etc/nginx/sites-enabled/ \
    && rm /etc/nginx/sites-enabled/default

# Configure Supervisor
COPY <<EOF /etc/supervisor/conf.d/openlearnx.conf
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/nginx.err.log
stdout_logfile=/var/log/supervisor/nginx.out.log

[program:backend]
command=gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 main:app
directory=/app/backend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
environment=PYTHONPATH="/app/backend"

[program:frontend]
command=node server.js
directory=/app/frontend
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
environment=PORT="3000",HOSTNAME="127.0.0.1"
EOF

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser \
    && chown -R appuser:appuser /app \
    && chown -R appuser:appuser /var/log/supervisor

# Health check script
COPY <<EOF /app/healthcheck.sh
#!/bin/bash
curl -f http://127.0.0.1/health && \
curl -f http://127.0.0.1:3000/ && \
curl -f http://127.0.0.1:5000/api/health
EOF

RUN chmod +x /app/healthcheck.sh

# Switch to non-root user for app files
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /app/healthcheck.sh || exit 1

# Switch back to root for supervisor
USER root

# Start all services with supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/openlearnx.conf"]
