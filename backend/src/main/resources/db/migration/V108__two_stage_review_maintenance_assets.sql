-- The maintenance and asset half of the two-stage review; V109 carries the
-- need-request half and seeds the mt./as. countersign permissions. The two are
-- independent, so this running first is harmless -- the numbering only reads
-- backwards because the need-request file was renumbered off a collision.
-- Same column widening: APPROVED_UNDER_REVIEW / REJECTED_UNDER_REVIEW are 21
-- characters and the status columns are varchar(20).
alter table maintenance_request alter column status type varchar(32);
alter table maintenance_request_action alter column action type varchar(32);
alter table asset_request alter column status type varchar(32);
alter table asset_request_action alter column action type varchar(32);

alter table maintenance_request add column if not exists postponed_until date;
alter table maintenance_request add column if not exists returned_by_senior boolean not null default false;
alter table maintenance_request add column if not exists archived_at timestamptz;
alter table maintenance_request add column if not exists archived_by_employee_id uuid references employee(id);

alter table asset_request add column if not exists postponed_until date;
alter table asset_request add column if not exists returned_by_senior boolean not null default false;
alter table asset_request add column if not exists archived_at timestamptz;
alter table asset_request add column if not exists archived_by_employee_id uuid references employee(id);

create index if not exists idx_maintenance_request_postponed_until
    on maintenance_request (postponed_until) where postponed_until is not null;
create index if not exists idx_asset_request_postponed_until
    on asset_request (postponed_until) where postponed_until is not null;

-- Maintenance gains a DONE step between IN_PROGRESS and CLOSED: DONE is the
-- technician reporting the work, CLOSED is the requester accepting it. Rows
-- closed under the old flow were closed by the technician alone, which is
-- exactly what DONE now means -- but they are finished business, so they stay
-- CLOSED rather than being reopened for a confirmation nobody is waiting on.

insert into translation (key, value_ar, value_en, value_hi) values
    ('requestStatus.DONE', 'مكتمل', 'Completed', 'पूर्ण'),
    ('maintenanceRequests.startWork', 'بدأ التنفيذ', 'Start work', 'कार्य शुरू करें'),
    ('maintenanceRequests.finishWork', 'إنهاء العمل', 'Finish work', 'कार्य पूर्ण करें')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
