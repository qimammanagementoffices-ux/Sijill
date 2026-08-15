-- The attachments step is now reachable with nothing written, so someone
-- describing an item the warehouse does not stock can attach the photo first
-- and write the description alongside it. The submit is where the
-- description is asked for, and it has to say so rather than leave a button
-- greyed out with no explanation.

insert into translation (key, value_ar, value_en, value_hi) values
    ('warehouseRequests.describeCustomRequest',
     'اكتب وصف الصنف المطلوب قبل الإرسال.',
     'Describe the item you need before sending.',
     'भेजने से पहले आवश्यक वस्तु का विवरण लिखें।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
