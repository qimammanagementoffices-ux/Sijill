# Local copy of production

Run the system on your machine, try a change, then deploy only once it works.
Production is `riyadh.sijill.digital`; nothing here touches it.

## Prerequisites

- **Docker Desktop** — https://www.docker.com/products/docker-desktop/ (keep
  "Use WSL 2" checked, reboot after installing)
- **Node** — already present

No JDK or Gradle needed: the API builds inside a container.

## Start

Backend, database and object storage in containers:

```bash
cd "C:\Users\X-ThinkPad\Desktop\@@haytham\Sijill - New\sijill"
docker compose --profile app up -d --build
```

Frontend on the host, in a second terminal:

```bash
cd "C:\Users\X-ThinkPad\Desktop\@@haytham\Sijill - New\sijill\frontend"
$env:NEXT_PUBLIC_API_URL="http://localhost:8080/api/v1"; npm run dev
```

| Service | URL |
|---|---|
| Site | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| MinIO console | http://localhost:9001 (`sijill_minio` / `sijill_minio_local_dev`) |
| Postgres | `localhost:5432` (`sijill` / `sijill_local_dev`) |

An empty database lands on `/onboarding` to create the first admin. That
account is entirely separate from production.

Stop with `docker compose --profile app down`, plus `-v` to wipe the database.

## Why the frontend is not in a container

Next bakes `NEXT_PUBLIC_API_URL` into the browser bundle at build time. A
containerised frontend would need `localhost:8080` for the browser and
`api:8080` for its own server-side rendering — one variable, two required
values. A server-side override does not help either: `apiClient.ts` is imported
by `"use client"` components, and Next replaces every non-`NEXT_PUBLIC_`
variable with `undefined` in the client bundle, even when that code runs on the
server during SSR.

Running it on the host removes the split — browser and Node share one
`localhost` — and gives hot reload. Production is unaffected: there Caddy
serves the site and API from a single public origin, so one value works for
both.

## Load a copy of production data

Local Postgres is 16, production is 18, and `pg_restore` refuses a dump made by
a newer `pg_dump`. Change `image: postgres:16` to `postgres:18` in
`docker-compose.yml`, then `docker compose --profile app down -v` and start
again.

```bash
# on the VPS
cd ~/Sijill/infra/vps && set -a && . ./.env && set +a && \
  docker compose exec -T postgres pg_dump -U "$DATABASE_USERNAME" "$PGDATABASE" > ~/prod.dump
```

```bash
# on your machine
scp root@YOUR_VPS_IP:~/prod.dump ./prod.dump
docker compose exec -T postgres psql -U sijill -d sijill < ./prod.dump
```

Attachments live in MinIO, not the dump, so images 404 locally. Harmless for
everything else.

## Workflow

```bash
git checkout -b my-feature
# edit; the frontend hot-reloads, the backend needs:
docker compose --profile app up -d --build api
git add <specific files>
git commit
git push -u origin my-feature
```

Merge to `main` only once it works locally, then on the VPS:

```bash
cd ~/Sijill && git pull && cd infra/vps && docker compose up -d --build && docker compose restart caddy
```

## Checking a migration before production sees it

The main thing this setup buys. After writing a new `V___.sql`:

```bash
docker compose --profile app up -d --build api
docker compose logs api --tail 40 | grep -i "flyway\|migrat\|error"
```

Look for `Successfully applied 1 migration`. A bad migration stops the API
here instead of taking production down.

Pick the next version number from `origin/main`, not your local tree —
parallel branches collide otherwise.

## Differences from production

- **Two origins, so CORS is live.** Production serves site and API from one
  origin through Caddy and has no CORS at all. `FRONTEND_ORIGIN` is set to
  `http://localhost:3000` here to allow it.
- **Postgres 16 vs 18** unless changed as above.
- **Local secrets are throwaway** — never reuse the JWT secret or MinIO
  credentials in `docker-compose.yml` on the VPS.

## Docker Desktop troubleshooting

`request returned 500 Internal Server Error ... dockerDesktopLinuxEngine`
means the engine is wedged, not that anything is wrong with the project:

```bash
wsl --shutdown
```

then quit Docker Desktop from the tray and reopen it. Wait for
`docker version` to print a `Server:` section before running compose. A very
large build context can trigger this — `.dockerignore` in `frontend/` and
`backend/` keeps it small.
