-- Set when someone logs in with a PIN that no longer satisfies the policy.
-- Existing PINs are BCrypt hashes, so which of them are weak cannot be known
-- at rest -- login is the only moment the plaintext exists to be judged. That
-- is why this defaults to false and is raised on the way in, rather than being
-- backfilled here.
alter table employee add column must_change_pin boolean not null default false;
