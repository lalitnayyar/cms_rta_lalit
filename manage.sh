#!/usr/bin/env bash
# Complete interactive manage script tailored to the project's requirements
# Provides DB init/migrations (SQLite), admin creation, link & notice CRUD, expiry job,
# audit log viewing, and framework-aware start/test/build commands, plus deployment helpers.

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$ROOT_DIR/data"
DB_FILE="$DB_DIR/site.db"
SQLITE_BIN="$(command -v sqlite3 || true)"
PID_FILE="$DB_DIR/manage.pid"
LOG_FILE="$DB_DIR/manage.log"

if [ -z "$SQLITE_BIN" ]; then
  echo "Warning: sqlite3 not found. DB-related commands will fail until sqlite3 is installed."
fi

confirm() {
  read -r -p "$1 [y/N]: " resp
  case "$resp" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

ensure_db() {
  if [ -z "$SQLITE_BIN" ]; then
    echo "sqlite3 CLI is required for DB operations. Install sqlite3 and retry." >&2
    return 1
  fi
  mkdir -p "$DB_DIR"
  if [ ! -f "$DB_FILE" ]; then
    echo "Initializing SQLite DB at $DB_FILE"
    if command -v sqlite3 >/dev/null 2>&1; then
      $SQLITE_BIN "$DB_FILE" <<'SQL'
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  image TEXT,
  heading TEXT,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  theme_tag TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY,
  link_id INTEGER,
  ip TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(link_id) REFERENCES links(id)
);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY,
  image TEXT,
  heading TEXT,
  description TEXT,
  publish_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notices_history AS SELECT * FROM notices WHERE 0;

-- Settings table for site headings and small key/value pairs
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
-- seed defaults
INSERT OR REPLACE INTO settings(key,value) VALUES('heading1','CRTA — Notices & Resources');
INSERT OR REPLACE INTO settings(key,value) VALUES('heading2','A clean, focused feed of important updates and quick links.');
SQL
    elif command -v python3 >/dev/null 2>&1; then
      python3 - <<PY
import sqlite3, os
conn=sqlite3.connect(os.path.abspath(os.environ.get('DB_FILE', 'data/site.db')))
cur=conn.cursor()
cur.executescript(r"""
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS links (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  image TEXT,
  heading TEXT,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  theme_tag TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY,
  link_id INTEGER,
  ip TEXT,
  visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(link_id) REFERENCES links(id)
);
CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY,
  image TEXT,
  heading TEXT,
  description TEXT,
  publish_at DATETIME,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS notices_history AS SELECT * FROM notices WHERE 0;

# Settings table for site headings and small key/value pairs
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
# seed defaults
INSERT OR REPLACE INTO settings(key,value) VALUES('heading1','CRTA — Notices & Resources');
INSERT OR REPLACE INTO settings(key,value) VALUES('heading2','A clean, focused feed of important updates and quick links.');
""")
conn.commit()
print('OK')
PY
    else
      echo "sqlite3 or python3 required to initialize DB" >&2
      return 1
    fi
  fi
}

hash_password() {
  # SHA-256 with username salt for minimal safety (uses python3 if available, otherwise openssl)
  username="$1"
  password="$2"
  if command -v python3 >/dev/null 2>&1; then
    python3 - <<PY "$username" "$password"
import hashlib,sys
u=sys.argv[1].encode()
p=sys.argv[2].encode()
print(hashlib.sha256(u + b':' + p).hexdigest())
PY
  else
    if command -v openssl >/dev/null 2>&1; then
      printf "%s:%s" "$username" "$password" | openssl dgst -sha256 -binary | xxd -p -c 256
    else
      echo "Error: python3 or openssl required to hash passwords" >&2
      exit 1
    fi
  fi
}

# Escape single quotes for safe SQL insertion into SQLite
escape_sql() {
  printf "%s" "$1" | sed "s/'/''/g"
}

