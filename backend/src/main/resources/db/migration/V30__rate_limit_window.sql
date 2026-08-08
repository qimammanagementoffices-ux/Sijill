-- LoginRateLimiter/RestoreRateLimiter were in-memory (ConcurrentHashMap),
-- documented as single-instance-only since that state isn't shared across
-- app instances. Backing them with this table instead of adding a new paid
-- dependency (e.g. Redis) -- Postgres is already here, and a single-row
-- upsert-with-conditional-reset is cheap for a login/restore-attempt hot
-- path. `id` is a namespaced key, e.g. "login:0501234567" or
-- "restore:<employee-uuid>", so the two limiters can't collide.
create table rate_limit_window (
    id             varchar(120) primary key,
    window_start   timestamptz not null,
    attempt_count  integer not null
);
