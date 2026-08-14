update translation
set value_ar = '(يجب اختيار إدارة واحدة على الأقل، ويمكن اختيار عدة إدارات وما يتبعها من مراحل وأقسام)',
    value_en = '(choose at least one administration; multiple administrations and their stages and departments are allowed)',
    value_hi = '(कम से कम एक प्रशासन चुनें; कई प्रशासन और उनके चरण व विभाग चुने जा सकते हैं)',
    version = version + 1
where key = 'employees.departmentsHint';