create_admin_cli() {
  ensure_db || return 1
  read -r -p "Admin username: " username
  while true; do
    read -s -r -p "Password: " pw1; echo
    read -s -r -p "Confirm: " pw2; echo
    [ "$pw1" = "$pw2" ] && break || echo "Passwords do not match, try again.";
  done
  pwd_hash=$(hash_password "$username" "$pw1")
  u=$(escape_sql "$username")
  ph=$(escape_sql "$pwd_hash")
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT OR IGNORE INTO admins (username, password_hash) VALUES ('$u', '$ph');
SELECT 'OK' as status;
SQL
  echo "Admin '$username' created (or already existed)."
}


add_link_cli() {
  ensure_db || return 1
  read -r -p "URL: " url
  read -r -p "Image path or URL (optional): " image
  read -r -p "Heading (optional): " heading
  read -r -p "Short description (optional): " desc
  read -r -p "Theme tag (optional, e.g., blue/light): " theme
  enabled=1
  ue=$(escape_sql "$url")
  ie=$(escape_sql "$image")
  he=$(escape_sql "$heading")
  de=$(escape_sql "$desc")
  te=$(escape_sql "$theme")
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT INTO links (url,image,heading,description,enabled,theme_tag) VALUES (
  '$ue','$ie','$he','$de',$enabled,'$te'
);
SELECT last_insert_rowid();
SQL
  echo "Link added."
}


list_links_cli() {
  ensure_db || return 1
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,url,heading,enabled,theme_tag,created_at FROM links ORDER BY created_at DESC;"
}

toggle_link_cli() {
  ensure_db || return 1
  read -r -p "Link id to toggle: " id
  current=$($SQLITE_BIN "$DB_FILE" "SELECT enabled FROM links WHERE id=$id;" | tr -d '\n')
  if [ -z "$current" ]; then echo "No link with id=$id"; return; fi
  new=$((1 - current))
  $SQLITE_BIN "$DB_FILE" "UPDATE links SET enabled=$new WHERE id=$id;"
  echo "Link $id enabled set to $new"
}

add_notice_cli() {
  ensure_db || return 1
  read -r -p "Image path or URL (optional): " image
  read -r -p "Heading: " heading
  read -r -p "Description: " desc
  read -r -p "Publish at (YYYY-MM-DD HH:MM) or leave blank for now: " publish
  read -r -p "Expires at (YYYY-MM-DD HH:MM) or leave blank for none: " expires
  pub_sql="NULL"
  exp_sql="NULL"
  [ -n "$publish" ] && pub_sql="'$(escape_sql "$publish")'"
  [ -n "$expires" ] && exp_sql="'$(escape_sql "$expires")'"
  ie=$(escape_sql "$image")
  he=$(escape_sql "$heading")
  de=$(escape_sql "$desc")
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT INTO notices (image,heading,description,publish_at,expires_at) VALUES (
  '$ie','$he','$de',$pub_sql,$exp_sql
);
SELECT last_insert_rowid();
SQL
  echo "Notice added."
}


list_notices_cli() {
  ensure_db || return 1
  echo "Active notices:";
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,heading,publish_at,expires_at,created_at FROM notices ORDER BY created_at DESC;"
  echo
  echo "Archived (history) notices:";
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,heading,publish_at,expires_at,created_at FROM notices_history ORDER BY created_at DESC;"
}

expire_notices_job() {
  ensure_db || return 1
  now="$(date '+%Y-%m-%d %H:%M:%S')"
  expired=$($SQLITE_BIN "$DB_FILE" "SELECT id FROM notices WHERE expires_at IS NOT NULL AND expires_at <= '$now';")
  if [ -z "$expired" ]; then
    echo "No expired notices at $now"
    return
  fi
  echo "Moving expired notices to history:"
  $SQLITE_BIN "$DB_FILE" <<SQL
BEGIN;
INSERT INTO notices_history SELECT * FROM notices WHERE expires_at IS NOT NULL AND expires_at <= '$now';
DELETE FROM notices WHERE expires_at IS NOT NULL AND expires_at <= '$now';
COMMIT;
SQL
  echo "Done."
}

show_audit_cli() {
  ensure_db || return 1
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT v.id,v.link_id,l.url,v.ip,v.visited_at FROM visits v LEFT JOIN links l ON v.link_id=l.id ORDER BY v.visited_at DESC LIMIT 200;"
}

