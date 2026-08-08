-- Phase 8 UI strings for site maintenance-mode. "siteMaintenance*" prefix
-- deliberately distinct from the existing "maintenance*" keys, which belong
-- to the unrelated building-maintenance-request module. Same caution as
-- prior i18n migrations: value_hi is an AI-drafted first pass, needs native
-- review via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.siteMaintenanceNav', 'صيانة الموقع', 'Site maintenance', 'साइट रखरखाव'),

    ('siteMaintenanceAdmin.title', 'صيانة الموقع', 'Site maintenance', 'साइट रखरखाव'),
    ('siteMaintenanceAdmin.enabledLabel', 'تفعيل وضع الصيانة (سيتم إغلاق الموقع للمستخدمين)', 'Enable maintenance mode (closes the site to users)', 'रखरखाव मोड सक्षम करें (साइट उपयोगकर्ताओं के लिए बंद हो जाएगी)'),
    ('siteMaintenanceAdmin.messageArLabel', 'الرسالة (عربي)', 'Message (Arabic)', 'संदेश (अरबी)'),
    ('siteMaintenanceAdmin.messageEnLabel', 'الرسالة (إنجليزي)', 'Message (English)', 'संदेश (अंग्रेज़ी)'),
    ('siteMaintenanceAdmin.messageHiLabel', 'الرسالة (هندي)', 'Message (Hindi)', 'संदेश (हिन्दी)'),
    ('siteMaintenanceAdmin.imageLabel', 'صورة صفحة الصيانة', 'Maintenance page image', 'रखरखाव पृष्ठ छवि'),
    ('siteMaintenanceAdmin.reopenAtLabel', 'موعد إعادة الفتح المتوقع (اختياري)', 'Expected reopen time (optional)', 'अपेक्षित पुनः खुलने का समय (वैकल्पिक)'),
    ('siteMaintenanceAdmin.save', 'حفظ', 'Save', 'सहेजें'),
    ('siteMaintenanceAdmin.saveSuccess', 'تم الحفظ بنجاح', 'Saved successfully', 'सफलतापूर्वक सहेजा गया'),

    ('siteMaintenancePage.title', 'الموقع تحت الصيانة', 'Site under maintenance', 'साइट रखरखाव के अधीन है'),
    ('siteMaintenancePage.defaultMessage', 'نعمل حاليًا على تحسين الموقع. الرجاء المحاولة لاحقًا.', 'We are currently improving the site. Please check back soon.', 'हम वर्तमान में साइट में सुधार कर रहे हैं। कृपया बाद में पुनः जांचें।'),
    ('siteMaintenancePage.reopenLabel', 'من المتوقع إعادة الفتح خلال', 'Expected to reopen in', 'फिर से खुलने की अपेक्षा'),
    ('siteMaintenancePage.reopenUnitDays', 'يوم', 'd', 'दिन'),
    ('siteMaintenancePage.reopenUnitHours', 'ساعة', 'h', 'घंटे'),
    ('siteMaintenancePage.reopenUnitMinutes', 'دقيقة', 'm', 'मिनट'),
    ('siteMaintenancePage.reopenUnitSeconds', 'ثانية', 's', 'सेकंड');
