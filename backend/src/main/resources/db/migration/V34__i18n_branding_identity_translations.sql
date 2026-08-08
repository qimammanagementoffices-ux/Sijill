-- Visual redesign: BrandingAdmin now matches the reference site's
-- "identity and colors" modal, which needs several fields/labels the
-- original branding.* keys (V11) never had -- see decision-record.md for
-- why these fields (platformName/schoolName/schoolLabel/subtitle/
-- accentColor) exist at all: they were in the master spec's original
-- BrandingSettings model but never implemented until now.
insert into translation (key, value_ar, value_en, value_hi) values
    ('branding.accentColorLabel', 'لون التنبيه/الرفض', 'Accent (warning/reject) color', 'चेतावनी/अस्वीकृति रंग'),
    ('branding.platformNameLabel', 'اسم المنصة (بدل «سِجِلّ»)', 'Platform name (replaces "Sijill")', 'प्लेटफ़ॉर्म का नाम ("Sijill" के स्थान पर)'),
    ('branding.platformNamePlaceholder', 'سِجِلّ', 'Sijill', 'सिजिल'),
    ('branding.schoolNameLabel', 'اسم المدرسة', 'School name', 'स्कूल का नाम'),
    ('branding.schoolLabelLabel', 'وصف الإدارة (يظهر أسفل اسم المدرسة في نماذج الطباعة)', 'Admin description (shown under school name on printouts)', 'व्यवस्थापक विवरण (प्रिंटआउट पर स्कूल के नाम के नीचे दिखाया गया)'),
    ('branding.subtitleLabel', 'الجملة التعريفية (تظهر أسفل اسم المنصة)', 'Tagline (shown under the platform name)', 'टैगलाइन (प्लेटफ़ॉर्म के नाम के नीचे दिखाई गई)'),
    ('branding.uploadLogo', 'رفع شعار جديد', 'Upload new logo', 'नया लोगो अपलोड करें'),
    ('branding.removeLogo', 'إزالة الشعار', 'Remove logo', 'लोगो हटाएं'),
    ('branding.presetDefault', 'افتراضي', 'Default', 'डिफ़ॉल्ट'),
    ('branding.presetGreen', 'أخضر الريادة', 'Riyada green', 'रियादा हरा'),
    ('branding.presetBlue', 'أزرق ملكي', 'Royal blue', 'शाही नीला'),
    ('branding.presetPurple', 'بنفسجي داكن', 'Dark purple', 'गहरा बैंगनी'),
    ('branding.presetGray', 'رمادي فحمي', 'Charcoal gray', 'चारकोल ग्रे');