record_visit_cli() {
  ensure_db || return 1
  read -r -p "Link id (or leave blank): " lid
  read -r -p "Visitor IP (optional, will try to detect): " ip
  if [ -z "$ip" ]; then ip="unknown"; fi
  if [[ "$lid" =~ ^[0-9]+$ ]]; then lid_sql=$lid; else lid_sql=NULL; fi
  ip_e=$(escape_sql "$ip")
  $SQLITE_BIN "$DB_FILE" "INSERT INTO visits (link_id,ip) VALUES ($lid_sql,'$ip_e');"
  echo "Visit recorded."
}


# Start server foreground (interactive)
start_server() {
  read -r -p "Host [0.0.0.0]: " host
  host="${host:-0.0.0.0}"
  read -r -p "Port [8000]: " port
  port="${port:-8000}"

  if [ -f manage.py ]; then
    cmd="python3 manage.py runserver ${host}:${port}"
  elif [ -f package.json ]; then
    # Many Node apps respect PORT env var; pass HOST too in case used by app
    cmd="PORT=${port} HOST=${host} npm run start"
  elif [ -f app.py ] || [ -f run.py ]; then
    if command -v flask >/dev/null 2>&1; then
      # Prefer flask CLI if available
      cmd="FLASK_APP=app.py FLASK_RUN_HOST=${host} FLASK_RUN_PORT=${port} flask run"
    else
      # Best-effort: user entrypoint may read PORT env var, otherwise fallback
      cmd="PORT=${port} HOST=${host} python3 app.py || PORT=${port} HOST=${host} python3 run.py"
    fi
  else
    cmd="python3 -m http.server ${port} --bind ${host}"
  fi

  echo "About to run: $cmd"
  if confirm "Start server on ${host}:${port}?"; then
    eval "$cmd"
  else
    echo "Start cancelled."
  fi
}

# Start server in background and record PID
start_server_bg() {
  read -r -p "Host [0.0.0.0]: " host
  host="${host:-0.0.0.0}"
  read -r -p "Port [8000]: " port
  port="${port:-8000}"

  if [ -f manage.py ]; then
    cmd="python3 manage.py runserver ${host}:${port}"
  elif [ -f package.json ]; then
    cmd="PORT=${port} HOST=${host} npm run start"
  elif [ -f app.py ] || [ -f run.py ]; then
    cmd="PORT=${port} HOST=${host} python3 app.py || PORT=${port} HOST=${host} python3 run.py"
  else
    cmd="python3 -m http.server ${port} --bind ${host}"
  fi

  mkdir -p "$DB_DIR"
  echo "Starting in background. Logs: $LOG_FILE"
  nohup bash -c "$cmd" >"$LOG_FILE" 2>&1 &
  pid=$!
  echo "$pid" > "$PID_FILE"
  echo "Background server started with PID $pid"
}

stop_server() {
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      if confirm "Kill process $pid?"; then
        kill "$pid" && rm -f "$PID_FILE"
        echo "Process $pid stopped."
      else
        echo "Abort stop."
      fi
    else
      echo "No running process found for PID $pid. Removing stale PID file."; rm -f "$PID_FILE"
    fi
  else
    echo "No PID file found; server may not be running."
  fi
}

status_server() {
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "Server running with PID $pid"
      echo "Last 40 lines of log ($LOG_FILE):"
      tail -n 40 "$LOG_FILE" || true
      return
    else
      echo "PID file present but process not running."
    fi
  fi

  # Check for a docker container named crta-server
  if command -v docker >/dev/null 2>&1; then
    if docker ps --format '{{.Names}}' | grep -q '^crta-server$'; then
      echo "Docker container 'crta-server' is running:"
      docker ps --filter "name=crta-server"
      return
    fi
  fi

  # Check docker-compose / docker compose status if compose file exists
  DC=""
  if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker --help 2>/dev/null | grep -q "compose"; then
    DC="docker compose"
  fi

  if [ -n "$DC" ] && [ -f docker-compose.yml ]; then
    echo "Docker compose status:"
    if [[ "$DC" == *" "* ]]; then
      eval "$DC ps" || true
    else
      $DC ps || true
    fi
    return
  fi

  echo "No running server detected."
}

