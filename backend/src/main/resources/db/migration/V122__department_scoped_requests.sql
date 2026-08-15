-- Officials act on their own department and the ones beneath it. A root
-- department grants nothing: every employee belongs to "الإدارة العامة", so
-- honouring it would hand the whole school to everyone and make the
-- restriction meaningless.
--
-- Whoever genuinely needs the whole school gets this permission, which says
-- so plainly instead of arriving as a side effect of an org-chart entry.

insert into permission (key, description) values
    ('sys.requests.all', 'See and decide requests in every department')
on conflict (key) do nothing;

insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.sys_requests_all',
     'الاطلاع على طلبات جميع الإدارات والبت فيها',
     'See and decide requests in every department',
     'सभी विभागों के अनुरोध देखें और निर्णय लें'),
    ('requestErrors.OUTSIDE_DEPARTMENT',
     'لا يمكنك البت في طلب خارج نطاق إدارتك.',
     'You cannot decide a request outside your own departments.',
     'आप अपने विभाग के बाहर के अनुरोध पर निर्णय नहीं ले सकते।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;

-- Everyone who can act on requests today keeps the reach they have, so the
-- restriction arrives switched off per person rather than locking staff out
-- of queues they were working yesterday. Narrow it deliberately, one employee
-- at a time, by revoking this.
insert into employee_permission (employee_id, permission_key)
select distinct ep.employee_id, 'sys.requests.all'
from employee_permission ep
where ep.permission_key in (
    'wh.act.approve', 'wh.act.countersign',
    'mt.act.approve', 'mt.act.countersign',
    'as.act.approve', 'as.act.countersign',
    'emp.manage')
on conflict do nothing;
