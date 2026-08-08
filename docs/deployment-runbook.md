# Deployment runbook

Operational reference for Sijill in production (Render). For initial
provisioning, see `infra/README.md` — this doc doesn't repeat that, it
covers what to do once the app is already live: deploying changes, rolling
back, rotating credentials, restoring from backup, and a first-response
checklist for a single-maintainer app. Scoped for a small internal school
tool — no formal SLOs, paging rotation, or incident-severity taxonomy here.

## 1. Overview

Three Render services plus one external dependency:

- `sijill-api` — Spring Boot backend (Docker), health check `/actuator/health`
- `sijill-frontend` — Next.js frontend (Node runtime)
- `sijill-postgres` — managed Postgres (free plan)
- Object storage — S3-compatible (Supabase Storage), external to Render, holds attachments and backup dumps

## 2. Normal deploy

Both services have `autoDeploy: false` in `render.yaml` — Render no longer
watches `main` directly. A deploy now only happens via the `deploy` job at
the bottom of `.github/workflows/backend-ci.yml` / `frontend-ci.yml`, which
runs *only after* the `build` job (tests, typecheck, lint) succeeds on a push
to `main`, and POSTs to that service's Render **Deploy Hook** URL.

**One-time setup required** (not done automatically — GitHub secrets and the
Render dashboard both need a human with account access):
1. For each service, Render dashboard → service → **Settings** → **Deploy
   Hook** → copy the URL.
2. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → New
   repository secret:
   - `RENDER_DEPLOY_HOOK_BACKEND` = `sijill-api`'s deploy hook URL
   - `RENDER_DEPLOY_HOOK_FRONTEND` = `sijill-frontend`'s deploy hook URL

**Until both secrets are set, pushes to `main` build and test but do not
deploy anywhere** — the `deploy` job detects the missing secret and exits
cleanly rather than failing CI, logging a reminder instead. Use Render's
**Manual Deploy** button in the meantime, or finish the setup above.

A failing `build` job now genuinely blocks deployment — a commit that breaks
tests can no longer ship, unlike before.

Free-tier web services cold-start after 15 minutes idle — the first request
after idle time will be slow; this is expected, not an incident.

## 3. Rollback

Each Render service keeps prior deploys — use the service's **Deploys** tab
and "Rollback to this deploy" for `sijill-api` or `sijill-frontend`
independently; they don't need to roll back together unless the change that
broke things touched both.

**Rollback does not undo a database migration.** Flyway migrations
(`backend/src/main/resources/db/migration/`) are forward-only — there is no
down-migration mechanism in this project. If a bad deploy included a schema
change that needs undoing:
- If it's purely additive and harmless to leave (e.g. an unused new column), just roll back the code and leave the schema as-is.
- If it actually broke data, restore from a backup snapshot (section 5) rather than hand-writing a reverse migration under pressure.

## 4. Database credential rotation

**Known incident (2026-08-07):** rotating the Postgres credential in the
Render dashboard did not update `sijill-api`'s connection — Render's
`fromDatabase` / `property: user` binding always resolves to the database's
*original owner* role, not whichever credential was most recently rotated
in. The API went down with its DB role stuck on `NOLOGIN`. This is why
`DATABASE_USERNAME` / `DATABASE_PASSWORD` are `sync: false` in `render.yaml`
(see the comment there) — they must be set manually.

**To rotate credentials without repeating this:**
1. Create/rotate the credential in the Render Postgres dashboard.
2. Immediately update `DATABASE_USERNAME` and `DATABASE_PASSWORD` under `sijill-api` → Environment to match.
3. Trigger a manual deploy/restart of `sijill-api` — don't wait for the next push.
4. Confirm `/actuator/health` returns healthy before considering the rotation done.

## 5. Backup & restore / DR drill

