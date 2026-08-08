-- Phase 9: sys.translations now also covers managing which admin-added
-- languages exist (docs/decision-record.md D7) -- same capability at a
-- level up from editing individual strings, not a new permission.

update permission
set description = 'Manage UI translation strings and admin-added languages'
where key = 'sys.translations';
