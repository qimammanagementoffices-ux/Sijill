-- Phase 7: adds restore on top of Phase 6c's backup-only feature. A restore
-- always takes its own safety snapshot first (triggered_by = 'PRE_RESTORE')
-- before overwriting the live database, and stamps the snapshot it restored
-- from with restored_at/restored_by.

alter table backup_snapshot drop constraint backup_snapshot_triggered_by_check;
alter table backup_snapshot add constraint backup_snapshot_triggered_by_check
    check (triggered_by in ('SCHEDULED', 'MANUAL', 'PRE_RESTORE'));

alter table backup_snapshot add column restored_at timestamptz null;
alter table backup_snapshot add column restored_by uuid null references employee(id);
