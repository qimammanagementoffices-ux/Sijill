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

**Pull every object down over HTTPS**, not over S3. Two S3 routes fail here:
`mc alias set` rejects an endpoint containing a path (Supabase's ends in
`/storage/v1/s3`), and the AWS CLI fails ListObjectsV2 against Supabase with
an empty error code — it signs with the project's real region, which is not
what `OBJECT_STORAGE_REGION` holds. The attachment bucket is public and every
URL is already in the database, so fetch exactly the objects the database
references:

```bash
docker compose exec -T postgres psql -U sijill -d sijill -At -F'|' -c "select storage_key, url from attachment where storage_key is not null" > attachments.txt
```

```bash
mkdir -p objects && while IFS='|' read -r key url; do [ -z "$key" ] && continue; mkdir -p "objects/$(dirname "$key")"; curl -fsSL "$url" -o "objects/$key" || echo "FAILED $key"; done < attachments.txt
```

```bash
find objects -type f | wc -l
```

Any `FAILED` line is a row whose object is already missing from the bucket —
broken on the live site today, and worth knowing about. Migrating cannot fix
those; it only stops hiding them.

**Push them into MinIO**, creating both buckets under the same names and
granting anonymous read to the attachment bucket only:

```bash
docker run --rm --network sijill_default -v "$PWD/objects:/data" --entrypoint sh minio/mc -c "mc alias set dst http://minio:9000 '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' && mc mb -p dst/$OBJECT_STORAGE_BUCKET dst/$OBJECT_STORAGE_BACKUP_BUCKET && mc mirror --overwrite /data dst/$OBJECT_STORAGE_BUCKET && mc anonymous set download dst/$OBJECT_STORAGE_BUCKET && mc ls --recursive dst/$OBJECT_STORAGE_BUCKET | wc -l"
```

Both counts must match. Then remove the local copy — it is a complete set of
your attachments sitting in the deploy directory:

```bash
rm -rf objects
```

**Rewrite the stored URLs.** Take the prefix from the data, not from
`$OBJECT_STORAGE_PUBLIC_URL_BASE` — the two can differ (Supabase serves public
objects from `<ref>.storage.supabase.co` while the configured base may say
`<ref>.supabase.co`), and a prefix that does not match updates nothing while
reporting success:

```bash
docker compose exec -T postgres psql -U sijill -d sijill -At -c "select distinct regexp_replace(url, '(/[^/]+/[^/]+)$', '') from attachment;"
```

That prints the real prefix (or several, if history left more than one — then
repeat the update for each). Count what will change, then change it:

```bash
docker compose exec postgres psql -U sijill -d sijill -c "select count(*) from attachment where url like 'PASTE_PREFIX%';"
```

```bash
docker compose exec postgres psql -U sijill -d sijill -c "update attachment set url = replace(url, 'PASTE_PREFIX', 'https://$SIJILL_DOMAIN/files');"
```

The `UPDATE n` must equal the count. This is done as a one-time statement rather than a
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

## 9. Get the backups off this machine

Do this in the same sitting as step 8, because step 8 is what creates the
problem: with storage on MinIO, the database dumps `BackupService` writes and
every attachment file both live on **this disk**, next to the database they
exist to protect. That covers a dropped table or a bad migration. It does not
cover the disk, the machine, or a mistyped `docker compose down -v`.

Nothing ever backed up the attachment files, on Supabase either — this closes
both gaps at once.

Fill the `OFFSITE_*` values in `.env` (the old Supabase project is a fine
target — it is off this server, which is the whole requirement), then:

```bash
chmod +x offsite-backup.sh && ./offsite-backup.sh
```

Once it works, schedule it nightly, an hour after the app's own 02:00 UTC
database backup so it has something fresh to copy:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * $PWD/offsite-backup.sh >> /var/log/sijill-offsite.log 2>&1") | crontab -
```

The script never passes `--remove`: a file deleted here should not disappear
from the copy that exists to survive mistakes made here.

**A backup you have not restored is not a backup.** Once a month, restore the
newest dump into a scratch database and count some rows:

```bash
docker compose exec postgres createdb -U sijill restore_test
```

```bash
docker compose exec postgres psql -U sijill -d restore_test -c "select count(*) from need_request;"
```

```bash
docker compose exec postgres dropdb -U sijill restore_test
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
