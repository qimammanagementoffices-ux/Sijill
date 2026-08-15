-- Stable, human-readable request numbers. Existing requests are numbered by
-- creation order; database sequences make concurrent submissions collision-safe.

create sequence need_request_number_seq;
alter table need_request add column request_number bigint;
with numbered as (
    select id, row_number() over (order by created_at, id) as value
    from need_request
)
update need_request request
set request_number = numbered.value
from numbered
where request.id = numbered.id;
select setval('need_request_number_seq', coalesce(max(request_number), 0) + 1, false)
from need_request;
alter table need_request alter column request_number set default nextval('need_request_number_seq');
alter table need_request alter column request_number set not null;
alter sequence need_request_number_seq owned by need_request.request_number;
create unique index uq_need_request_request_number on need_request (request_number);

create sequence maintenance_request_number_seq;
alter table maintenance_request add column request_number bigint;
with numbered as (
    select id, row_number() over (order by created_at, id) as value
    from maintenance_request
)
update maintenance_request request
set request_number = numbered.value
from numbered
where request.id = numbered.id;
select setval('maintenance_request_number_seq', coalesce(max(request_number), 0) + 1, false)
from maintenance_request;
alter table maintenance_request alter column request_number set default nextval('maintenance_request_number_seq');
alter table maintenance_request alter column request_number set not null;
alter sequence maintenance_request_number_seq owned by maintenance_request.request_number;
create unique index uq_maintenance_request_request_number on maintenance_request (request_number);

create sequence asset_request_number_seq;
alter table asset_request add column request_number bigint;
with numbered as (
    select id, row_number() over (order by created_at, id) as value
    from asset_request
)
update asset_request request
set request_number = numbered.value
from numbered
where request.id = numbered.id;
select setval('asset_request_number_seq', coalesce(max(request_number), 0) + 1, false)
from asset_request;
alter table asset_request alter column request_number set default nextval('asset_request_number_seq');
alter table asset_request alter column request_number set not null;
alter sequence asset_request_number_seq owned by asset_request.request_number;
create unique index uq_asset_request_request_number on asset_request (request_number);
