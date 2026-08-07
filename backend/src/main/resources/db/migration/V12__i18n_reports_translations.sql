-- Phase 6b UI strings for the DB-backed translation table (V4). Same
-- caution as prior i18n migrations: value_hi is an AI-drafted first pass,
-- needs native review via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('common.exportXlsx', 'تصدير Excel', 'Export XLSX', 'एक्सेल निर्यात करें'),
    ('common.print', 'طباعة', 'Print', 'प्रिंट करें'),
    ('common.generatedAt', 'تاريخ الإنشاء', 'Generated at', 'तैयार करने की तिथि');
