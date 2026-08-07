-- Phase 6a UI strings for the DB-backed translation table (V4). Same
-- caution as prior i18n migrations: value_hi is an AI-drafted first pass,
-- needs native review via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.brandingNav', 'الهوية البصرية', 'Branding', 'ब्रांडिंग'),

    ('attachments.title', 'المرفقات', 'Attachments', 'अनुलग्नक'),
    ('attachments.upload', 'رفع ملف', 'Upload file', 'फ़ाइल अपलोड करें'),
    ('attachments.delete', 'حذف', 'Delete', 'हटाएं'),
    ('attachments.deleteConfirm', 'هل تريد حذف هذا المرفق؟', 'Delete this attachment?', 'क्या इस अनुलग्नक को हटाना है?'),
    ('attachments.uploading', 'جارٍ الرفع...', 'Uploading...', 'अपलोड हो रहा है...'),
    ('attachments.noAttachments', 'لا توجد مرفقات', 'No attachments', 'कोई अनुलग्नक नहीं'),
    ('attachments.unsupportedType', 'نوع الملف غير مدعوم', 'Unsupported file type', 'असमर्थित फ़ाइल प्रकार'),
    ('attachments.tooLarge', 'حجم الملف كبير جدًا', 'File is too large', 'फ़ाइल बहुत बड़ी है'),

    ('branding.title', 'الهوية البصرية', 'Branding', 'ब्रांडिंग'),
    ('branding.presetLabel', 'نمط جاهز', 'Preset', 'पूर्व-निर्धारित'),
    ('branding.colorLabel', 'اللون الأساسي', 'Primary color', 'प्राथमिक रंग'),
    ('branding.logoLabel', 'الشعار', 'Logo', 'लोगो'),
    ('branding.save', 'حفظ', 'Save', 'सहेजें'),
    ('branding.reset', 'إعادة التعيين', 'Reset', 'रीसेट करें'),
    ('branding.resetConfirm', 'هل تريد إعادة الإعدادات الافتراضية؟', 'Reset to default branding?', 'क्या डिफ़ॉल्ट ब्रांडिंग पर रीसेट करें?');
