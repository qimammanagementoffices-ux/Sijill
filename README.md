# Sijill

Arabic-first internal web application for warehouse, maintenance, assets, and
employee management for one school. See `docs/` for the full specification,
decision record, and API conventions this build follows.

## Status

**Phase 1 of 7 — repository scaffold.** See `docs/decision-record.md` for the
schema-critical decisions this build assumes, and the master spec's §10 build
sequence for what's coming in each later phase.

## Prerequisites

See `docs/development-environment.md`-equivalent checklist (source doc:
`sijill-development-environment.md`) — JDK 21, Node.js LTS, Docker Desktop,
Git.

## First-time setup

```bash
git clone <repo-url>
cd sijill
cp .env.example .env   # fill in local values — never commit .env

# 1. Local services
docker compose up -d

# 2. Backend
cd backend
./gradlew bootRun      # run `gradle wrapper` first if wrapper files aren't present yet

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000 — first run lands on `/onboarding`.

## Repository structure

```text
/frontend    Next.js + TypeScript UI
/backend     Spring Boot API
/docs        decisions, API notes, deployment runbook
/infra       Render/deployment configuration and backup notes
/scripts     local setup and optional demo seed
docker-compose.yml
```

## Notes on this scaffold

- The backend was written and configured here but **not compiled** — this
  sandbox can't reach Maven Central. Run `./gradlew build` locally before
  trusting it compiles; report back anything that needs fixing.
- The frontend was written but **not installed/built** here either, to keep
  this phase fast — run `npm install && npm run build` locally to verify.
- Arabic/English UI strings in `frontend/src/i18n/dictionaries/` were written
  directly (not machine-translated), but still deserve a native-speaker
  read-through before this goes anywhere near production, same caution the
  spec applies to the optional translation helper.
- The third UI language required by the spec is intentionally not chosen yet
  — see decision record item #2 (deferred, not schema-critical).

## Do not

- Reintroduce Firebase/Firestore, base64 image fields, or a single JSON
  application-state document — see `sijill-master-spec.md` §1.
- Add a second persistence layer alongside PostgreSQL.
- Commit real secrets, `.env`, or seed data with real employee PII.
