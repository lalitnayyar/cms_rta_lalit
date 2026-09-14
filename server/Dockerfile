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
# Install deps (including devDependencies) to run build steps, then build assets and prune devDeps for smaller runtime image
RUN npm ci \
  && npm run build \
  && npm prune --production || true

# Copy application code (after deps to leverage caching)
COPY server/ ./

ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]
