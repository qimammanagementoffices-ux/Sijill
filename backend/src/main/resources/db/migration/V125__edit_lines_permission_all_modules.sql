-- Maintenance and asset counterparts to wh.act.edit.lines, so the three
-- systems present the same set of permissions on the employee screen.
--
-- Nothing checks these yet: maintenance records parts at completion rather
-- than as approver-editable request lines, and the asset decision dialog does
-- not offer a line editor. They are here so the permission exists the day
-- either flow gains one, and so the permissions page reads consistently
-- across the three modules.

insert into permission (key, description) values
    ('mt.act.edit.lines', 'Change or drop requested quantities when deciding a maintenance request'),
    ('as.act.edit.lines', 'Change or drop requested quantities when deciding an asset request')
on conflict (key) do nothing;

insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.mt_act_edit_lines',
     'تعديل الكميات داخل الأصناف',
     'Edit requested quantities when deciding',
     'निर्णय लेते समय अनुरोधित मात्रा संपादित करें'),
    ('permission.as_act_edit_lines',
     'تعديل الكميات داخل الأصناف',
     'Edit requested quantities when deciding',
     'निर्णय लेते समय अनुरोधित मात्रा संपादित करें')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;

-- Granted to whoever can already approve in that module, matching how V117
-- introduced the warehouse one: a new permission should not quietly take a
-- capability away from anyone.
insert into employee_permission (employee_id, permission_key)
select distinct ep.employee_id, 'mt.act.edit.lines'
from employee_permission ep
where ep.permission_key = 'mt.act.approve'
on conflict do nothing;

insert into employee_permission (employee_id, permission_key)
select distinct ep.employee_id, 'as.act.edit.lines'
from employee_permission ep
where ep.permission_key = 'as.act.approve'
on conflict do nothing;
