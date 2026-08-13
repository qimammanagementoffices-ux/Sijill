create schema if not exists sijill_archive;

create table if not exists sijill_archive.room_location_v99 (
    room_id uuid primary key,
    building varchar(255),
    floor varchar(255),
    archived_at timestamptz not null default now()
);

insert into sijill_archive.room_location_v99 (room_id, building, floor)
select id, building, floor from room
on conflict (room_id) do nothing;

alter table room drop column if exists building;
alter table room drop column if exists floor;

-- Rollback path, if ever required:
-- alter table room add column building varchar(255);
-- alter table room add column floor varchar(255);
-- update room r set building = a.building, floor = a.floor
-- from sijill_archive.room_location_v99 a where a.room_id = r.id;
