#!/usr/bin/env bash
# Interactive manage script for common developer tasks
# Usage: ./manage.sh

set -euo pipefail

SCRIPT_NAME="manage.sh"

confirm() {
  # ask for yes/no
  read -r -p "$1 [y/N]: " resp
  case "$resp" in
    [yY]|[yY][eE][sS]) return 0 ;;
    *) return 1 ;;
  esac
}

run_cmd() {
  echo
  echo "> $*"
  if confirm "Run the above command?"; then
    eval "$@"
  else
    echo "Skipped."
  fi
}

start_server() {
  if [ -f package.json ]; then
    run_cmd "npm run start"
  elif [ -f manage.py ]; then
    run_cmd "python3 manage.py runserver"
  else
    run_cmd "python3 -m http.server 8000"
  fi
}

migrate() {
  if [ -f manage.py ]; then
    run_cmd "python3 manage.py migrate"
  else
    echo "No manage.py detected; no migration command available."
  fi
}

create_admin() {
  if [ -f manage.py ]; then
    run_cmd "python3 manage.py createsuperuser"
  else
    echo "No manage.py detected; please create admin manually."
  fi
}

run_tests() {
  if [ -f package.json ] && grep -q "\"test\"" package.json; then
    run_cmd "npm test"
  elif command -v pytest >/dev/null 2>&1; then
    run_cmd "pytest"
  else
    echo "No test runner detected (npm test or pytest)."
  fi
}

build_project() {
  if [ -f package.json ] && grep -q "\"build\"" package.json; then
    run_cmd "npm run build"
  else
    echo "No build script detected in package.json."
  fi
}

show_help() {
  cat <<EOF
Interactive manage script - available commands:
  1) start       - Start the development server
  2) migrate     - Run DB migrations (if Django manage.py exists)
  3) create-admin- Create admin/superuser (Django)
  4) test        - Run tests (npm test or pytest)
  5) build       - Build project (npm run build)
  6) shell       - Drop to an interactive shell (bash)
  7) exit        - Exit this script
  8) help        - Show this help
EOF
}

main_menu() {
  while true; do
    echo
    echo "====== manage.sh - interactive shell ======"
    echo "1) start       2) migrate   3) create-admin"
    echo "4) test        5) build     6) shell"
    echo "7) help        8) exit"
    read -r -p "Choose an option [1-8]: " choice
    case "$choice" in
      1) start_server ;; 
      2) migrate ;; 
      3) create_admin ;; 
      4) run_tests ;; 
      5) build_project ;; 
      6) bash ;; 
      7) show_help ;; 
      8) echo "Goodbye."; exit 0 ;;
      *) echo "Invalid choice";;
    esac
  done
}

# Ensure script is run from repo root (best-effort):
cd "$(dirname "${BASH_SOURCE[0]}")"

main_menu