- Scheduled backups run daily at 02:00 server time (`BackupScheduler`, cron `0 0 2 * * *`), uploading a `pg_dump -Fc` snapshot to the private `backups/` prefix of the object storage bucket (never a public URL — dumps contain PII and PIN hashes).
- Manual backup: `/admin/backups` → "Run backup now" (requires `sys.backup`).
- Restore: same page → "Restore" on any snapshot → re-enter your PIN to confirm. This always takes a fresh safety snapshot of the *current* state first (tagged "Pre-restore" in the list) before overwriting the live database, and force-logs out the current session afterward (the restore may have replaced the employee table under you).
- Restore is rate-limited (3 attempts/60s per employee) and audited (`BACKUP_RESTORED` entries in the audit log, viewable with `sys.audit.view`).
- **Backup history survives restores — it's the one deliberate exception to "restore rolls back everything."** The `backup_snapshot` table (and its rows — your list of backups, including ones taken after the snapshot you're restoring to) is excluded from both what gets dumped and what gets replaced during a restore. Without this, every restore would make the `/admin/backups` list appear to lose history (the target snapshot's own row, and anything created after it) even though the actual dump files in object storage are never touched — confusing enough that it's handled specially rather than left as "technically correct but alarming."
- **After every successful restore, manually restart `sijill-api` in the Render dashboard — this is a required step, not optional cleanup.** The schema-reset-and-restore process leaves the still-running app instance's DB connection pool and cached ORM metadata stale against the new schema; every DB-backed endpoint will 500 until the service is restarted. An automatic self-restart (`System.exit(0)`, relying on Render restarting a web service whose process exits) was tried and reverted — confirmed live that it does not reliably bring the service back within any reasonable window, turning a partial problem into the whole app being stuck down. The restore-success message shown in the UI reminds the admin who triggered it to do this restart immediately.
- If `pg_restore` itself fails partway (corrupt/incompatible dump, connection drop mid-restore), the backend automatically attempts to roll back to the pre-restore snapshot it just took, rather than leave the database empty. The error response says which happened: rolled back successfully (retry later, or investigate the original dump, and still restart `sijill-api` per the point above since the schema was reset either way), or — rare, and serious — rollback also failed, naming the pre-restore snapshot id to restore from manually via `pg_restore` on a scratch instance immediately.

**Periodic drill (recommended quarterly):** restore a recent snapshot into a
scratch environment — a local `docker-compose` Postgres or a throwaway
Render Postgres instance, pointed at by a local backend run with matching
`PGHOST`/`PGDATABASE`/credentials — never against production. Download the
snapshot via the admin UI, and against an *empty* scratch database run
`pg_restore --no-owner --no-privileges -d <scratch db> <file>` (no `--clean`
needed since the target is already empty; the dump won't contain
`backup_snapshot` — that table is deliberately excluded, see above), and
spot-check row counts on a few core tables (`employee`, `inventory_item`,
`asset`). This validates the dump is actually restorable, not just that the
backup job ran.

## 6. Monitoring & health checks

`/actuator/health` is the only wired health check today — Render uses it to
decide whether to restart the `sijill-api` instance, but that's it; nothing
currently pages or emails anyone when it goes unhealthy. Render's own
service-status emails are the only automatic notification.

**Setup (manual — requires creating a third-party account, which needs a
human, not something Claude Code can do on your behalf):**

1. Go to [uptimerobot.com](https://uptimerobot.com) (free tier: 50 monitors,
   5-minute check interval) and create an account.
2. Add a monitor:
   - Type: HTTP(s)
   - URL: `https://sijill-api.onrender.com/actuator/health`
   - Interval: 5 minutes (free tier minimum)
3. Add a second monitor the same way for the frontend:
   - URL: `https://sijill-frontend.onrender.com`
4. Under each monitor's **Alert Contacts**, add your email (and/or phone for
   SMS, if on a paid tier) so a down alert actually reaches someone instead
   of only showing up on the UptimeRobot dashboard.
5. Free-tier caveat: both services cold-start after 15 minutes idle (section
   2) — a 5-minute ping interval keeps `sijill-api` and `sijill-frontend`
   effectively always-warm as a side effect, which also means you won't see
   the cold-start delay in normal use anymore once this is set up.

## 7. On-call basics (single maintainer)

- **Logs**: Render dashboard → service → Logs tab (streamed; retention is Render's default window, not extended).
- **`traceId`**: every API error response includes one (`error.traceId`) — grep the log stream for it to find the exact request/exception.
- **API down**: check `/actuator/health` first, then the Logs tab for a crash-loop pattern (commonly a bad env var after a credential rotation — see section 4). Check Render's status page for a platform-wide incident before assuming it's app-side.
- **Frontend down**: check the frontend service's own Logs tab; also check whether `sijill-api` is down, since most frontend pages depend on it.
- **No paging exists.** If you're not actively watching, you won't know until a user reports it or you check manually — see section 6 for the recommended mitigation.

## 8. Known gaps

- **View As mode** (spec: admins viewing the app as another role, for permission testing) — not implemented. Deferred out of Phase 7 as its own follow-up (comparable in size to the restore feature: needs frontend UI, backend read-scoping that never bypasses `@PreAuthorize`, and escalation tests).
- **No CSP** — deliberately skipped; this is a JSON API with no page content of its own to protect (see the comment in `SecurityConfig.java`).
- ~~Rate limiting is single-instance, in-memory~~ — fixed: `LoginRateLimiter`/`RestoreRateLimiter` are now backed by `RateLimitStore` (a Postgres table, `rate_limit_window`), correct across any number of API instances without a new paid dependency.
- **`JWT_REFRESH_TOKEN_EXPIRY_DAYS`** — removed in Phase 7. It was set in `render.yaml`/`application.yml` but no refresh-token code ever existed (`JwtService` only issues access tokens); the dead env var was creating false confidence.
- ~~CI and Render deploy are unlinked~~ — fixed, see section 2 (`autoDeploy: false` + CI-triggered Deploy Hooks). Needs the two GitHub secrets set once before it's actually active.
- **AI language auto-translation needs manual setup before it works.** `/admin/languages` → "Add and auto-translate" calls `TRANSLATION_API_KEY` (Anthropic), which is `sync: false` in `render.yaml` — set it manually in the `sijill-api` Environment tab, then flip `TRANSLATION_HELPER_ENABLED` to `"true"` and redeploy/restart. Until then, adding a language fails with a clear "AI translation is not enabled" error (safe — no partial state beyond an empty language row you can delete).
