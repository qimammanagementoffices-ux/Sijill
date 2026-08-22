-- The cost dashboards stopped reporting what was approved and started
-- reporting what was actually spent: warehouse counts only delivered and
-- closed requests, at the quantities the storekeeper issued, and maintenance
-- has always counted the parts a job consumed. Both labels still described
-- the old rule, so the page named one figure and showed another.

update translation
set value_ar = 'إجمالي المصروف الفعلي',
    value_en = 'Total actual spend',
    value_hi = 'कुल वास्तविक व्यय'
where key = 'costs.total';

update translation
set value_ar = 'تُحسب التكلفة من آخر سعر شراء مسجّل لكل صنف شاملًا الضريبة، مضروبًا في الكميات المصروفة فعليًا بعد إنهاء التسليم أو العمل. الأصناف التي حذفها المعتمِد لا تُحتسب.',
    value_en = 'Cost uses each item''s latest tax-inclusive purchase price multiplied by the quantities actually issued once delivery or work is complete. Lines an approver removed are not counted.',
    value_hi = 'लागत प्रत्येक वस्तु की नवीनतम कर-सहित खरीद कीमत को, वितरण या कार्य पूरा होने के बाद वास्तव में जारी की गई मात्रा से गुणा करके निकाली जाती है। स्वीकृतकर्ता द्वारा हटाई गई पंक्तियाँ नहीं गिनी जातीं।'
where key = 'costs.note';
