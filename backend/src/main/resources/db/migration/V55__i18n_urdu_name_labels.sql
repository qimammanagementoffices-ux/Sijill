insert into translation_value (language_id, key, value)
select l.id, k.key, k.val
from language l
cross join (values
    ('assets.nameUrLabel',      'الاسم (أردو)',    'ar'),
    ('assets.nameUrLabel',      'Name (Urdu)',     'en'),
    ('rooms.nameUrLabel',       'الاسم (أردو)',    'ar'),
    ('rooms.nameUrLabel',       'Name (Urdu)',     'en'),
    ('faultTypes.nameUrLabel',  'الاسم (أردو)',    'ar'),
    ('faultTypes.nameUrLabel',  'Name (Urdu)',     'en')
) as k(key, val, lang)
where l.code = k.lang
on conflict do nothing;
