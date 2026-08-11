insert into translation (key, value_ar, value_en, value_hi) values
    ('dashboard.warehouseCostsNav', 'التكاليف المالية', 'Financial costs', 'वित्तीय लागत'),
    ('dashboard.maintenanceCostsNav', 'تكاليف الصيانة', 'Maintenance costs', 'रखरखाव लागत'),
    ('costs.title', 'لوحة التكاليف المالية', 'Financial Cost Dashboard', 'वित्तीय लागत डैशबोर्ड'),
    ('costs.total', 'إجمالي التكاليف المعتمدة', 'Total Approved Cost', 'कुल स्वीकृत लागत'),
    ('costs.byDepartment', 'التكلفة حسب القسم', 'Cost by Department', 'विभाग के अनुसार लागत'),
    ('costs.byRequester', 'التكلفة حسب مقدّم الطلب', 'Cost by Requester', 'अनुरोधकर्ता के अनुसार लागत'),
    ('costs.department', 'القسم', 'Department', 'विभाग'),
    ('costs.requester', 'مقدّم الطلب', 'Requester', 'अनुरोधकर्ता'),
    ('costs.amount', 'الإجمالي', 'Total', 'कुल'),
    ('costs.from', 'من', 'From', 'से'),
    ('costs.to', 'إلى', 'To', 'तक'),
    ('costs.apply', 'تطبيق', 'Apply', 'लागू करें'),
    ('costs.note', 'تُحسب التكلفة من آخر سعر شراء مسجّل لكل صنف شاملًا الضريبة، مضروبًا في الكميات ضمن الطلبات المعتمدة أو المكتملة.', 'Cost uses each item''s latest tax-inclusive purchase price multiplied by quantities in approved or completed requests.', 'लागत नवीनतम कर-सहित खरीद मूल्य को स्वीकृत या पूर्ण अनुरोध मात्रा से गुणा करके निकाली जाती है।'),
    ('costs.reportTitle', 'تقرير التكاليف المالية', 'Financial Cost Report', 'वित्तीय लागत रिपोर्ट')
on conflict (key) do nothing;
