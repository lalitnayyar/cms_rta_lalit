#!/usr/bin/env bash
# Complete interactive manage script tailored to the project's requirements
# Provides DB init/migrations (SQLite), admin creation, link & notice CRUD, expiry job,
# audit log viewing, and framework-aware start/test/build commands.

set -euo pipefail
IFS=$'\n\t'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$ROOT_DIR/data"
DB_FILE="$DB_DIR/site.db"
SQLITE_BIN="$(command -v sqlite3 || true)"

if [ -z "$SQLITE_BIN" ]; then
  echo "sqlite3 is required but not found. Please install sqlite3." >&2
  exit 1
fi

confirm() {
  read -r -p "$1 [y/N]: " resp
  case "$resp" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

ensure_db() {
  mkdir -p "$DB_DIR"
  if [ ! -f "$DB_FILE" ]; then
    echo "Initializing SQLite DB at $DB_FILE"
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
SQL
  fi
}

hash_password() {
  # SHA-256 with username salt for minimal safety (no deps)
  username="$1"; password="$2"
  python3 - <<PY
import hashlib,sys
u=sys.argv[1].encode()
p=sys.argv[2].encode()
print(hashlib.sha256(u+ b':' + p).hexdigest())
PY
}

create_admin_cli() {
  ensure_db
  read -r -p "Admin username: " username
  while true; do
    read -s -r -p "Password: " pw1; echo
    read -s -r -p "Confirm: " pw2; echo
    [ "$pw1" = "$pw2" ] && break || echo "Passwords do not match, try again.";
  done
  pwd_hash=$(hash_password "$username" "$pw1")
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT OR IGNORE INTO admins (username, password_hash) VALUES ('$username', '$pwd_hash');
SELECT 'OK' as status;
SQL
  echo "Admin '$username' created (or already existed)."
}

add_link_cli() {
  ensure_db
  read -r -p "URL: " url
  read -r -p "Image path or URL (optional): " image
  read -r -p "Heading (optional): " heading
  read -r -p "Short description (optional): " desc
  read -r -p "Theme tag (optional, e.g., blue/light): " theme
  enabled=1
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT INTO links (url,image,heading,description,enabled,theme_tag) VALUES (
  '$url','$image','$heading','$desc',$enabled,'$theme'
);
SELECT last_insert_rowid();
SQL
  echo "Link added."
}

list_links_cli() {
  ensure_db
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,url,heading,enabled,theme_tag,created_at FROM links ORDER BY created_at DESC;"
}

toggle_link_cli() {
  ensure_db
  read -r -p "Link id to toggle: " id
  current=$($SQLITE_BIN "$DB_FILE" "SELECT enabled FROM links WHERE id=$id;" | tr -d '\n')
  if [ -z "$current" ]; then echo "No link with id=$id"; return; fi
  new=$((1 - current))
  $SQLITE_BIN "$DB_FILE" "UPDATE links SET enabled=$new WHERE id=$id;"
  echo "Link $id enabled set to $new"
}

add_notice_cli() {
  ensure_db
  read -r -p "Image path or URL (optional): " image
  read -r -p "Heading: " heading
  read -r -p "Description: " desc
  read -r -p "Publish at (YYYY-MM-DD HH:MM) or leave blank for now: " publish
  read -r -p "Expires at (YYYY-MM-DD HH:MM) or leave blank for none: " expires
  pub_sql="NULL"
  exp_sql="NULL"
  [ -n "$publish" ] && pub_sql="'$publish'"
  [ -n "$expires" ] && exp_sql="'$expires'"
  $SQLITE_BIN "$DB_FILE" <<SQL
INSERT INTO notices (image,heading,description,publish_at,expires_at) VALUES (
  '$image','$heading','$desc',$pub_sql,$exp_sql
);
SELECT last_insert_rowid();
SQL
  echo "Notice added."
}

list_notices_cli() {
  ensure_db
  echo "Active notices:";
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,heading,publish_at,expires_at,created_at FROM notices ORDER BY created_at DESC;"
  echo
  echo "Archived (history) notices:";
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT id,heading,publish_at,expires_at,created_at FROM notices_history ORDER BY created_at DESC;"
}

expire_notices_job() {
  ensure_db
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
  ensure_db
  $SQLITE_BIN -column -header "$DB_FILE" "SELECT v.id,v.link_id,l.url,v.ip,v.visited_at FROM visits v LEFT JOIN links l ON v.link_id=l.id ORDER BY v.visited_at DESC LIMIT 200;"
}

record_visit_cli() {
  ensure_db
  read -r -p "Link id (or leave blank): " lid
  read -r -p "Visitor IP (optional, will try to detect): " ip
  if [ -z "$ip" ]; then ip="unknown"; fi
  if [ -z "$lid" ]; then lid=NULL; fi
  $SQLITE_BIN "$DB_FILE" "INSERT INTO visits (link_id,ip) VALUES ($lid,'$ip');"
  echo "Visit recorded."
}

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

run_tests() {
  if [ -f package.json ] && grep -q "\"test\"" package.json; then
    npm test
  elif command -v pytest >/dev/null 2>&1; then
    pytest
  else
    echo "No test runner detected (npm test or pytest)."
  fi
}

show_help() {
  cat <<EOF
manage.sh - interactive management for this project
Commands:
  1) start            - Start development server (framework-aware)
  2) init-db          - Initialize SQLite DB and tables
  3) create-admin     - Create admin user (username + password)
  4) add-link         - Add a link (url,image,heading,description,theme)
  5) list-links       - List links
  6) toggle-link      - Enable/disable a link by id
  7) add-notice       - Add a notice with publish/expiry dates
  8) list-notices     - Show active and archived notices
  9) expire-notices   - Move expired notices to history
 10) record-visit     - Manually record a visit (for testing)
 11) show-audit       - Show recent visit audit logs
 12) test             - Run tests (npm test / pytest)
 13) shell            - Drop to bash shell
 14) help             - Show this help
 15) exit             - Exit
EOF
}

main_menu() {
  while true; do
    echo
    echo "====== manage.sh - project manager ======"
    echo "1) start         2) init-db      3) create-admin"
    echo "4) add-link      5) list-links  6) toggle-link"
    echo "7) add-notice    8) list-notices 9) expire-notices"
    echo "10) record-visit 11) show-audit 12) test"
    echo "13) shell        14) help       15) exit"
    read -r -p "Choose an option [1-15]: " choice
    case "$choice" in
      1) start_server ;; 
      2) ensure_db ;; 
      3) create_admin_cli ;; 
      4) add_link_cli ;; 
      5) list_links_cli ;; 
      6) toggle_link_cli ;; 
      7) add_notice_cli ;; 
      8) list_notices_cli ;; 
      9) expire_notices_job ;; 
      10) record_visit_cli ;; 
      11) show_audit_cli ;; 
      12) run_tests ;; 
      13) bash ;; 
      14) show_help ;; 
      15) echo "Goodbye."; exit 0 ;;
      *) echo "Invalid choice";;
    esac
  done
}

# run
main_menu
