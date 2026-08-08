-- Phase 7: adds restore on top of Phase 6c's backup-only feature. A restore
-- always takes its own safety snapshot first (triggered_by = 'PRE_RESTORE')
-- before overwriting the live database, and stamps the snapshot it restored
-- from with restored_at/restored_by.

-- Looks up the existing check constraint on triggered_by by its actual
-- definition rather than assuming Postgres's auto-generated name — the
-- guessed name (backup_snapshot_triggered_by_check) broke every test in CI
-- when it didn't exactly match what V13 actually got, taking the whole
-- shared test database schema down with it.
do $$
declare
    existing_constraint text;
begin
    select con.conname into existing_constraint
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'backup_snapshot'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%triggered_by%';

    if existing_constraint is not null then
        execute format('alter table backup_snapshot drop constraint %I', existing_constraint);
    end if;
end $$;

alter table backup_snapshot add constraint backup_snapshot_triggered_by_check
    check (triggered_by in ('SCHEDULED', 'MANUAL', 'PRE_RESTORE'));

alter table backup_snapshot add column restored_at timestamptz null;
alter table backup_snapshot add column restored_by uuid null references employee(id);
