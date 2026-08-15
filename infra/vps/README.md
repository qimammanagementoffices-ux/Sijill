# Moving Sijill to a VPS

Ubuntu 24.04 LTS with Docker. Run every command as a non-root user with docker
access. Nothing here needs to be pasted to anyone — the secrets stay on the
server.

The order matters in one place: **restore the database before the API starts
for the first time.** Flyway creates the schema on an empty database, and a
dump restored on top of that collides.

## 1. DNS first

Point an `A` record for your domain at the VPS IP address, and wait until it
resolves:

```bash
dig +short sijill.example.com
```

Caddy requests the certificate on first start. If the domain does not resolve
yet, that request fails and Let's Encrypt rate-limits repeated attempts.

## 2. Firewall

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

Postgres is deliberately not exposed — it has no `ports:` entry and is reachable
only from the other containers.

## 3. Get the code and the settings

```bash
git clone https://github.com/qimammanagementoffices-ux/Sijill.git && cd Sijill/infra/vps
cp .env.example .env
```

Fill in `.env`. The object storage values must be copied **verbatim** from the
Render dashboard (`sijill-api` → Environment): the attachment URLs already
stored in the database point at that bucket, so it has to stay the same.

Generate the two secrets:

```bash
openssl rand -base64 48
```

## 4. Move the data

Get the **External Database URL** from the Render dashboard (`sijill-postgres`
→ Connections). Then, from `infra/vps`:

```bash
docker compose up -d postgres
```

```bash
docker compose run --rm -v "$PWD:/backup" postgres pg_dump "PASTE_RENDER_EXTERNAL_URL" -Fc -f /backup/sijill.dump
```

```bash
docker compose run --rm -v "$PWD:/backup" postgres pg_restore --no-owner --no-privileges -d "postgresql://$DATABASE_USERNAME:$DATABASE_PASSWORD@postgres:5432/$PGDATABASE" /backup/sijill.dump
```

Confirm the data arrived before going further:

```bash
docker compose exec postgres psql -U "$DATABASE_USERNAME" -d "$PGDATABASE" -c "select count(*) from need_request;"
```

Then delete the dump — it contains every record you have:

```bash
shred -u sijill.dump
```

## 5. Start everything

```bash
docker compose up -d --build
```

The first build takes a few minutes. Watch it come up:

```bash
docker compose logs -f api
```

Flyway will apply only the migrations the dump did not already contain, and
`Started SijillApiApplication` should appear in well under a minute — on Render
it took 197 seconds.

## 6. Verify

```bash
curl -sS https://sijill.example.com/api/v1/i18n/locales
```

Then open the site, log in, and check the warehouse request list.

**Run one backup by hand** (admin → backups) before you trust the schedule. The
API shells out to `pg_dump`, and that client must be at least as new as the
server. If it fails with a version mismatch, pin the matching client in
`backend/Dockerfile`:

```
RUN apk add --no-cache postgresql18-client
```

## Afterwards

- `docker compose ps` — what is running
- `docker compose logs -f api` — application logs
- `docker compose down && docker compose up -d --build` — deploy a new version
- `docker compose exec postgres psql -U sijill -d sijill` — a database shell

Two things Render used to do that are now yours: the **daily backup** (the app
does it, but nobody else checks it — restore one into a scratch database
occasionally and confirm it actually works), and **OS updates**
(`sudo apt update && sudo apt upgrade`).

Keep the Render services running until the VPS has served real traffic for a
few days. Switching back is a DNS change as long as they still exist.
