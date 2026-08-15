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
#
# Uses the AWS CLI rather than mc for both hops: `mc alias set` rejects an
# endpoint URL containing a path, and Supabase's ends in /storage/v1/s3.
# There is no direct copy between two different endpoints, so this stages
# through a temp directory and removes it afterwards.

set -euo pipefail

cd "$(dirname "$0")"
set -a
. ./.env
set +a

: "${OFFSITE_ENDPOINT:?set OFFSITE_ENDPOINT in .env}"
: "${OFFSITE_ACCESS_KEY:?set OFFSITE_ACCESS_KEY in .env}"
: "${OFFSITE_SECRET_KEY:?set OFFSITE_SECRET_KEY in .env}"
: "${OFFSITE_BUCKET:?set OFFSITE_BUCKET in .env}"

STAGE="$(mktemp -d)"
# Runs on any exit, including a failure part-way: the staging directory holds
# every attachment and every database dump in the clear.
trap 'rm -rf "$STAGE"' EXIT

echo "=== $(date -Is) starting off-site sync ==="

pull() {
  docker run --rm --network sijill_default -v "$STAGE:/data" \
    -e AWS_ACCESS_KEY_ID="$MINIO_ROOT_USER" \
    -e AWS_SECRET_ACCESS_KEY="$MINIO_ROOT_PASSWORD" \
    -e AWS_DEFAULT_REGION=us-east-1 \
    amazon/aws-cli s3 sync "s3://$1" "/data/$2" --endpoint-url http://minio:9000
}

push() {
  # No --delete: a file removed here should not vanish from the copy that
  # exists to survive mistakes made here.
  docker run --rm -v "$STAGE:/data" \
    -e AWS_ACCESS_KEY_ID="$OFFSITE_ACCESS_KEY" \
    -e AWS_SECRET_ACCESS_KEY="$OFFSITE_SECRET_KEY" \
    -e AWS_DEFAULT_REGION="${OFFSITE_REGION:-us-east-1}" \
    amazon/aws-cli s3 sync "/data/$2" "s3://$OFFSITE_BUCKET/$2" --endpoint-url "$OFFSITE_ENDPOINT"
}

pull "$OBJECT_STORAGE_BUCKET" attachments
pull "$OBJECT_STORAGE_BACKUP_BUCKET" database
push "$OBJECT_STORAGE_BUCKET" attachments
push "$OBJECT_STORAGE_BACKUP_BUCKET" database

echo "staged $(find "$STAGE" -type f | wc -l) files"
echo "=== $(date -Is) off-site sync complete ==="
