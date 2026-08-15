-- The asset popup now uses the same head and section titles as "بطاقة الصنف",
-- so it needs the same two labels the item card already had.

insert into translation (key, value_ar, value_en, value_hi) values
    ('assets.cardTitle', 'بطاقة الأصل', 'Asset card', 'संपत्ति कार्ड'),
    ('assets.cardBasicInfo', 'البيانات الأساسية', 'Basic information', 'मूल जानकारी');
