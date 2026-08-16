# Local copy of production

Run the whole system on your machine, try a change, then deploy only once it
works. Production is `riyadh.sijill.digital`; nothing here touches it.

## One-time setup

**Install Docker Desktop** — https://www.docker.com/products/docker-desktop/

That is the only prerequisite. There is no Gradle wrapper in this repo, so
building the backend natively would need a JDK *and* Gradle; the `app` profile
builds it inside a container instead.

## Start it

```bash
cd "C:\Users\X-ThinkPad\Desktop\@@haytham\Sijill - New\sijill"
docker compose --profile app up -d --build
```

Keep the quotes — the path contains spaces and `@@`. Docker Desktop must be
running (whale icon in the tray), not merely installed.

First run takes several minutes (it downloads the Gradle image and the whole
dependency graph). Later runs are fast.

| Service | URL |
|---|---|
| Site | http://localhost:3000 |
| API | http://localhost:8080/api/v1 |
| MinIO console | http://localhost:9001 (`sijill_minio` / `sijill_minio_local_dev`) |
| Postgres | `localhost:5432` (`sijill` / `sijill_local_dev`) |

An empty database lands on `/onboarding` to create the first admin.

Stop with `docker compose --profile app down`. Add `-v` to also wipe the
database and start clean.

## Load a copy of production data

This is the point of the exercise — testing against real records, not an empty
database.

**First:** the local Postgres is 16 and production is 18. `pg_restore` refuses a
dump made by a newer `pg_dump`, so edit `docker-compose.yml` and change
`image: postgres:16` to `image: postgres:18`, then `docker compose down -v` and
start again.

Take a dump on the VPS and copy it down:

```bash
# on the VPS
cd ~/Sijill/infra/vps && set -a && . ./.env && set +a && \
  docker compose exec -T postgres pg_dump -U "$DATABASE_USERNAME" "$PGDATABASE" > ~/prod.dump
```

```bash
# on your machine
scp root@YOUR_VPS_IP:~/prod.dump ./prod.dump
```

Load it locally:

```bash
docker compose exec -T postgres psql -U sijill -d sijill < ./prod.dump
```

If the local database already has data, reset it first:

```bash
docker compose down -v && docker compose --profile app up -d --build
```

Attachments are **not** in the dump — they live in MinIO. Images will 404
locally, which is harmless for testing everything else. To copy them, mirror the
production bucket with `mc`.

## Normal workflow

```bash
git checkout -b my-feature
# edit code
docker compose --profile app up -d --build   # rebuild and try it
# once it works:
git add <specific files>
git commit
git push -u origin my-feature
```

Merge to `main` only after it works locally. Then deploy:

```bash
# on the VPS
cd ~/Sijill && git pull && cd infra/vps && docker compose up -d --build && docker compose restart caddy
```

## Faster frontend loop

Rebuilding the frontend container for every CSS tweak is slow. Run Next
natively against the containerised API instead — Node is already installed:

```bash
docker compose up -d                 # Postgres + MinIO
docker compose --profile app up -d api
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 npm run dev
```

That gives hot reload on http://localhost:3000. Backend changes still need
`docker compose --profile app up -d --build api`.

## Things that differ from production

- **No Caddy and no TLS.** Production serves the API and site from one origin
  (`/api/*` to the API); locally they are two origins on different ports, so
  CORS is live locally and absent in production. `FRONTEND_ORIGIN` is set to
  `http://localhost:3000` to allow it.
- **Postgres 16 vs 18** unless you change the image as above.
- **Local secrets are throwaway.** The JWT secret and MinIO credentials in
  `docker-compose.yml` are for local use only — never reuse them on the VPS.
- **Migrations run identically.** Flyway applies on API startup, so a bad
  migration fails here first, which is the main thing this setup buys you.

## Checking a migration before it reaches production

The most valuable use of this setup. After writing a new `V___.sql`:

```bash
docker compose --profile app up -d --build api
docker compose logs api --tail 40 | grep -i "flyway\|migrat\|error"
```

Look for `Successfully applied 1 migration`. If Flyway fails, the API will not
start — exactly what would otherwise take production down, caught locally.

Pick the next version number from `origin/main`, not from your local tree;
parallel branches collide otherwise.
