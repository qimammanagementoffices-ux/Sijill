-- "تصدير PDF" is the A4 print view saved as PDF (same as the legacy app's
-- export-pdf action, which called window.print()), not a generated file.
insert into translation (key, value_ar, value_en, value_hi) values
    ('common.exportPdf', 'تصدير PDF', 'Export PDF', 'PDF निर्यात करें')
on conflict (key) do nothing;
