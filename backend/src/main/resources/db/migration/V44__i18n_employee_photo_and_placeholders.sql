-- Employee form now matches the reference site's "Add employee" popup:
-- clearer field wording, example placeholders, and a photo upload/remove
-- control. V4 seeded nameLabel/phoneLabel with plainer wording -- update
-- them in place (translation rows are just data, not a schema migration).
update translation set value_ar = 'الاسم الكامل', value_en = 'Full name', value_hi = 'पूरा नाम'
    where key = 'employees.nameLabel';
update translation set value_ar = 'رقم الجوال (يُستخدم لتسجيل الدخول)', value_en = 'Phone number (used to sign in)', value_hi = 'फ़ोन नंबर (लॉगिन के लिए उपयोग किया जाता है)'
    where key = 'employees.phoneLabel';

insert into translation (key, value_ar, value_en, value_hi) values
    ('employees.namePlaceholder', 'مثال: عبدالله الشهري', 'e.g. Abdullah Alshehri', 'उदा: अब्दुल्ला अलशेहरी'),
    ('employees.phonePlaceholder', '05xxxxxxxx', '05xxxxxxxx', '05xxxxxxxx'),
    ('employees.pinPlaceholder', 'مثال: 1234', 'e.g. 1234', 'उदा: 1234'),
    ('employees.emailPlaceholder', 'name@school.sa', 'name@school.sa', 'name@school.sa'),
    ('employees.nationalIdPlaceholder', '1xxxxxxxxxx', '1xxxxxxxxxx', '1xxxxxxxxxx'),
    ('employees.photoLabel', 'الصورة الشخصية', 'Photo', 'तस्वीर'),
    ('employees.removePhoto', 'إزالة الصورة', 'Remove photo', 'तस्वीर हटाएं');
