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

Contributing
- Open issues or PRs with feature requests. Suggested next work: add React frontend, implement secure auth (JWT/sessions), and add migrations/tests.

License
- Add a LICENSE file if desired.
