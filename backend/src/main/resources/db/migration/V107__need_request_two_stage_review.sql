-- Two-stage review for need requests (docs/need-request-workflow.md).
-- APPROVED_UNDER_REVIEW / REJECTED_UNDER_REVIEW are 21 characters, so the
-- status column has to grow before any row can carry them.
alter table need_request alter column status type varchar(32);
alter table need_request_action alter column action type varchar(32);

alter table need_request add column if not exists postponed_until date;
alter table need_request add column if not exists returned_by_senior boolean not null default false;
alter table need_request add column if not exists archived_at timestamptz;
alter table need_request add column if not exists archived_by_employee_id uuid references employee(id);

-- The approved quantity, not the requested one, is what delivery caps against.
alter table need_request_line add column if not exists quantity_approved integer;
alter table need_request_line add column if not exists removed boolean not null default false;

-- One line change carried by one decision: the first-level approver and the
-- counter-signing official can both trim the same line, and the card has to
-- say what each of them did.
create table if not exists need_request_action_line (
    id                      uuid primary key default gen_random_uuid(),
    need_request_action_id  uuid not null references need_request_action(id) on delete cascade,
    need_request_line_id    uuid not null references need_request_line(id) on delete cascade,
    quantity_before         integer not null,
    quantity_after          integer,
    removed                 boolean not null default false
);

create index if not exists idx_need_request_action_line_action
    on need_request_action_line (need_request_action_id);
create index if not exists idx_need_request_postponed_until
    on need_request (postponed_until) where postponed_until is not null;

-- Requests already approved under the old single-stage flow stay approved:
-- APPROVED keeps meaning "deliverable", it just now requires two signatures
-- to reach. Nothing needs rewriting.

insert into permission (key, description) values
    ('wh.act.countersign', 'Counter-sign or overturn warehouse need request decisions'),
    ('mt.act.countersign', 'Counter-sign or overturn maintenance request decisions'),
    ('as.act.countersign', 'Counter-sign or overturn asset request decisions')
on conflict (key) do nothing;

