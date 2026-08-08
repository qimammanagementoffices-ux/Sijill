-- Phase 7 UI strings for the backup restore flow. Same caution as prior
-- i18n migrations: value_hi is an AI-drafted first pass, needs native
-- review via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('backups.triggeredPreRestore', 'قبل الاستعادة', 'Pre-restore', 'पुनर्स्थापना-पूर्व'),
    ('backups.restore', 'استعادة', 'Restore', 'पुनر्स्थापित करें'),
    ('backups.restoreConfirmTitle', 'تأكيد الاستعادة', 'Confirm restore', 'पुनर्स्थापना की पुष्टि करें'),
    ('backups.restoreConfirmWarning', 'سيؤدي هذا إلى استبدال قاعدة البيانات الحالية بهذه النسخة الاحتياطية. سيتم إنشاء نسخة احتياطية للحالة الحالية أولاً. أدخل رمز PIN الخاص بك للتأكيد.', 'This will replace the current database with this backup. The current state will be snapshotted first. Enter your PIN to confirm.', 'यह वर्तमान डेटाबेस को इस बैकअप से बदल देगा। वर्तमान स्थिति का पहले स्नैपशॉट लिया जाएगा। पुष्टि करने के लिए अपना पिन दर्ज करें।'),
    ('backups.pinLabel', 'رمز PIN', 'PIN', 'पिन'),
    ('backups.restoreConfirm', 'تأكيد الاستعادة', 'Confirm restore', 'पुनर्स्थापना की पुष्टि करें'),
    ('backups.restoreCancel', 'إلغاء', 'Cancel', 'रद्द करें'),
    ('backups.restoring', 'جارٍ الاستعادة...', 'Restoring...', 'पुनर्स्थापित हो रहा है...'),
    ('backups.restoreSuccess', 'تمت الاستعادة بنجاح. الرجاء تسجيل الدخول مرة أخرى.', 'Restore succeeded. Please log in again.', 'पुनर्स्थापना सफल रही। कृपया फिर से लॉग इन करें।'),
    ('backups.restoreFailed', 'فشلت عملية الاستعادة', 'Restore failed', 'पुनर्स्थापना विफल रही'),
    ('backups.restoreRateLimited', 'محاولات كثيرة جدًا. حاول مرة أخرى لاحقًا.', 'Too many attempts. Try again later.', 'बहुत अधिक प्रयास। कृपया बाद में पुनः प्रयास करें।'),
    ('backups.restoreInvalidPin', 'رمز PIN غير صحيح', 'Incorrect PIN', 'गलत पिन');
