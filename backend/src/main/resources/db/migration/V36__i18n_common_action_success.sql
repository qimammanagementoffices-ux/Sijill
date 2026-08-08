-- Shared toast text for every action that completes without navigating
-- away (edits, approve/reject/postpone/finish buttons, admin settings
-- saves, uploads/deletes) -- these previously gave zero on-screen
-- confirmation, same gap just fixed for BrandingAdmin specifically. One
-- generic key reused everywhere rather than a bespoke saveSuccess per
-- section, since the toast text itself doesn't need to be action-specific.
insert into translation (key, value_ar, value_en, value_hi) values
    ('common.actionSuccess', 'تم بنجاح', 'Done successfully', 'सफलतापूर्वक हो गया');
