-- Phase 8: single-row maintenance-mode settings, same boolean-PK-with-check
-- trick as branding_setting (V10) so there's never more than one row.
-- reopen_at is informational only (shown as a countdown on the maintenance
-- page) -- it does NOT auto-disable maintenance mode; an admin always
-- toggles `enabled` off explicitly. See decision-record.md D6.

create table maintenance_setting (
    id                   boolean primary key default true check (id = true),
    enabled              boolean not null default false,
    message_ar           text,
    message_en           text,
    message_hi           text,
    image_attachment_id  uuid references attachment(id),
    reopen_at            timestamptz,
    version              integer not null default 0,
    updated_at           timestamptz not null default now()
);

insert into maintenance_setting (id) values (true);
