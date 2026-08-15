-- Trimming or dropping a line changes what the requester asked for, which is
-- a different act from agreeing to the request. Everyone who can decide still
-- sees the lines; only a holder of this permission may alter them.
--
-- Only the warehouse gets one: need requests are the sole flow with a line
-- editor. Seeding mt./as. equivalents would create permissions that gate
-- nothing and quietly imply a capability that does not exist.

insert into permission (key, description) values
    ('wh.act.edit.lines', 'Change or drop requested quantities when deciding a need request')
on conflict (key) do nothing;

insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.wh_act_edit_lines',
     'تعديل الكميات داخل الأصناف',
     'Edit requested quantities when deciding',
     'निर्णय लेते समय अनुरोधित मात्रा संपादित करें'),
    ('requestErrors.LINE_EDIT_NOT_PERMITTED',
     'لا تملك صلاحية تعديل الكميات داخل الأصناف.',
     'You do not have permission to change requested quantities.',
     'आपके पास अनुरोधित मात्रा बदलने की अनुमति नहीं है।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;

-- Everyone who can already approve keeps working exactly as before: without
-- this, the permission would silently take a capability away from every
-- existing approver the moment it deploys.
insert into employee_permission (employee_id, permission_key)
select distinct ep.employee_id, 'wh.act.edit.lines'
from employee_permission ep
where ep.permission_key = 'wh.act.approve'
on conflict do nothing;
