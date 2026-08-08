-- Phase 7 follow-up: delete now requires PIN re-confirmation via a proper
-- modal (matching restore), not the browser's native confirm() dialog.
-- 'backups.deleteConfirm' (added in V19) is repurposed as the modal's
-- warning paragraph text. Same caution as prior i18n migrations: value_hi
-- is an AI-drafted first pass, needs native review via /admin/translations.

insert into translation (key, value_ar, value_en, value_hi) values
    ('backups.deleteConfirmTitle', 'تأكيد الحذف', 'Confirm delete', 'हटाने की पुष्टि करें'),
    ('backups.deleting', 'جارٍ الحذف...', 'Deleting...', 'हटाया जा रहा है...'),
    ('backups.deleteRateLimited', 'محاولات كثيرة جدًا. حاول مرة أخرى لاحقًا.', 'Too many attempts. Try again later.', 'बहुत अधिक प्रयास। कृपया बाद में पुनः प्रयास करें।'),
    ('backups.deleteInvalidPin', 'رمز PIN غير صحيح', 'Incorrect PIN', 'गलत पिन');