pull_latest() {
  if confirm "Pull latest from origin/main?"; then
    git pull origin main
  fi
}

# Remove docker containers/images used by this project
delete_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker not installed"; return 1
  fi
  # Prefer docker-compose down if compose file present
  if [ -f docker-compose.yml ] && command -v docker-compose >/dev/null 2>&1; then
    if confirm "Stop and remove compose services and images?"; then
      docker-compose down --rmi all --volumes || true
    fi
    return
  elif [ -f docker-compose.yml ] && docker --help 2>/dev/null | grep -q compose; then
    if confirm "Stop and remove docker compose services and images?"; then
      docker compose down --rmi all --volumes || true
    fi
    return
  fi
  # Fallback: remove known containers/images
  if docker ps -a --format '{{.Names}}' | grep -E 'cms_rta_lalit-web-1|crta-server' >/dev/null 2>&1; then
    if confirm "Remove containers and images for cms_rta_lalit-web-1/crta-server?"; then
      docker rm -f cms_rta_lalit-web-1 crta-server || true
      docker rmi -f cms_rta_lalit-web:latest crta-server:latest || true
    fi
  else
    echo "No known containers found."
  fi
}

# Remove matching project-prefixed containers (interactive)
remove_project_orphans() {
  # Optional project prefix argument, defaults to current directory basename
  prefix="${1:-$(basename "$(pwd)") }"
  # list containers whose names start with prefix_
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  orphans=$(docker ps -a --format '{{.Names}}' | grep -E "^${prefix}_" || true)
  if [ -n "$orphans" ]; then
    echo "Found containers matching project prefix '$prefix':"
    echo "$orphans"
    if confirm "Remove these containers? (They may be old/orphan containers)"; then
      echo "$orphans" | while read -r c; do
        [ -n "$c" ] && docker rm -f "$c" || true
      done
    else
      echo "Skipping orphan removal."
    fi
  fi
}

# Remove existing compose-managed containers for this project (interactive)
remove_existing_project_containers() {
  prefix="${1:-$(basename "$(pwd)") }"
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  containers=$(docker ps -a --format '{{.Names}}' | grep -E "^${prefix}_" || true)
  if [ -z "$containers" ]; then
    return 0
  fi
  echo "Found existing compose-managed containers for project prefix '$prefix':"
  echo "$containers"
  if confirm "Stop and remove these containers before running compose up? (Named volumes are kept)"; then
    echo "$containers" | while read -r c; do
      [ -n "$c" ] && docker rm -f "$c" || true
    done
  else
    echo "Keeping existing containers. Compose may fail if images/config changed."
  fi
}

# Interactive prune of dangling images (safe default)
prune_dangling_images() {
  if ! command -v docker >/dev/null 2>&1; then
    return 0
  fi
  dang=$(docker images -f "dangling=true" -q | sort -u || true)
  if [ -z "$dang" ]; then
    return 0
  fi
  echo "Dangling images detected:"
  docker images -f "dangling=true" || true
  if confirm "Prune dangling images? This removes unused images and can free space."; then
    docker image prune -f || echo "docker image prune failed"
  else
    echo "Skipping image prune."
  fi
}


