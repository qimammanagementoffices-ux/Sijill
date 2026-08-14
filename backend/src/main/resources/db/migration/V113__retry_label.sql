-- A failed /auth/me used to log the user out of the app. It now offers a
-- retry instead, which needs a label.
insert into translation (key, value_ar, value_en, value_hi) values
    ('common.retry', 'إعادة المحاولة', 'Try again', 'पुनः प्रयास करें')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
