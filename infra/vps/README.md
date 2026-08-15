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
→ Connections). Then, from `infra/vps`, load the settings into your shell —
the restore command below reads them, and a fresh session does not have them:

```bash
set -a; . ./.env; set +a
```

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

## 7. Deploy on push

`.github/workflows/vps-deploy.yml` runs after CI passes and rebuilds on the
server. It needs a key that exists only between GitHub and this machine — not
your personal SSH key.

On the **server**:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions"
```

```bash
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
```

```bash
cat ~/.ssh/github_deploy
```

Copy that private key into GitHub → Settings → Secrets and variables → Actions,
along with the rest:

| Secret | Value |
| --- | --- |
| `VPS_SSH_KEY` | the whole private key, `BEGIN`/`END` lines included |
| `VPS_HOST` | the server's IP or hostname |
| `VPS_USER` | the user you are logged in as |
| `VPS_APP_DIR` | clone path, if not `~/Sijill` |
| `VPS_PORT` | SSH port, if not 22 |
| `SIJILL_URL` | `https://sijill.example.com` — enables the post-deploy check |

Then delete the private key from the server, since GitHub now holds it:

```bash
shred -u ~/.ssh/github_deploy
```

Without `VPS_HOST` the workflow skips itself, so nothing breaks before the
secrets exist. Test it with **Actions → vps-deploy → Run workflow**.

Once the VPS is serving real traffic, remove the `deploy` job from
`backend-ci.yml` and `frontend-ci.yml` so pushes stop deploying to Render too.

## 8. Move object storage off Supabase

Only do this once the site is working. Attachment URLs are stored **absolute**
in `attachment.url` — `StorageService` saves the full
`<public-url-base>/<bucket>/<key>` at upload time — so switching the settings
alone would break every existing attachment while new uploads worked.

Order matters: mirror the objects **before** changing anything, because the
copy reads from Supabase using the settings currently in `.env`.

**Set the MinIO credentials** and start it:

```bash
sed -i "s|^MINIO_ROOT_PASSWORD=.*|MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)|" .env
```

```bash
set -a; . ./.env; set +a && docker compose up -d minio
```

**Copy every object across**, create the buckets under the same names, and make
only the attachment bucket publicly readable:

```bash
docker run --rm --network sijill_default --entrypoint sh minio/mc -c "mc alias set src '$OBJECT_STORAGE_ENDPOINT' '$OBJECT_STORAGE_ACCESS_KEY' '$OBJECT_STORAGE_SECRET_KEY' && mc alias set dst http://minio:9000 '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' && mc mb -p dst/$OBJECT_STORAGE_BUCKET dst/$OBJECT_STORAGE_BACKUP_BUCKET && mc mirror --overwrite src/$OBJECT_STORAGE_BUCKET dst/$OBJECT_STORAGE_BUCKET && mc anonymous set download dst/$OBJECT_STORAGE_BUCKET && mc ls --recursive dst/$OBJECT_STORAGE_BUCKET | wc -l"
```

The last number is how many objects arrived. Compare it with Supabase before
continuing — this is the only point where a miscount is cheap to fix.

**Rewrite the stored URLs.** Check what it will change first:

```bash
docker compose exec postgres psql -U sijill -d sijill -c "select count(*) from attachment where url like '$OBJECT_STORAGE_PUBLIC_URL_BASE%';"
```

```bash
docker compose exec postgres psql -U sijill -d sijill -c "update attachment set url = replace(url, '$OBJECT_STORAGE_PUBLIC_URL_BASE', 'https://$SIJILL_DOMAIN/files') where url like '$OBJECT_STORAGE_PUBLIC_URL_BASE%';"
```

The two counts must match. This is done as a one-time statement rather than a
Flyway migration because the replacement is specific to this deployment's
domain, and a migration is immutable once applied.

**Switch the settings:**

```bash
sed -i "s|^OBJECT_STORAGE_ENDPOINT=.*|OBJECT_STORAGE_ENDPOINT=http://minio:9000|" .env
sed -i "s|^OBJECT_STORAGE_PUBLIC_URL_BASE=.*|OBJECT_STORAGE_PUBLIC_URL_BASE=https://$SIJILL_DOMAIN/files|" .env
sed -i "s|^OBJECT_STORAGE_ACCESS_KEY=.*|OBJECT_STORAGE_ACCESS_KEY=$MINIO_ROOT_USER|" .env
sed -i "s|^OBJECT_STORAGE_SECRET_KEY=.*|OBJECT_STORAGE_SECRET_KEY=$MINIO_ROOT_PASSWORD|" .env
```

```bash
set -a; . ./.env; set +a && docker compose up -d --build
```

**Verify all four:** an old attachment still opens, a new upload works, the
backup bucket refuses anonymous access, and a manual backup succeeds.

```bash
curl -s -o /dev/null -w "%{http_code}\n" "https://$SIJILL_DOMAIN/files/$OBJECT_STORAGE_BACKUP_BUCKET/"
```

That must **not** be 200. Anything other than a listing means the private
bucket stayed private.

Leave the Supabase buckets untouched for a couple of weeks. They cost nothing
and they are the rollback: putting the old values back in `.env` and reversing
the `replace()` restores the previous state exactly.

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