insert into translation (key, value_ar, value_en, value_hi) values
    ('permission.wh_act_countersign', 'المراجعة النهائية لطلبات الاحتياج', 'Counter-sign warehouse need requests', 'आवश्यकता अनुरोधों की अंतिम समीक्षा'),
    ('permission.mt_act_countersign', 'المراجعة النهائية لطلبات الصيانة', 'Counter-sign maintenance requests', 'रखरखाव अनुरोधों की अंतिम समीक्षा'),
    ('permission.as_act_countersign', 'المراجعة النهائية لطلبات الأصول', 'Counter-sign asset requests', 'संपत्ति अनुरोधों की अंतिम समीक्षा'),

    -- Status flags on the card.
    ('requestStatus.PENDING', 'قيد الانتظار', 'Pending', 'लंबित'),
    ('requestStatus.APPROVED_UNDER_REVIEW', 'اعتماد / تحت المراجعة', 'Approved / under review', 'स्वीकृत / समीक्षाधीन'),
    ('requestStatus.REJECTED_UNDER_REVIEW', 'مرفوض (تحت المراجعة)', 'Rejected (under review)', 'अस्वीकृत (समीक्षाधीन)'),
    ('requestStatus.APPROVED', 'تمت الموافقة', 'Approved', 'स्वीकृत'),
    ('requestStatus.POSTPONED', 'مؤجَّل', 'Postponed', 'स्थगित'),
    ('requestStatus.REJECTED', 'مرفوض', 'Rejected', 'अस्वीकृत'),
    ('requestStatus.DELIVERED', 'تم التسليم', 'Delivered', 'वितरित'),
    ('requestStatus.CLOSED', 'تم الاستلام', 'Received', 'प्राप्त'),
    ('requestStatus.IN_PROGRESS', 'جاري التنفيذ', 'In progress', 'प्रगति में'),

    -- Action buttons.
    ('requestActions.approve', 'اعتماد', 'Approve', 'स्वीकृत करें'),
    ('requestActions.reject', 'رفض', 'Reject', 'अस्वीकार करें'),
    ('requestActions.postpone', 'تأجيل', 'Postpone', 'स्थगित करें'),
    ('requestActions.confirmApproval', 'تأكيد الاعتماد', 'Confirm approval', 'स्वीकृति की पुष्टि'),
    ('requestActions.confirmRejection', 'تأكيد الرفض', 'Confirm rejection', 'अस्वीकृति की पुष्टि'),
    ('requestActions.cancelApproval', 'إلغاء الاعتماد', 'Cancel approval', 'स्वीकृति रद्द करें'),
    ('requestActions.cancelRejection', 'إلغاء الرفض', 'Cancel rejection', 'अस्वीकृति रद्द करें'),
    ('requestActions.finishDelivery', 'إنهاء التسليم', 'Finish delivery', 'वितरण पूर्ण करें'),
    ('requestActions.startWork', 'بدأ التنفيذ', 'Start work', 'कार्य शुरू करें'),
    ('requestActions.finishWork', 'إنهاء العمل', 'Finish work', 'कार्य पूर्ण करें'),
    ('requestActions.confirmReceipt', 'تم الاستلام', 'Confirm receipt', 'प्राप्ति की पुष्टि'),
    ('requestActions.rejectReceipt', 'رفض الاستلام', 'Reject receipt', 'प्राप्ति अस्वीकार करें'),
    ('requestActions.edit', 'تعديل الطلب', 'Edit request', 'अनुरोध संपादित करें'),
    ('requestActions.archive', 'نقل إلى الأرشيف', 'Move to archive', 'संग्रह में ले जाएँ'),
    ('requestActions.restore', 'استعادة من الأرشيف', 'Restore from archive', 'संग्रह से पुनर्स्थापित करें'),
    ('requestActions.view', 'عرض', 'View', 'देखें'),
    ('requestActions.print', 'طباعة', 'Print', 'प्रिंट'),

    -- Decision modals.
    ('requestModals.approveTitle', 'اعتماد الطلب', 'Approve request', 'अनुरोध स्वीकृत करें'),
    ('requestModals.rejectTitle', 'رفض الطلب', 'Reject request', 'अनुरोध अस्वीकार करें'),
    ('requestModals.postponeTitle', 'تأجيل الطلب', 'Postpone request', 'अनुरोध स्थगित करें'),
    ('requestModals.confirmApprovalTitle', 'تأكيد الاعتماد', 'Confirm approval', 'स्वीकृति की पुष्टि'),
    ('requestModals.confirmRejectionTitle', 'تأكيد الرفض', 'Confirm rejection', 'अस्वीकृति की पुष्टि'),
    ('requestModals.cancelApprovalTitle', 'إلغاء الاعتماد', 'Cancel approval', 'स्वीकृति रद्द करें'),
    ('requestModals.cancelRejectionTitle', 'إلغاء الرفض', 'Cancel rejection', 'अस्वीकृति रद्द करें'),
    ('requestModals.rejectReceiptTitle', 'رفض الاستلام', 'Reject receipt', 'प्राप्ति अस्वीकार करें'),
    ('requestModals.rejectReceiptDesc', 'إذا لم تكن الأصناف المُسلَّمة مطابقة لما طلبته، اذكر السبب هنا. سيعود الطلب لحالته السابقة، وتُعاد الأصناف المخصومة سابقًا إلى المخزون تلقائيًا.', 'If the delivered items do not match what you requested, explain why here. The request returns to its previous status and the deducted stock is restored automatically.', 'यदि दिया गया सामान आपके अनुरोध से मेल नहीं खाता, तो कारण बताएं। अनुरोध पिछली स्थिति में लौटेगा और घटाया गया स्टॉक स्वतः वापस आ जाएगा।'),
    ('requestModals.commentLabel', 'تعليق', 'Comment', 'टिप्पणी'),
    ('requestModals.commentOptional', '(اختياري)', '(optional)', '(वैकल्पिक)'),
    ('requestModals.commentPlaceholder', 'اكتب ملاحظتك هنا...', 'Write your note here...', 'अपनी टिप्पणी यहाँ लिखें...'),
    ('requestModals.postponeUntilLabel', 'تاريخ إعادة العرض', 'Resurface on', 'पुनः प्रदर्शन तिथि'),
    ('requestModals.reasonRequired', 'السبب مطلوب', 'A reason is required', 'कारण आवश्यक है'),
    ('requestModals.dateRequired', 'التاريخ مطلوب', 'A date is required', 'तिथि आवश्यक है'),
    ('requestModals.editLines', 'تعديل الأصناف والكميات', 'Adjust items and quantities', 'सामान और मात्राएँ समायोजित करें'),
    ('requestModals.removeLine', 'حذف', 'Remove', 'हटाएँ'),
    ('requestModals.restoreLine', 'تراجع', 'Undo', 'वापस लें'),
    ('requestModals.keepOneLine', 'لا بد من بقاء صنف واحد على الأقل بكمية أكبر من صفر.', 'At least one item must remain with a quantity above zero.', 'कम से कम एक सामान शून्य से अधिक मात्रा के साथ रहना चाहिए।'),

    -- Card notices.
    ('requestCard.editNoteActive', 'يمكنك تعديل هذا الطلب حتى الساعة {time} (خلال ساعة من وقت التقديم).', 'You can edit this request until {time} (within one hour of submission).', 'आप इस अनुरोध को {time} तक संपादित कर सकते हैं (सबमिट करने के एक घंटे के भीतर)।'),
    ('requestCard.editNoteExpired', 'انتهت مهلة تعديل هذا الطلب (كانت متاحة خلال ساعة واحدة من وقت التقديم).', 'The edit window for this request has closed (editing was available for one hour after submission).', 'इस अनुरोध को संपादित करने की समय-सीमा समाप्त हो गई है।'),
    ('requestCard.postponeResurfaceNote', 'سيُعاد عرض هذا الطلب تلقائيًا في قائمة الانتظار بتاريخ {date}.', 'This request returns to the pending queue automatically on {date}.', 'यह अनुरोध {date} को स्वतः लंबित सूची में लौट आएगा।'),
    ('requestCard.returnedBySenior', 'أُعيد هذا الطلب من المراجعة النهائية — يلزم قرار من مسؤول آخر.', 'This decision was overturned in final review — another official must decide.', 'यह निर्णय अंतिम समीक्षा में पलट दिया गया — किसी अन्य अधिकारी को निर्णय लेना होगा।'),
    ('requestCard.lineQuantityChanged', 'تم تعديل {item} من {before} إلى {after}', '{item} changed from {before} to {after}', '{item} {before} से {after} किया गया'),
    ('requestCard.linesRemoved', 'تم حذف الأصناف: {items}', 'Items removed: {items}', 'हटाए गए सामान: {items}'),
    ('requestCard.archivedNote', 'هذا الطلب في الأرشيف.', 'This request is archived.', 'यह अनुरोध संग्रह में है।'),
    ('requestCard.pendingTab', 'طلبات بانتظار الاعتماد', 'Requests awaiting approval', 'स्वीकृति की प्रतीक्षा में अनुरोध'),
    ('requestCard.reviewTab', 'بانتظار المراجعة النهائية', 'Awaiting final review', 'अंतिम समीक्षा की प्रतीक्षा में'),
    ('requestCard.archiveTab', 'الأرشيف', 'Archive', 'संग्रह'),

    -- Delivery modal.
    ('requestDelivery.title', 'إنهاء التسليم — تقرير الأصناف', 'Finish delivery — item report', 'वितरण पूर्ण — सामान रिपोर्ट'),
    ('requestDelivery.description', 'حدّد الأصناف التي سلّمتها فعليًا من المستودع العام لهذا الطلب. سيُخصم المخزون تلقائيًا، وقد تختلف عن الكميات المطلوبة أصلًا.', 'Select the items you actually delivered from the main warehouse for this request. Stock is deducted automatically and may differ from the originally requested quantities.', 'इस अनुरोध के लिए मुख्य गोदाम से वास्तव में दिए गए सामान चुनें। स्टॉक स्वतः घटेगा और मूल मांगी गई मात्रा से भिन्न हो सकता है।'),
    ('requestDelivery.searchPlaceholder', 'ابحث باسم الصنف أو رمزه...', 'Search by item name or code...', 'सामान के नाम या कोड से खोजें...'),
    ('requestDelivery.selectedCount', '{n} صنف محدَّد', '{n} items selected', '{n} सामान चयनित'),
    ('requestDelivery.availableStock', 'الرصيد المتاح: {qty} {unit}', 'Available: {qty} {unit}', 'उपलब्ध: {qty} {unit}'),
    ('requestDelivery.notesLabel', 'ملاحظات', 'Notes', 'टिप्पणियाँ'),
    ('requestDelivery.notesPlaceholder', 'أي ملاحظات عن العمل المنجز...', 'Any notes about the completed work...', 'पूर्ण किए गए कार्य के बारे में टिप्पणियाँ...'),
    ('requestDelivery.noItems', 'لا توجد أصناف مرتبطة بهذا الطلب لعرضها هنا.', 'This request has no catalogue items to show here.', 'इस अनुरोध में दिखाने के लिए कोई सामान नहीं है।'),
    ('requestDelivery.submit', 'إنهاء العمل', 'Finish work', 'कार्य पूर्ण करें'),
    ('requestDelivery.atLeastOne', 'سجّل صنفًا واحدًا على الأقل بكمية أكبر من صفر.', 'Record at least one item with a quantity above zero.', 'कम से कम एक सामान शून्य से अधिक मात्रा के साथ दर्ज करें।')
on conflict (key) do update
set value_ar = excluded.value_ar,
    value_en = excluded.value_en,
    value_hi = excluded.value_hi;
