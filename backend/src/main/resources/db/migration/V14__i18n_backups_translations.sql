-- Phase 6c UI strings for the DB-backed translation table (V4). Same
-- caution as prior i18n migrations: value_hi is an AI-drafted first pass,
-- needs native review via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.backupsNav', 'النسخ الاحتياطي', 'Backups', 'बैकअप'),

    ('backups.title', 'النسخ الاحتياطي', 'Backups', 'बैकअप'),
    ('backups.runNow', 'تشغيل نسخة احتياطية الآن', 'Run backup now', 'अभी बैकअप चलाएं'),
    ('backups.running', 'جارٍ التنفيذ...', 'Running...', 'चल रहा है...'),
    ('backups.columnFilename', 'اسم الملف', 'Filename', 'फ़ाइल नाम'),
    ('backups.columnSize', 'الحجم', 'Size', 'आकार'),
    ('backups.columnTriggeredBy', 'المصدر', 'Triggered by', 'द्वारा शुरू किया गया'),
    ('backups.columnCreatedAt', 'تاريخ الإنشاء', 'Created at', 'बनाने की तिथि'),
    ('backups.triggeredScheduled', 'مجدول', 'Scheduled', 'निर्धारित'),
    ('backups.triggeredManual', 'يدوي', 'Manual', 'मैनुअल'),
    ('backups.download', 'تحميل', 'Download', 'डाउनलोड करें'),
    ('backups.noBackups', 'لا توجد نسخ احتياطية', 'No backups yet', 'अभी तक कोई बैकअप नहीं');
