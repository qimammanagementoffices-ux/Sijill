#!/usr/bin/env bash
# Copies both MinIO buckets to a second, off-server S3 target.
#
# Once object storage moves to MinIO, the database dumps BackupService writes
# and the attachment files both live on this machine's disk -- alongside the
# database they are meant to protect. A dump on the same disk as its source
# survives a bad migration or a dropped table; it does not survive the disk,
# the machine, or a mistaken `docker compose down -v`.
#
# Set the OFFSITE_* variables in .env and schedule this nightly:
#   0 3 * * * /root/Sijill/infra/vps/offsite-backup.sh >> /var/log/sijill-offsite.log 2>&1
#
# Supabase works as the target and is already paid for at zero -- but any
# S3-compatible endpoint that is not this server will do.

set -euo pipefail

cd "$(dirname "$0")"
set -a
. ./.env
set +a

: "${OFFSITE_ENDPOINT:?set OFFSITE_ENDPOINT in .env}"
: "${OFFSITE_ACCESS_KEY:?set OFFSITE_ACCESS_KEY in .env}"
: "${OFFSITE_SECRET_KEY:?set OFFSITE_SECRET_KEY in .env}"
: "${OFFSITE_BUCKET:?set OFFSITE_BUCKET in .env}"

echo "=== $(date -Is) starting off-site sync ==="

# --remove is deliberately NOT passed: a file deleted here should not vanish
# from the copy that exists to survive mistakes made here.
docker run --rm --network sijill_default --entrypoint sh minio/mc -c "
  mc alias set src http://minio:9000 '$MINIO_ROOT_USER' '$MINIO_ROOT_PASSWORD' &&
  mc alias set dst '$OFFSITE_ENDPOINT' '$OFFSITE_ACCESS_KEY' '$OFFSITE_SECRET_KEY' &&
  mc mirror --overwrite src/$OBJECT_STORAGE_BUCKET        dst/$OFFSITE_BUCKET/attachments &&
  mc mirror --overwrite src/$OBJECT_STORAGE_BACKUP_BUCKET dst/$OFFSITE_BUCKET/database
"

echo "=== $(date -Is) off-site sync complete ==="
