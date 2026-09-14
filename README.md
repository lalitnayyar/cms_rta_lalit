CRTA - scaffolded app

This repository contains a minimal scaffold matching the chosen stack: Node (Express) backend + simple static frontend with SQLite and a demo admin UI.

Features
- Public front page listing links (server/public/index.html)
- Admin UI placeholder for creating links (server/public/admin.html)
- Express API: /api/links and admin API at /admin/links
- SQLite database with tables: links, users, visits (server/data.db)
- Simple UID/password demo auth (server/auth.js) for admin routes
- CI workflow to run tests (.github/workflows/ci.yml)

Functionality
- Public users: GET /api/links returns enabled links; clicking a link should be recorded in visits (audit) in future iterations.
- Admins: POST /auth/login with {uid,password} to authenticate (demo). Use header x-admin-uid: <uid> for protected admin API calls in this scaffold.
- Admin UI: a minimal HTML form (server/public/admin.html) demonstrates creating links using the admin API.

Security note
- The provided auth is a demo. Do NOT use default credentials in production. Replace with proper session management or JWT and secure password policies.

Quick start (server)
1. cd server
2. npm install
3. npm start
4. Open http://localhost:4000 for the public page; http://localhost:4000/admin.html for admin UI

Default credentials (demo)
- uid: admin
- password: admin
Change immediately after first run.

Developer guide
- Server entry: server/index.js
- DB: server/db.js (creates server/data.db)
- Models: server/models/*
- Routes: server/routes/api.js and server/routes/admin.js
- Auth helpers: server/auth.js
- Public frontend placeholders: server/public/

Tests
- A placeholder Jest test is in tests/test_placeholder.test.js. Run from repo root: cd server && npm test

Deployment notes
- The repo is intentionally minimal. For deployment:
  - Install Node 18+
  - Ensure WRITE access for server/data.db or configure a remote DB
  - Replace demo auth with secure sessions and HTTPS

manage.sh (project manager)
- An interactive manage script at the repo root (manage.sh) provides common project tasks:
  - init-db: creates data/site.db with tables: admins, links, visits, notices, notices_history
  - create-admin: add an admin user (username + password)
  - add-link / list-links / toggle-link: manage link entries
  - add-notice / list-notices / expire-notices: manage notices and archive expired items
  - show-audit / record-visit: audit log utilities
  - start: start the app and select host and port (prompts for host (default 0.0.0.0) and port (default 8000))

Notes about start/port
- When starting the app via manage.sh you will be prompted for host and port.
- For Django the script runs: python3 manage.py runserver <host>:<port>
- For Node apps it sets PORT and HOST env vars: PORT=<port> HOST=<host> npm run start
- For Flask it prefers the flask CLI: FLASK_APP=app.py FLASK_RUN_HOST=<host> FLASK_RUN_PORT=<port> flask run
- If the detected entrypoint doesn't support host/port, the script falls back to python -m http.server

Notes
- Password hashing currently uses SHA-256(username:password) for simplicity; migrate to bcrypt for production.
- Use the expire-notices command or schedule a cron job to archive expired notices automatically.

Contributing
- Open issues or PRs with feature requests. Suggested next work: add React frontend, implement secure auth (bcrypt/sessions), and add migrations/tests.

License
- Add a LICENSE file if desired.

Docker deployment

1) Build the Docker image (from repo root):
   docker build -f server/Dockerfile -t crta-server:latest .

2) Run the container:
   docker run -p 4000:4000 -v "$(pwd)/data:/app/data" crta-server:latest

Or use docker-compose for development (bind-mounts are configured to keep code editable):
   docker-compose up --build

Notes
- The Docker image installs the sqlite3 system binary so manage.sh and the server can use data/site.db.

Install sqlite3 locally (Debian/Ubuntu):
   sudo apt update && sudo apt install -y sqlite3

Troubleshooting
- manage.sh exits with "sqlite3 is required" → install sqlite3 (see above) or run inside the Docker container (docker-compose up or docker run) which includes sqlite3.

- "docker compose" / "docker-compose" command not found
  * Debian/Ubuntu (recommended): install Docker Engine and compose plugin from Docker's official repo:
      sudo apt-get remove -y docker docker-engine docker.io containerd runc containerd.io || true
      sudo apt-get update
      sudo apt-get install -y ca-certificates curl gnupg lsb-release
      sudo mkdir -p /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
      sudo apt-get update
      sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
      sudo systemctl enable --now docker
      # optionally add your user to docker group (log out/in): sudo usermod -aG docker $USER
  * If apt reports containerd.io conflicts, remove older containerd/docker packages first (see commands above), then install from Docker repo.
  * Alternatively install standalone docker-compose binary:
      sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      sudo chmod +x /usr/local/bin/docker-compose

- Verify installation:
   docker --version
   docker compose version   # or: docker-compose --version
   sqlite3 --version

- Permission errors writing ./data in container: ensure directory exists and is writable, or change owner:
   mkdir -p ./data && sudo chown $UID:$GID ./data

If you want, add a note which OS you use and the README can include exact commands for that platform.

- Compose mounts ./server into the container for easy development; in production remove the volume to use the image's code.
- Ensure the ./data directory is writable by the container (the compose file mounts it to /app/data).
