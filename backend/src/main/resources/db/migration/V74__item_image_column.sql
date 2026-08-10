-- Header for the item list's thumbnail column.
insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseItems.columnImage', 'الصورة', 'Image', 'चित्र')
on conflict (key) do nothing;
