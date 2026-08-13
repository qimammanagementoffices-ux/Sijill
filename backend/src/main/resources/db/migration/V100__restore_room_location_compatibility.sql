-- Render keeps the previous API instance serving during a rolling deploy.
-- V99 removed these columns before that instance stopped, so any old query
-- loading Room failed. Keep the columns as ignored compatibility storage;
-- the current entity, DTOs, forms, tables and exports no longer expose them.
alter table room add column if not exists building varchar(255);
alter table room add column if not exists floor varchar(255);

update room r
set building = a.building,
    floor = a.floor
from sijill_archive.room_location_v99 a
where a.room_id = r.id
  and r.building is null
  and r.floor is null;
