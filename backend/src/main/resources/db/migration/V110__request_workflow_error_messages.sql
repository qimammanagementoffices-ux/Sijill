-- Workflow refusals were reaching users as the developer-facing English from
-- the service layer. Each now carries a stable code (see
-- backend/.../error/RequestWorkflowErrors.java) that the frontend resolves
-- against these rows, so a refusal reads in the interface language.
insert into translation (key, value_ar, value_en, value_hi) values
    ('requestErrors.SELF_REVIEW', 'لا يمكنك مراجعة طلبك الخاص.', 'You cannot review your own request.', 'आप अपने ही अनुरोध की समीक्षा नहीं कर सकते।'),
    ('requestErrors.SAME_OFFICIAL', 'القرار الأول كان قرارك — يلزم مسؤول آخر لمراجعته.', 'The first decision was yours — another official must review it.', 'पहला निर्णय आपका था — किसी अन्य अधिकारी को इसकी समीक्षा करनी होगी।'),
    ('requestErrors.DECISION_OVERTURNED', 'أُلغي هذا القرار في المراجعة النهائية — يلزم أن يتخذه مسؤول آخر.', 'This decision was overturned in final review — another official must take it.', 'यह निर्णय अंतिम समीक्षा में पलट दिया गया — किसी अन्य अधिकारी को लेना होगा।'),
    ('requestErrors.NOT_REQUESTER', 'يمكن لمقدّم الطلب وحده تأكيد الاستلام أو رفضه.', 'Only the requester can confirm or reject receipt.', 'केवल अनुरोधकर्ता ही प्राप्ति की पुष्टि या अस्वीकार कर सकता है।'),

    ('requestErrors.WRONG_STATUS', 'لا تسمح حالة الطلب الحالية بهذا الإجراء.', 'The request''s current status does not allow this action.', 'अनुरोध की वर्तमान स्थिति इस कार्रवाई की अनुमति नहीं देती।'),
    ('requestErrors.REQUEST_ARCHIVED', 'هذا الطلب في الأرشيف، استعِده أولًا.', 'This request is archived — restore it first.', 'यह अनुरोध संग्रह में है — पहले इसे पुनर्स्थापित करें।'),
    ('requestErrors.ALREADY_ARCHIVED', 'هذا الطلب في الأرشيف بالفعل.', 'This request is already archived.', 'यह अनुरोध पहले से ही संग्रह में है।'),
    ('requestErrors.NOT_ARCHIVED', 'هذا الطلب ليس في الأرشيف.', 'This request is not archived.', 'यह अनुरोध संग्रह में नहीं है।'),
    ('requestErrors.EDIT_WINDOW_CLOSED', 'انتهت مهلة تعديل هذا الطلب.', 'The edit window for this request has closed.', 'इस अनुरोध की संपादन अवधि समाप्त हो गई है।'),
    ('requestErrors.ALREADY_APPROVED', 'تم اعتماد هذا الطلب في المرحلة الأولى بالفعل.', 'This request is already approved at the first level.', 'यह अनुरोध पहले चरण में पहले ही स्वीकृत है।'),
    ('requestErrors.ALREADY_REJECTED', 'تم رفض هذا الطلب في المرحلة الأولى بالفعل.', 'This request is already rejected at the first level.', 'यह अनुरोध पहले चरण में पहले ही अस्वीकृत है।'),

    ('requestErrors.REASON_REQUIRED', 'السبب مطلوب.', 'A reason is required.', 'कारण आवश्यक है।'),
    ('requestErrors.OUTCOME_REQUIRED', 'اختر ما سيؤول إليه الطلب.', 'Choose what the request becomes.', 'चुनें कि अनुरोध का क्या होगा।'),
    ('requestErrors.POSTPONE_DATE_REQUIRED', 'تاريخ التأجيل مطلوب.', 'A postponement date is required.', 'स्थगन तिथि आवश्यक है।'),
    ('requestErrors.POSTPONE_DATE_PAST', 'يجب أن يكون تاريخ التأجيل في المستقبل.', 'The postponement date must be in the future.', 'स्थगन तिथि भविष्य की होनी चाहिए।'),
    ('requestErrors.UNKNOWN_LINE', 'هذا الصنف لا ينتمي إلى هذا الطلب.', 'That item does not belong to this request.', 'यह सामान इस अनुरोध का नहीं है।'),
    ('requestErrors.QUANTITY_NOT_POSITIVE', 'يجب أن تكون الكمية أكبر من صفر — احذف الصنف بدلًا من ذلك.', 'The quantity must be above zero — remove the item instead.', 'मात्रा शून्य से अधिक होनी चाहिए — इसके बजाय सामान हटाएँ।'),
    ('requestErrors.NO_LINES_LEFT', 'لا بد من بقاء صنف واحد على الأقل في الطلب.', 'At least one item must remain on the request.', 'अनुरोध में कम से कम एक सामान रहना चाहिए।'),
    ('requestErrors.ISSUED_OUT_OF_RANGE', 'الكمية المسلَّمة يجب أن تكون بين صفر والكمية المعتمدة.', 'The delivered quantity must be between zero and the approved quantity.', 'दी गई मात्रा शून्य और स्वीकृत मात्रा के बीच होनी चाहिए।'),
    ('requestErrors.NOTHING_DELIVERED', 'سجّل صنفًا واحدًا على الأقل بكمية أكبر من صفر.', 'Record at least one item with a quantity above zero.', 'कम से कम एक सामान शून्य से अधिक मात्रा के साथ दर्ज करें।'),
    ('requestErrors.INSUFFICIENT_STOCK', 'الرصيد المتاح لا يكفي للكمية المطلوب تسليمها.', 'There is not enough stock on hand for the quantity being delivered.', 'दी जा रही मात्रा के लिए पर्याप्त स्टॉक उपलब्ध नहीं है।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
