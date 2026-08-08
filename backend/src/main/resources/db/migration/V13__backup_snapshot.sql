-- Phase 6c: daily dataset backup metadata. The actual dump file lives in
-- object storage (same bucket as attachments, "backups/" prefix); this
-- table is just the admin-panel-visible index of what's there.

create table backup_snapshot (
    id              uuid primary key default gen_random_uuid(),
    storage_key     text not null,
    filename        varchar(255) not null,
    size_bytes      bigint not null,
    triggered_by    varchar(20) not null check (triggered_by in ('SCHEDULED', 'MANUAL')),
    created_at      timestamptz not null default now()
);

create index idx_backup_snapshot_created_at on backup_snapshot (created_at);
