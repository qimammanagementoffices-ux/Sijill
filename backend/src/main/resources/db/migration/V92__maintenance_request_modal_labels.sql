insert into translation (key, value_ar, value_en, value_hi) values
    ('maintenanceRequests.departmentLabel', 'القسم', 'Department', 'विभाग'),
    ('maintenanceRequests.roomLabel', 'الغرفة', 'Room', 'कमरा'),
    ('maintenanceRequests.descriptionPlaceholder', 'اشرح المشكلة بالتفصيل...', 'Describe the problem in detail...', 'समस्या का विस्तार से वर्णन करें...'),
    ('maintenanceRequests.attachmentsHint', 'إرفاق صور أو ملف PDF (اختياري)', 'Attach photos or a PDF (optional)', 'फ़ोटो या PDF संलग्न करें (वैकल्पिक)'),
    ('maintenanceRequests.addAttachment', 'إرفاق ملفات', 'Attach files', 'फ़ाइलें संलग्न करें'),
    ('maintenanceRequests.attachmentsFailed', 'تم إنشاء الطلب لكن تعذّر رفع بعض المرفقات', 'The request was created, but some attachments failed to upload', 'अनुरोध बन गया, लेकिन कुछ संलग्नक अपलोड नहीं हो सके')
on conflict (key) do nothing;

update translation
set value_ar = 'عادي', value_en = 'Normal', value_hi = 'सामान्य'
where key = 'maintenanceRequests.priorityMedium';

update translation
set value_ar = case key
        when 'maintenanceRequests.addNew' then 'طلب صيانة جديد'
        when 'maintenanceRequests.submit' then 'إرسال البلاغ'
        when 'maintenanceRequests.descriptionLabel' then 'وصف العطل'
        when 'maintenanceRequests.priorityLabel' then 'مستوى الأولوية'
    end,
    value_en = case key
        when 'maintenanceRequests.addNew' then 'New maintenance request'
        when 'maintenanceRequests.submit' then 'Send report'
        when 'maintenanceRequests.descriptionLabel' then 'Fault description'
        when 'maintenanceRequests.priorityLabel' then 'Priority level'
    end,
    value_hi = case key
        when 'maintenanceRequests.addNew' then 'नया रखरखाव अनुरोध'
        when 'maintenanceRequests.submit' then 'रिपोर्ट भेजें'
        when 'maintenanceRequests.descriptionLabel' then 'खराबी का विवरण'
        when 'maintenanceRequests.priorityLabel' then 'प्राथमिकता स्तर'
    end
where key in (
    'maintenanceRequests.addNew',
    'maintenanceRequests.submit',
    'maintenanceRequests.descriptionLabel',
    'maintenanceRequests.priorityLabel'
);
