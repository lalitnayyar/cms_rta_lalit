Project framework for CRTA

Overview

This document translates requirement.md into an actionable application framework: a lightweight web app that presents a professional front page with managed links and a small admin panel to create/manage links and notices. The app records visitor IP and timestamp for audits and stores notices with publish and expiry dates. It prioritizes small operational overhead and easy deployment.

High-level architecture

- Frontend: Single-page app or server-rendered pages. Minimal JS (React/Vue) for admin and a static public front page. Public assets served via CDN or the same server.
- Backend API: RESTful JSON API (or lightweight GraphQL) exposing endpoints for links, notices, auth, and audit logs.
- Database: SQLite for single-instance/simple deployments; Postgres for scale. Store Link, Notice, User, AuditLog, and AuditSettings tables.
- Background jobs: Small scheduler (cron or worker) to expire notices (mark disabled/archived) at expiry time.
- Storage: Images in object storage (S3/MinIO) or stored as base64 blobs on small installs. Store image URLs in DB.
- Auth: Simple uid/password stored hashed (bcrypt/argon2). Optionally add role-based access (admin/editor).

Core models

- Link
  - id (uuid)
  - url
  - image_url
  - heading
  - description
  - enabled (bool)
  - theme (enum/string tag)
  - created_at, updated_at

- Notice
  - id
  - image_url
  - heading
  - description
  - publish_at (datetime)
  - expires_at (datetime)
  - published_by (user_id)
  - archived (bool)
  - created_at

- User
  - id
  - uid (string)
  - password_hash
  - role (admin/editor)
  - last_login

- AuditLog / Visit
  - id
  - link_id (nullable)
  - ip_address
  - user_agent
  - visited_at
  - referer

API surface (examples)

- GET /api/links?enabled=true — list public links
- GET /api/links/:id — link detail
- POST /api/admin/links — create link (auth required)
- PATCH /api/admin/links/:id — update link
- POST /api/admin/notices — create notice with publish/expires
- GET /api/admin/notices?status=archived — list past notices
- POST /api/auth/login — returns session token
- POST /api/visits — record a visit (backend can record server-side on redirect)

Admin UX & features

- Login screen (UID + password)
- Dashboard: list links (enable/disable toggle), create/edit forms, theme selector with Live Preview (5+ preset themes)
- Theme options: e.g., Light, Dark, Corporate Blue, Minimal, Contrast High. Store theme metadata (primary color, accent, font).
- Link entry: image upload, heading, description, URL, enabled checkbox, theme tag
- Notice management: create with publish and expiry, preview, immediate or scheduled publish, archive view for historical notices
- Audit viewer: searchable table of visits with filters (date range, IP, link)

Operational considerations

- Audit privacy/compliance: Hash or truncate IPs if privacy rules apply; provide retention settings (30/90/365 days) and automatic purging job.
- Security: Rate-limit admin endpoints, use HTTPS, protect against CSRF and XSS, validate URLs on import. Hash passwords with bcrypt/argon2, store sessions securely.
- Scalability: Start with SQLite; migrate to Postgres when concurrent writes/scale needed. Offload image serving to S3/CDN.
- Backups: Periodic DB dumps and object storage backups; provide export for notices and audit logs.
- Logging/Monitoring: Basic request logs; error tracking (Sentry or similar) optional.

Deployment options

- Minimal: Single-process Docker container (Node, Python, or PHP), SQLite, and local file/object storage. Use docker-compose for quick deployments.
- Production: Dockerized app with Postgres, S3-compatible storage, ephemeral web nodes behind a load balancer, and a scheduled worker to expire notices.

Manage script (interactive) for Docker

Provide a single interactive management script (examples: manage.sh, manage.py, or bin/manage) to simplify deployments and administration. The script should support an interactive menu and non-interactive subcommands/flags so automation (CI/CD) can call it directly.

Interactive menu UI

- Numeric menu: Present numbered options (1, 2, 3, ...) so admins can type a number to select an action. Show short descriptions and required preconditions.
- Guided prompts: After selection, ask only the required follow-up questions (env file, tag, UID). Validate inputs and show defaults in brackets.
- Progress feedback: Show step-by-step progress with clear status messages (Starting build → Built image → Running migrations → Deploy complete). Use spinners or simple [OK]/[FAIL] markers. Log verbose output to a file (eg. manage.log) while showing concise progress on-screen.
- Confirmation & dry-run: For destructive or stateful actions, show a summary and ask for confirmation. Offer --dry-run to simulate steps without making changes.
- Accessible flow: Allow keyboard shortcuts (q to quit, b to go back), and support --non-interactive to bypass the menu and use flags.

Sample interactive menu layout

1) Deploy application (build + migrations + up)
2) Redeploy (pull + rebuild + migrate)
3) Start services
4) Stop services
5) Status
6) Pull latest code
7) Delete / Prune (containers/images/volumes)
8) Admin: Create user
9) Admin: Reset password
10) Migrate DB / Show migrations
11) Backup / Restore
12) Logs (tail)
13) Exec shell in container
14) Health check
15) Update secrets
0) Exit

Interactive flows (examples)

- Deploy (1): Ask for env file [.env.production], image tag [latest], confirm, then run steps showing progress and tail logs on success.
- Admin:create-user (8): Prompt for UID, email (optional), password (masked input), role (admin/editor). Validate password strength and then create the user, showing success/failure with DB response.

