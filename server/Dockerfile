# Dockerfile for CRTA server
# Uses Debian slim base to ensure sqlite3 binary is available for manage.sh
FROM node:18-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Install sqlite3 and build deps (libsqlite3-dev + build tools) required by sqlite3 npm module
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    sqlite3 \
    libsqlite3-dev \
    python3 \
    build-essential \
  && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
# Use npm ci if lockfile exists, otherwise fall back to npm install (omit dev deps)
RUN if [ -f package-lock.json ]; then \
      npm ci --only=production; \
    else \
      npm install --production --no-audit --no-fund; \
    fi

# Copy application code
COPY server/ ./

ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]
