-- See V55 for why this targets translation rather than translation_value.
insert into translation (key, value_ar, value_en) values
    ('assets.columnImage', 'الصورة', 'Image')
on conflict (key) do nothing;
