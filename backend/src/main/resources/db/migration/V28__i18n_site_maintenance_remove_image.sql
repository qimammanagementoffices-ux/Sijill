-- Phase 8 follow-up: no way to remove a previously uploaded maintenance
-- image without replacing it with a new one. Adds the "Remove image" label.
insert into translation (key, value_ar, value_en, value_hi) values
    ('siteMaintenanceAdmin.removeImage', 'إزالة الصورة', 'Remove image', 'छवि हटाएं');
