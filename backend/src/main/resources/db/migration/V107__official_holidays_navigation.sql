insert into translation_entry (key, ar, en, hi) values
    ('dashboard.officialHolidaysNav', 'الإجازات الرسمية', 'Official holidays', 'आधिकारिक छुट्टियां')
on conflict (key) do update set
    ar = excluded.ar,
    en = excluded.en,
    hi = excluded.hi;