deploy_compose() {
  # detect compose command (docker-compose or docker compose plugin) without invoking 'docker compose'
  DC=""
  if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker --help 2>/dev/null | grep -q "compose"; then
    DC="docker compose"
  fi

  if [ -n "$DC" ] && [ -f docker-compose.yml ]; then
    # Offer to detect and remove orphan containers before running compose up
    remove_project_orphans "$(basename "$(pwd)")"
    # If previous containers exist for this compose project, offer to remove them to avoid recreate errors
    remove_existing_project_containers "$(basename "$(pwd)")"
    # Offer to prune dangling images before deploy
    prune_dangling_images

    if confirm "Run $DC up -d --build --remove-orphans?"; then
      if [[ "$DC" == *" "* ]]; then
        eval "$DC up -d --build --remove-orphans"
      else
        $DC up -d --build --remove-orphans
      fi
    fi
    return
  fi

  # Fallback: if docker-compose isn't available (or compose file missing), build and run Dockerfile
  if [ -f server/Dockerfile ]; then
    if confirm "Docker Compose unavailable or not desired. Build server image and run container (exposes PORT 4000)?"; then
      # stop existing container if present
      if command -v docker >/dev/null 2>&1 && docker ps -a --format '{{.Names}}' | grep -q '^crta-server$'; then
        echo "Stopping existing crta-server container..."
        docker rm -f crta-server || true
      fi
      docker build -f server/Dockerfile -t crta-server:latest .
      docker run -d -p 4000:4000 -v "$(pwd)/data:/app/data" --name crta-server crta-server:latest
    fi
  else
    echo "No docker-compose.yml or server/Dockerfile found."
  fi
}


# Deploy the crta site using the provided docker-compose.crta.yml and ensure Traefik network exists
deploy_crta() {
  COMPOSE_FILE="docker-compose.crta.yml"
  if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Compose file $COMPOSE_FILE not found in $(pwd)"
    return 1
  fi

  # detect compose command
  DC=""
  if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker --help 2>/dev/null | grep -q "compose"; then
    DC="docker compose"
  else
    echo "docker-compose or docker compose is required to deploy."
    return 1
  fi

  # determine desired Traefik network. Can override with TRAEFIK_NETWORK env var
  NET="${TRAEFIK_NETWORK:-traefik-kpux}"
  # try to parse a network name from the compose file if it references 'traefik-'
  if grep -q 'traefik-' "$COMPOSE_FILE" 2>/dev/null; then
    NET=$(grep -oE 'traefik[-_[:alnum:]]+' "$COMPOSE_FILE" | head -n1)
  fi

  # ensure network exists
  if ! docker network ls --format '{{.Name}}' | grep -q "^$NET$"; then
    if confirm "Docker network '$NET' not found. Create it now?"; then
      docker network create "$NET" || { echo "Failed to create network $NET"; return 1; }
    else
      echo "Cannot continue without network $NET"
      return 1
    fi
  fi

  if confirm "Run $DC -f $COMPOSE_FILE up -d --build --remove-orphans?"; then
    # offer to prune dangling images before crta deploy
    prune_dangling_images
    if [[ "$DC" == *" "* ]]; then
      eval "$DC -f $COMPOSE_FILE up -d --build --remove-orphans"
    else
      $DC -f $COMPOSE_FILE up -d --build --remove-orphans
    fi
  fi
}

redeploy_compose() {
  DC=""
  if command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose"
  elif command -v docker >/dev/null 2>&1 && docker --help 2>/dev/null | grep -q "compose"; then
    DC="docker compose"
  fi

  if [ -n "$DC" ] && [ -f docker-compose.yml ]; then
    if confirm "Pull images and redeploy ($DC pull && $DC up -d --build --remove-orphans)?"; then
      if [[ "$DC" == *" "* ]]; then
        eval "$DC pull" || true
        # offer prune before redeploy
        prune_dangling_images
        eval "$DC up -d --build --remove-orphans"
      else
        $DC pull || true
        # offer prune before redeploy
        prune_dangling_images
        $DC up -d --build --remove-orphans
      fi
    fi
    return
  fi

  # Fallback to Dockerfile build/run deployment if compose not available
  if [ -f server/Dockerfile ]; then
    if confirm "Compose unavailable. Rebuild image and restart container?"; then
      if command -v docker >/dev/null 2>&1 && docker ps -a --format '{{.Names}}' | grep -q '^crta-server$'; then
        echo "Stopping existing crta-server container..."
        docker rm -f crta-server || true
      fi
      docker build -f server/Dockerfile -t crta-server:latest .
      docker run -d -p 4000:4000 -v "$(pwd)/data:/app/data" --name crta-server crta-server:latest
    fi
  else
    echo "No docker-compose.yml or server/Dockerfile found."
  fi
}

