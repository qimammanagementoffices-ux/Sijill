-- V2 already ran in production, so the new sys.translations permission
-- (decision-record.md D4's sys.* catalogue) needs its own migration.
-- Existing employees are not auto-granted this — same as any new
-- permission key, an admin grants it to themselves or others via the
-- existing employee permission-grid screen (Phase 2b).

insert into permission (key, description) values
    ('sys.translations', 'Manage UI translation strings (admin translation table)');