Core features the manage script must provide:

- deploy: Build images, apply migrations, create or update stacks (docker-compose up -d or docker stack deploy). Supports --env-file and --tag options.
- redeploy: Pull latest code, rebuild images, stop old containers, run migrations, and bring up updated services with zero-downtime if possible.
- start / stop /restart /status: Manage containers or compose services.
- pull: Pull newest source from GitHub (git pull or fetch+reset for CI), optionally update submodules and tags.
- delete / prune: Stop and remove containers, networks, images, volumes (confirm interactive or --force).
- admin:create-user: Create an admin user in the database (interactive prompt for uid/password, or flags --uid/--password). Ensure password hashing.
- admin:reset-password: Reset an existing user's password.
- migrate / migrations: Run DB migrations and show status.
- backup / restore: Export and import DB and object store backups.
- logs: Tail service logs (docker-compose logs -f) and filter by service or date.
- exec: Run a shell or a one-off command in a running container (eg. exec web bash).
- status-check: Health-check endpoints, DB connectivity, and storage availability; exit non-zero on failure (useful for orchestration).
- cron-run / run-expiry-job: Trigger scheduled jobs (notice expiry) on demand.
- update-secrets: Rotate/update secrets in env files or secret stores.
- show-config: Print effective configuration (with secrets redacted).

Sample non-interactive usage examples

- ./manage.sh deploy --env-file .env.production --tag v1.2.0
- ./manage.sh redeploy --force
- ./manage.sh admin:create-user --uid admin --password "s3cret"
- ./manage.sh pull && ./manage.sh redeploy
- ./manage.sh logs --service web --follow

Security and operational notes

- Store secrets outside the repo (.env, Docker secrets, or a vault). manage script should never print plain secrets by default.
- Require confirmation for destructive operations (delete/prune) in interactive mode; support --yes for automation.
- Run DB migrations in a transaction or with a migration lock to prevent concurrent migrations.
- For production, prefer Docker Swarm/Kubernetes or systemd units to supervise processes and handle rolling updates.

Implementation guidance

- Implement the script in Bash/Python/Node to match the project stack. Provide a simple numeric-menu interactive UI with clear prompts, but also provide full CLI flags and a --non-interactive mode for automation.
- Use a logging file (manage.log) and display concise progress on-screen. Persist operation metadata (last deploy time, last deploy tag) in a small state file to show in the status screen.
- Use docker-compose (v2+) for simple installs; provide a docker-compose.override.yml for local development overrides.
- Provide a sample .env.example and a README section documenting manage script commands and required environment variables.

CI: Run lint and tests on PRs; automatic migrations on release.

Suggested tech stacks (pick one)

- Node stack: Express/Koa + Sequelize/TypeORM + React (Vite) + SQLite/Postgres + Multer for uploads
- Python stack: FastAPI/Django + SQLAlchemy/Django ORM + React or HTMX + SQLite/Postgres
- PHP stack: Laravel + Blade + MySQL/Postgres

Testing & quality

- Unit tests for models and API endpoints (pytest/mocha/jest)
- Integration test to validate notice expiry job behavior and audit logging
- Linters: ESLint/Prettier for JS, black/flake8 for Python

15 concise case studies (scenarios and recommended approaches)

1) Single-office deployment
- Single Docker instance, SQLite, local image storage. Keep retention short (90 days).

2) Multiple admins with roles
- Add role field and RBAC checks; audit admin actions (who created/edited links).

3) High traffic public page
- Cache the links listing in CDN; record visits asynchronously (queue worker) to avoid slowing redirects.

4) GDPR-sensitive environment
- Mask IPs, add consent banner, allow users to request deletion of stored visit records.

5) Many images and large media
- Use S3/MinIO and serve via CDN; store thumbnails for front page.

6) Auto-expiry reliability
- Run a scheduled worker (cron or cloud scheduled job) that atomically moves expired notices to archive.

7) Offline/air-gapped install
- Keep SQLite and file storage local; provide a manual backup/restore command and offline image upload UI.

8) Bulk import of links
- Provide CSV import with validation and dry-run preview; detect duplicates by URL.

9) Audit tampering protection
- Append-only storage for audit logs or use separate append-only journal (WAL) and periodic integrity snapshots.

10) Theming and branding per team
- Allow multiple theme presets and store per-link theme override; provide CSS variables per theme.

11) Scheduled publishing spikes
- Rate-limit scheduler to stagger publishes; use queued jobs to avoid DB contention.

12) Notice preview and staging
- Add a staging toggle where admins can preview notice on a staging subdomain before publishing.

13) Analytics for link clicks
- Aggregate visits per link daily and store summary table to avoid scanning raw logs for dashboards.

14) Migration from prototype to production
- Migrate SQLite to Postgres via dump/load; validate data types and reindex.

15) Disaster recovery
- Document RTO/RPO, automate DB backups to object storage daily, and provide a restore script.

Next steps / deliverables for review

- Create a repo README with chosen stack and commands (build/test/lint). Copilot can scaffold package.json/pyproject and CI if desired.
- Implement data models and basic API endpoints first (links, notices, auth, visits recording).
- Add admin UI mockups and theme definitions.

If this framework is acceptable, I can scaffold a minimal project (Node or Python) including package manifest, basic routes, DB migrations, and tests. Which stack should be scaffolded? (Node or Python)