-- Phase 7 follow-up: manual backup deletion (removes both the DB row and
-- the underlying object storage file). Same caution as prior i18n
-- migrations: value_hi is an AI-drafted first pass, needs native review via
-- /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('backups.delete', 'حذف', 'Delete', 'हटाएं'),
    ('backups.deleteConfirm', 'هل تريد حذف هذه النسخة الاحتياطية نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.', 'Permanently delete this backup? This cannot be undone.', 'क्या आप इस बैकअप को स्थायी रूप से हटाना चाहते हैं? इसे पूर्ववत नहीं किया जा सकता।'),
    ('backups.deleteFailed', 'فشل حذف النسخة الاحتياطية', 'Failed to delete backup', 'बैकअप हटाने में विफल');
