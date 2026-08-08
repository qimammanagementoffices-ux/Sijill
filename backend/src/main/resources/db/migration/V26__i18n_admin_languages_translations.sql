-- Phase 9 UI strings for the admin "Languages" page (add/remove admin
-- languages, review AI-translated values). Same caution as prior i18n
-- migrations: value_hi is an AI-drafted first pass, needs native review
-- via /admin/translations before production use.

insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.languagesNav', 'اللغات', 'Languages', 'भाषाएं'),

    ('adminLanguages.title', 'اللغات', 'Languages', 'भाषाएं'),
    ('adminLanguages.builtInNote', 'العربية والإنجليزية والهندية مدمجة ولا يمكن حذفها.', 'Arabic, English, and Hindi are built in and can''t be removed.', 'अरबी, अंग्रेज़ी और हिंदी अंतर्निहित हैं और हटाई नहीं जा सकतीं।'),
    ('adminLanguages.columnCode', 'الرمز', 'Code', 'कोड'),
    ('adminLanguages.columnName', 'الاسم', 'Name', 'नाम'),
    ('adminLanguages.columnDirection', 'الاتجاه', 'Direction', 'दिशा'),
    ('adminLanguages.directionLtr', 'من اليسار لليمين', 'Left-to-right', 'बाएं-से-दाएं'),
    ('adminLanguages.directionRtl', 'من اليمين لليسار', 'Right-to-left', 'दाएं-से-बाएं'),
    ('adminLanguages.delete', 'حذف', 'Delete', 'हटाएं'),
    ('adminLanguages.deleteConfirm', 'هل تريد حذف هذه اللغة وجميع ترجماتها؟', 'Delete this language and all its translated values?', 'क्या आप इस भाषा और इसके सभी अनुवादित मानों को हटाना चाहते हैं?'),
    ('adminLanguages.review', 'مراجعة', 'Review', 'समीक्षा करें'),
    ('adminLanguages.addTitle', 'إضافة لغة جديدة', 'Add a new language', 'नई भाषा जोड़ें'),
    ('adminLanguages.codeLabel', 'الرمز (مثال: fr)', 'Code (e.g. fr)', 'कोड (उदा. fr)'),
    ('adminLanguages.codeHint', 'حرفان إلى عشرة أحرف صغيرة', '2-10 lowercase letters', '2-10 छोटे अक्षर'),
    ('adminLanguages.nameLabel', 'اسم اللغة', 'Language name', 'भाषा का नाम'),
    ('adminLanguages.directionLabel', 'اتجاه الكتابة', 'Writing direction', 'लेखन दिशा'),
    ('adminLanguages.add', 'إضافة وترجمة تلقائيًا', 'Add and auto-translate', 'जोड़ें और स्वतः अनुवाद करें'),
    ('adminLanguages.adding', 'جارٍ الترجمة، قد يستغرق دقيقة...', 'Translating, this can take a minute...', 'अनुवाद हो रहा है, इसमें एक मिनट लग सकता है...'),
    ('adminLanguages.addFailed', 'فشلت إضافة اللغة', 'Failed to add language', 'भाषा जोड़ने में विफल'),
    ('adminLanguages.reviewTitle', 'مراجعة الترجمات', 'Review translations', 'अनुवादों की समीक्षा करें'),
    ('adminLanguages.reviewBack', 'رجوع إلى اللغات', 'Back to languages', 'भाषाओं पर वापस जाएं'),
    ('adminLanguages.columnKey', 'المفتاح', 'Key', 'कुंजी'),
    ('adminLanguages.columnValue', 'القيمة', 'Value', 'मान'),
    ('adminLanguages.save', 'حفظ', 'Save', 'सहेजें');
