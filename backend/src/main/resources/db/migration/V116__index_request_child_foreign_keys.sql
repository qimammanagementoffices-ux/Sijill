-- Postgres does not index a foreign key just because it is one. Every request
-- loads its lines and its action log, so each list page runs
-- "where <parent>_id in (...)" against these tables -- as a sequential scan
-- over the whole table, every time.
--
-- The action tables are the ones that hurt: they gain a row for every decision
-- anyone records, so the scan gets longer the more the system is used. That is
-- why the request lists were fine at first and degraded after a few approvals.

create index if not exists idx_need_request_line_request
    on need_request_line (need_request_id);
create index if not exists idx_need_request_action_request
    on need_request_action (need_request_id);

-- The action side is already indexed (V109); this is the line side, used when
-- a line is deleted and its edit rows cascade.
create index if not exists idx_need_request_action_line_line
    on need_request_action_line (need_request_line_id);

create index if not exists idx_maintenance_request_action_request
    on maintenance_request_action (maintenance_request_id);
create index if not exists idx_maintenance_request_part_used_request
    on maintenance_request_part_used (maintenance_request_id);

create index if not exists idx_asset_request_action_request
    on asset_request_action (asset_request_id);