run_tests() {
  # Prefer server/package.json if present
  if [ -f server/package.json ] && grep -q "\"test\"" server/package.json; then
    (cd server && npm test)
  elif [ -f package.json ] && grep -q "\"test\"" package.json; then
    npm test
  elif command -v pytest >/dev/null 2>&1; then
    pytest
  else
    echo "No test runner detected (npm test or pytest)."
  fi
}

# Initialize settings table and seed defaults (idempotent).
init_settings_cli() {
  # prefer server DB if present (app uses server/data.db); otherwise fallback to manage data/site.db
  if [ -f "$ROOT_DIR/server/data.db" ]; then
    target_db="$ROOT_DIR/server/data.db"
  else
    target_db="$DB_FILE"
  fi
  if [ -z "$SQLITE_BIN" ]; then
    echo "sqlite3 CLI required to initialize settings table. Install sqlite3 and retry." >&2
    return 1
  fi
  mkdir -p "$(dirname "$target_db")"
  echo "Creating settings table in $target_db (if missing) and seeding defaults..."
  $SQLITE_BIN "$target_db" <<SQL
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR REPLACE INTO settings(key,value) VALUES('heading1','CRTA — Notices & Resources');
INSERT OR REPLACE INTO settings(key,value) VALUES('heading2','A clean, focused feed of important updates and quick links.');
SQL
  if [ $? -eq 0 ]; then
    echo "Settings table created/seeded in $target_db"
  else
    echo "Failed to create/seed settings in $target_db" >&2
    return 1
  fi
}

manage_server_users() {
  # Interactive CRUD for server users inside the running web container
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker required to manage server users (container operations)."; return 1
  fi
  # container name from compose: cms_rta_lalit-web-1
  cnt="cms_rta_lalit-web-1"
  if ! docker ps --format '{{.Names}}' | grep -q "^$cnt$"; then
    echo "Container $cnt not running. Start app with ./manage.sh deploy or docker compose up -d."; return 1
  fi
  while true; do
    echo "Server users: 1) list 2) create 3) delete 4) changepw 5) back"
    read -r -p "Choose [1-5]: " c
    case "$c" in
      1)
        echo "Listing users (id | uid):"
        docker exec $cnt sqlite3 /app/server/data.db "SELECT id,uid FROM users;" || true
        ;;
      2)
        read -r -p "New uid: " nid
        read -s -r -p "Password: " npw; echo
        if [ -z "$nid" ] || [ -z "$npw" ]; then echo "uid and password required"; continue; fi
        # generate bcrypt hash inside container using node
        hash=$(docker exec -i $cnt node -e "const bcrypt=require('bcrypt');(async(p)=>{console.log(await bcrypt.hash(p,10))})(process.argv[1])" "$npw" 2>/dev/null | tr -d '\r')
        if [ -z "$hash" ]; then echo "Failed to generate hash inside container"; continue; fi
        docker exec $cnt sqlite3 /app/server/data.db "INSERT OR REPLACE INTO users(uid,password_hash) VALUES('$(printf "%s" "$nid" | sed "s/'/''/g")','$(printf "%s" "$hash" | sed "s/'/''/g")');" && echo "User $nid created/updated." || echo "SQLite insert failed." 
        ;;
      3)
        read -r -p "UID to delete: " did
        if [ -z "$did" ]; then echo "uid required"; continue; fi
        docker exec $cnt sqlite3 /app/server/data.db "DELETE FROM users WHERE uid='$(printf "%s" "$did" | sed "s/'/''/g")';" && echo "Deleted $did (if existed)." || echo "Delete failed.";
        ;;
      4)
        read -r -p "UID to change password: " cuid
        read -s -r -p "New password: " cpw; echo
        if [ -z "$cuid" ] || [ -z "$cpw" ]; then echo "uid and password required"; continue; fi
        chash=$(docker exec -i $cnt node -e "const bcrypt=require('bcrypt');(async(p)=>{console.log(await bcrypt.hash(p,10))})(process.argv[1])" "$cpw" 2>/dev/null | tr -d '\r')
        if [ -z "$chash" ]; then echo "Failed to generate hash"; continue; fi
        docker exec $cnt sqlite3 /app/server/data.db "UPDATE users SET password_hash='$(printf "%s" "$chash" | sed "s/'/''/g")' WHERE uid='$(printf "%s" "$cuid" | sed "s/'/''/g")';" && echo "Password updated for $cuid" || echo "Update failed.";
        ;;
      5) break ;;
      *) echo "Invalid";;
    esac
  done
}

