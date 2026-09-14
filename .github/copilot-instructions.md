# Copilot instructions for this repository

Summary
- Current repo contents: requirement.md (project requirements/spec). No package.json, pyproject.toml, Makefile, README.md, or CI manifests detected.

1) Build, test, and lint commands
- Detected: none.
- Recommended places to look for commands if added later: package.json (scripts), Makefile, pyproject.toml (tool.poetry or [tool.pytest]), tox.ini, or .github/workflows/*.yml.
- Examples to include in package.json (Node):
  - "test": "mocha" or "jest"
  - run a single test: `npm test -- tests/path/to/test.spec.js` or `npx mocha tests/some.test.js`
- Examples for Python:
  - full suite: `pytest`
  - single test: `pytest tests/test_file.py::TestClass::test_name -q`
- Add short scripts in CI so Copilot can reference canonical commands (e.g., `scripts.test-single`).

2) High-level architecture (observed from requirement.md)
- Purpose: a lightweight web application that exposes a professional front page linking to repositories and resources, plus an admin UI for managing links and notices.
- Core domains:
  - Public front page: lists links (image + heading + short description) that users can click through.
  - Admin section: authentication (uid/password), CRUD for links, theme selection (5+ theme options), enable/disable links.
  - Auditing: capture visitor IP and timestamp for link visits; store audit logs in a lightweight DB.
  - Notice board: admin-published notices with image/heading/description, publish date and expiry date; support automatic expiry and historical archive.
- Typical components to expect/implement: frontend (static assets or SPA), backend API (REST/GraphQL), database (SQLite/Postgres for lightweight audit/history), job/cron for expiry handling.

3) Key conventions and repository signals for Copilot sessions
- Single source of truth for link metadata: expect a model/table named Link (fields: id, url, image, heading, description, enabled, theme_tag).
- Audit logs should be append-only; look for files or db tables named audit, visits, or logs.
- Notices should include publish_at and expires_at; search for cron, scheduler, or background job code when implementing expiry.
- Admin auth is basic uid/password per spec; if integrating SSO later, document where to swap auth providers.

4) Files and locations to check first
- Look for: package.json, pyproject.toml, requirements.txt, Pipfile, server/ or src/ directories, frontend/ or public/, migrations/ or db/, and .github/workflows/*.yml.
- If missing, create a minimal README and package manifest so Copilot has canonical run/test/lint commands to reference.

5) AI assistant / tooling configs
- No CLAUDE.md, .cursorrules, AGENTS.md, CONVENTIONS.md, .windsurfrules, or similar files were found. If you have internal assistant rules, add them to the repo so Copilot can incorporate them.

Notes for future Copilot sessions
- If asked to implement features, prioritize creating or updating a manifest (package.json/pyproject) and README to expose exact commands. Copilot will then reference those scripts when suggesting edits or CI.

---
If you'd like, Copilot can generate a starter package.json, pyproject.toml, or a minimal README/Makefile to codify build/test/lint commands. Tell me which stack (Node, Python, Ruby, etc.) to target and whether to include CI workflow examples.
