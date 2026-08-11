insert into translation (key, value_ar, value_en, value_hi) values
    ('rooms.editTitle', 'تعديل بيانات الغرفة', 'Edit room details', 'कमरे का विवरण संपादित करें'),
    ('rooms.saveChanges', 'حفظ التغييرات', 'Save changes', 'बदलाव सहेजें'),
    ('rooms.delete', 'حذف الغرفة', 'Delete room', 'कमरा हटाएं'),
    ('rooms.deleteConfirm', 'هل تريد حذف هذه الغرفة؟ ستبقى السجلات السابقة محفوظة.', 'Delete this room? Historical records will be preserved.', 'यह कमरा हटाएं? पुराने रिकॉर्ड सुरक्षित रहेंगे।')
on conflict (key) do nothing;
