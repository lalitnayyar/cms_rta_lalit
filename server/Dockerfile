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
# Install deps first to leverage Docker cache
# Use npm ci when a lockfile is present; otherwise create a minimal package.json containing only runtime deps + build toolchain and run npm install
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      node -e "const fs=require('fs');const p=require('./package.json');const deps=p.dependencies||{};deps['tailwindcss']='^3.5.8';deps['postcss']='^8.4.24';deps['autoprefixer']='^10.4.14';const out={name:p.name||'crta',version:p.version||'1.0.0',private:true,dependencies:deps};fs.writeFileSync('package.json',JSON.stringify(out,null,2));" && \
      npm install --no-audit --no-fund; \
    fi

# Copy application code (includes src/styles and public)
COPY server/ ./

# Build frontend assets, then prune devDependencies for smaller runtime image
RUN npm run build \
  && npm prune --production || true

ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]