show_help() {
  cat <<EOF
manage.sh - interactive management for this project
Commands:
  1) start        - Start development server (foreground)
  2) start-bg     - Start server in background (records PID)
  3) stop         - Stop background server (uses PID file)
  4) status       - Status and logs for background server or docker-compose
  5) init-db      - Initialize SQLite DB and tables
  6) pull         - git pull origin main
  7) deploy       - docker-compose up -d --build or build/run Dockerfile
  8) redeploy     - docker-compose pull && up -d --build
  9) create-admin - Create admin user (username + password)
 10) add-link     - Add a link (url,image,heading,description,theme)
 11) list-links   - List links
 12) toggle-link  - Enable/disable a link by id
 13) add-notice   - Add a notice with publish/expiry dates
 14) list-notices - Show active and archived notices
 15) expire-notices - Move expired notices to history
 16) record-visit - Manually record a visit (for testing)
 17) show-audit   - Show recent visit audit logs
 18) test         - Run tests (npm test / pytest)
 19) shell        - Drop to bash shell
 20) help         - Show this help
 21) exit         - Exit
 22) delete-docker - Remove docker containers/images for this project
 23) server-users  - Interactive CRUD for server users (inside container)
 24) init-settings - Create settings table and seed default headings (server/data.db or data/site.db)
 25) deploy-crta  - Deploy crta docker-compose (docker-compose.crta.yml) via Traefik network

Notes:
- deploy, redeploy, and deploy-crta now include interactive safeguards:
  * detect and optionally remove project-prefixed orphan containers before 'docker compose up'
  * offer to prune dangling images interactively before deploy/redeploy
  These are interactive and require confirmation before deleting anything.
EOF
}

main_menu() {
  while true; do
    echo
    echo "====== manage.sh - project manager ======"
    echo "1) start   2) start-bg 3) stop    4) status 5) init-db 6) pull"
    echo "7) deploy  8) redeploy  9) create-admin 10) add-link 11) list-links"
    echo "12) toggle-link 13) add-notice 14) list-notices 15) expire-notices"
    echo "16) record-visit 17) show-audit 18) test 19) shell 20) help 21) exit"
    echo "22) delete-docker 23) server-users 24) init-settings 25) deploy-crta"
    read -r -p "Choose an option [1-25]: " choice
    case "$choice" in
      1) start_server ;; 
      2) start_server_bg ;; 
      3) stop_server ;; 
      4) status_server ;; 
      5) ensure_db ;; 
      6) pull_latest ;; 
      7) deploy_compose ;; 
      8) redeploy_compose ;; 
      9) create_admin_cli ;; 
      10) add_link_cli ;; 
      11) list_links_cli ;; 
      12) toggle_link_cli ;; 
      13) add_notice_cli ;; 
      14) list_notices_cli ;; 
      15) expire_notices_job ;; 
      16) record_visit_cli ;; 
      17) show_audit_cli ;; 
      18) run_tests ;; 
      19) bash ;; 
      20) show_help ;; 
      21) echo "Goodbye."; exit 0 ;;
      22) delete_docker ;; 
      23) manage_server_users ;; 
      24) init_settings_cli ;; 
      25) deploy_crta ;; 
      *) echo "Invalid choice";;
    esac
  done
}

# run
if [ "$#" -gt 0 ]; then
  cmd="$1"
  case "$cmd" in
    init-settings) init_settings_cli; exit 0 ;;
    init-db) ensure_db; exit 0 ;;
    start) start_server; exit 0 ;;
    start-bg) start_server_bg; exit 0 ;;
    status) status_server; exit 0 ;;
    deploy-crta) deploy_crta; exit 0 ;;
    *) echo "Unknown command: $cmd"; exit 1 ;;
  esac
fi

main_menu
