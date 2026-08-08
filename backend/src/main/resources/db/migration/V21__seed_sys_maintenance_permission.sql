-- Phase 8: site maintenance-mode (admin can take the whole site offline).
-- Same pattern as V5's sys.translations addition: an existing base
-- migration (V2) already ran in production, so a brand-new sys.* key needs
-- its own migration. Existing employees are not auto-granted this.

insert into permission (key, description) values
    ('sys.maintenance', 'Enable/disable site maintenance mode and bypass it while enabled');
