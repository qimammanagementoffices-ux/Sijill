-- Phase 7 follow-up: a restore leaves the still-running app instance's DB
-- connection pool stale against the new schema until sijill-api is manually
-- restarted (an automatic self-restart was tried and reverted -- see
-- decision-record.md D5 and BackupService.restore's comment). Updates the
-- existing restore-success message to tell the admin who just triggered the
-- restore to do that manual restart, since they're the one who can act on
-- it immediately.

update translation set
    value_ar = 'تمت الاستعادة بنجاح. يرجى إعادة تشغيل خدمة API من لوحة Render الآن، ثم تسجيل الدخول مرة أخرى.',
    value_en = 'Restore succeeded. Please restart the API service in the Render dashboard now, then log in again.',
    value_hi = 'पुनर्स्थापना सफल रही। कृपया अभी Render डैशबोर्ड में API सेवा को पुनरारंभ करें, फिर फिर से लॉग इन करें।'
where key = 'backups.restoreSuccess';
