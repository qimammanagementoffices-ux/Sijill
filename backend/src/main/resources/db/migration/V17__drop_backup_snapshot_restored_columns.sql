-- Phase 7 follow-up: V15 added restored_at/restored_by to backup_snapshot to
-- record which snapshot a restore used as its source and when. That doesn't
-- work: a restore replaces the entire backup_snapshot table with whatever
-- was in the dump, and the target snapshot's own row was always inserted
-- AFTER its own dump was taken (see BackupService.captureSnapshot — the dump
-- runs first, then the row is saved), so the row being restored can never
-- contain itself. Every restore attempt would 404 trying to update it.
-- The BACKUP_RESTORED audit log entry (a soft, non-FK reference to the
-- snapshot id) is the correct place for this — it survives the restore
-- (written after) and doesn't depend on any specific row still existing.

alter table backup_snapshot drop column restored_at;
alter table backup_snapshot drop column restored_by;
