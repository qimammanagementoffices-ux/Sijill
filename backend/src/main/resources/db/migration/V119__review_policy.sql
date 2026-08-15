-- Whether a decision needs a second official to counter-sign it, chosen per
-- system rather than once for the whole school: stock, maintenance and assets
-- carry different weight and different staffing.
--
-- Default false everywhere -- one level. Two-stage review shipped switched on
-- with no way to turn it off, which is why this exists; defaulting to off
-- makes the new setting the deliberate choice rather than the silent one.

create table review_policy (
    id                      boolean primary key default true check (id),
    warehouse_two_level     boolean not null default false,
    maintenance_two_level   boolean not null default false,
    asset_two_level         boolean not null default false,
    version                 integer not null default 0,
    updated_at              timestamptz not null default now()
);

-- Existing deployments are already running two-level and their staff expect
-- it, so they keep it. A fresh install starts from the table default.
insert into review_policy (id, warehouse_two_level, maintenance_two_level, asset_two_level)
values (true, true, true, true)
on conflict (id) do nothing;

insert into permission (key, description) values
    ('sys.review.policy', 'Choose one-level or two-level review per system')
on conflict (key) do nothing;

insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.sys_review_policy',
     'ضبط مستوى الاعتماد لكل نظام',
     'Set the review level for each system',
     'प्रत्येक प्रणाली के लिए समीक्षा स्तर निर्धारित करें'),
    ('dashboard.reviewPolicyNav', 'مستوى الاعتماد', 'Review level', 'समीक्षा स्तर'),
    ('reviewPolicy.title', 'مستوى الاعتماد', 'Review level', 'समीक्षा स्तर'),
    ('reviewPolicy.description',
     'عند التفعيل يحتاج القرار إلى مراجعة نهائية من مسؤول ثانٍ مختلف عن صاحب القرار الأول. وعند الإيقاف يُعتمد الطلب مباشرة بقرار واحد.',
     'When on, a decision needs a second official — different from the first — to counter-sign it. When off, one decision settles the request.',
     'चालू होने पर, निर्णय की पुष्टि पहले अधिकारी से भिन्न दूसरे अधिकारी द्वारा की जानी चाहिए। बंद होने पर, एक ही निर्णय पर्याप्त है।'),
    ('reviewPolicy.warehouse', 'مراجعة نهائية لطلبات الاحتياج', 'Two-level review for need requests', 'आवश्यकता अनुरोधों की दो-स्तरीय समीक्षा'),
    ('reviewPolicy.maintenance', 'مراجعة نهائية لطلبات الصيانة', 'Two-level review for maintenance requests', 'रखरखाव अनुरोधों की दो-स्तरीय समीक्षा'),
    ('reviewPolicy.asset', 'مراجعة نهائية لطلبات الأصول', 'Two-level review for asset requests', 'संपत्ति अनुरोधों की दो-स्तरीय समीक्षा'),
    ('reviewPolicy.openRequestsNote',
     'لا يؤثر التغيير على الطلبات المعروضة للمراجعة النهائية حاليًا؛ تبقى في مكانها حتى يُبت فيها.',
     'Changing this does not move requests already awaiting a counter-signature; they stay where they are until decided.',
     'यह बदलाव पहले से अंतिम समीक्षा की प्रतीक्षा कर रहे अनुरोधों को प्रभावित नहीं करता; वे निर्णय होने तक वहीं रहते हैं।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;

-- Whoever already administers site maintenance administers this too.
insert into employee_permission (employee_id, permission_key)
select distinct ep.employee_id, 'sys.review.policy'
from employee_permission ep
where ep.permission_key = 'sys.maintenance'
on conflict do nothing;
