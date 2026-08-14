-- An approval may cut a line or drop it, never grant more than was asked
-- for. Raising it would commit stock nobody requested.
insert into translation (key, value_ar, value_en, value_hi) values
    ('requestErrors.QUANTITY_ABOVE_REQUESTED', 'لا يمكن اعتماد كمية أكبر من الكمية المطلوبة.', 'An approved quantity cannot exceed the quantity requested.', 'स्वीकृत मात्रा अनुरोधित मात्रा से अधिक नहीं हो सकती।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
