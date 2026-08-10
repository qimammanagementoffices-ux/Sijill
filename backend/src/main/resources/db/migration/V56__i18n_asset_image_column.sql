insert into translation_value (language_id, key, value)
select l.id, k.key, k.val
from language l
cross join (values
    ('assets.columnImage', 'الصورة', 'ar'),
    ('assets.columnImage', 'Image',  'en')
) as k(key, val, lang)
where l.code = k.lang
on conflict do nothing;
