alter table branding_setting
    add column platform_name_en text,
    add column platform_name_hi text,
    add column school_name_en text,
    add column school_name_hi text;

insert into translation (key, value_ar, value_en, value_hi) values
    ('branding.platformNameEnLabel', 'اسم المنصة بالإنجليزية', 'Platform name in English', 'प्लेटफ़ॉर्म नाम अंग्रेज़ी में'),
    ('branding.platformNameHiLabel', 'اسم المنصة بالهندية', 'Platform name in Hindi', 'प्लेटफ़ॉर्म नाम हिंदी में'),
    ('branding.schoolNameEnLabel', 'اسم المدرسة بالإنجليزية', 'School name in English', 'स्कूल का नाम अंग्रेज़ी में'),
    ('branding.schoolNameHiLabel', 'اسم المدرسة بالهندية', 'School name in Hindi', 'स्कूल का नाम हिंदी में'),
    ('branding.translationsLabel', 'الترجمات', 'Translations', 'अनुवाद'),
    ('branding.presetTeal', 'فيروزي عصري', 'Modern teal', 'आधुनिक टील'),
    ('branding.presetBurgundy', 'عنابي كلاسيكي', 'Classic burgundy', 'क्लासिक बरगंडी'),
    ('branding.presetSunset', 'غروب دافئ', 'Warm sunset', 'गर्म सूर्यास्त')
on conflict (key) do nothing;
