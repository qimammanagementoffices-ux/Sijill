# Need Request Workflow (طلبات الاحتياج)

Target spec for the full approval lifecycle. Written for an implementing agent.

Sources reconciled here: the owner's workflow description, the legacy app
(`sijill-FINAL/index.html`), and the current backend
(`NeedRequestService`, `NeedRequestController`, `NeedRequestStatus`).
Arabic strings are the exact copy to ship — do not re-translate them. Where a
string already exists in the legacy dictionary its key is given in `code`.

**Status: implemented** in `V109` (need requests) and `V108` (maintenance and
asset requests). §7 records the defects found in the workflow as first
described and how each was resolved — read it before changing any of this.

Two deliberate differences per request type:

- **Maintenance** keeps its START step: after final approval the card offers
  `بدأ التنفيذ`, and `إنهاء العمل` (which records the parts consumed) only once
  work is under way. Its post-work state is `DONE`, not `DELIVERED`.
- **Asset requests** have no receipt step: fulfilling one performs a custody
  transfer, which is already its own audited record naming the receiving
  employee, and rejecting receipt would mean reversing a transfer.

## Ground rules

1. **Permission-gated at every step.** Submit, approve, postpone, reject,
   counter-sign, deliver, receive, archive — each is performed only by an
   employee holding the matching permission. Never render an action the caller
   cannot execute, and always re-check server-side. The hidden button is UX; the
   check is the rule.
2. **Legacy styling is binding.** Markup, class names, wording, spacing and
   colours come from the legacy app. Reuse `.req-card`, `.req-card-top`,
   `.req-meta`, `.req-items`, `.chip`, `.edit-note`, `.tomorrow-note`,
   `.req-actions` and the `stamp()` status pill. Add to that CSS rather than
   inventing a parallel style. The two review statuses are new and have no
   legacy pill — style them from the existing tokens (`--slate-soft` for
   under-review, not a new colour).
3. **Improvements are proposals.** Anything not in this document that seems
   worth adding goes to §8 for the owner to rule on, not into the build.
4. **Nothing is ever deleted.** No delete action at any status, for anyone. The
   only removal is **archive**, which hides the request from working lists and
   keeps every row, action, line and attachment. The legacy `btn_delete_req` /
   `confirm_delete_req` / `toast_req_deleted` strings and the `delete-need`
   handler are dropped, not restyled.

## 1. Roles and permissions

| Role | Permission | Can |
|---|---|---|
| Requester | `wh.request` | Submit; edit within the window; confirm or reject receipt. |
| Approver | `wh.act.approve` / `wh.act.reject` / `wh.act.postpone` | First-level decision. |
| Senior approver | **`wh.act.countersign`** *(new)* | Confirm or overturn the first-level decision. |
| Storekeeper | `wh.act.finish` | Record the actual delivery and deduct stock. |
| Admin | `emp.manage` | Keeps the edit affordance after the requester's window closes; archives. |

One new permission key per domain, seeded in `V109`:
`wh.act.countersign`, `mt.act.countersign`, `as.act.countersign`.
Without it the second stage would fall back to `wh.act.approve` — meaning the
same employee approves and then counter-signs their own approval, and the
two-level review is decorative. See §7.1.

Receipt and archive need no key of their own: receipt is gated by ownership
(only the requester confirms), archive by the existing `emp.manage`.

**Distinct-actor rule.** The counter-signing employee must not be the employee
who made the first-level decision, and neither may be the requester. Enforced
server-side on the actor id, not on permissions — one employee can legitimately
hold both keys.

## 2. Status model

Current enum: `PENDING, APPROVED, POSTPONED, REJECTED, CLOSED`. Target:

| Status | Card flag | Meaning |
|---|---|---|
| `PENDING` | `قيد الانتظار` (`status_pending`) | Awaiting first-level decision. |
| `POSTPONED` | `مؤجَّل` (`status_postponed`) | Deferred to a date; auto-returns to pending. |
| `APPROVED_UNDER_REVIEW` | `اعتماد / تحت المراجعة` *(new)* | Approver said yes; not yet counter-signed. |
| `REJECTED_UNDER_REVIEW` | `مرفوض (تحت المراجعة)` *(new)* | Approver said no; not yet counter-signed. |
| `APPROVED` | `تمت الموافقة` (`status_approved`) | Counter-signed. Delivery unlocked. |
| `DELIVERED` | `تم التسليم` *(new)* | Stock deducted; awaiting the requester's receipt. |
| `REJECTED` | `مرفوض` (`status_rejected`) | Counter-signed rejection. Terminal. |
| `CLOSED` | `تم الاستلام` (`status_closed`) | Receipt confirmed. Terminal. |

`DELIVERED` and the receipt step are conditional on §7.2 — if the owner keeps
the current decision-record position, delivery goes straight to `CLOSED` and
`DELIVERED` is not built.

**Archive is not a status.** It is `archivedAt` / `archivedBy` on the request.
Making it a status erases whatever the request *was* (rejected? closed?) and
makes "restore" ambiguous. Every default query gets
`and archived_at is null`; an explicit archive filter shows the rest.

Every transition writes a `NeedRequestAction` row: actor, action, comment,
timestamp. The card timeline renders that list oldest-first — add
`@OrderBy("createdAt")` to `NeedRequest.actions`, which currently has none, so
the order is whatever Postgres returns.

## 3. Submission and the edit window

- Requester submits; card appears immediately with flag `قيد الانتظار`.
- For **one hour from submission** the card shows the edit button and:

  > `يمكنك تعديل هذا الطلب حتى الساعة {time} (خلال ساعة من وقت التقديم).`
  > — `edit_note_active`, `.edit-note`

  `{time}` is `createdAt + 1h` in Arabic 12-hour form. Serve `editableUntil`
  from the API; never compute the deadline from the browser clock, and reject a
  late edit server-side regardless of what the UI showed.
- After the hour, legacy swaps the notice for
  `انتهت مهلة تعديل هذا الطلب (كانت متاحة خلال ساعة واحدة من وقت التقديم).`
  (`edit_note_expired`, `.edit-note.expired`). The owner's description says to
  remove the notice entirely — see §7.9.
- The edit button also disappears the moment the status leaves `PENDING`, even
  inside the hour: an approver may act in minute ten. The edit endpoint
  re-checks status, not just the clock.
- Admin (`emp.manage`) keeps the edit button after the window closes. An admin
  edit writes an action row like any other change — see §7.10.

## 4. First-level review

The card lists for the approver under the tab:

> `طلبات بانتظار الاعتماد (عدد الطلبات)`

The count is the approver's visible `PENDING` requests, including postponed ones
whose date has arrived.

### 4a. Postpone — تأجيل

Modal (`action_postpone_title`):

- Postpone-until date — **required**, `min` = tomorrow (legacy uses
  `min="${addDays(todayStr(),1)}"` with tomorrow as the default value).
- Reason — **required**. Note legacy makes it optional for postpone
  (`requiresComment = status==='rejected'`); the owner requires it. Owner wins.
- Confirm: `تأكيد` (`btn_confirm`).

Effects:

- Status → `POSTPONED`, flag `مؤجَّل`.
- Card shows reason, date, and the employee who postponed it.
- No edit button.
- Notice (`postpone_resurface_note`):

  > `سيُعاد عرض هذا الطلب تلقائيًا في قائمة الانتظار بتاريخ {date}.`

- The card's normal start-date note (`.tomorrow-note`) is suppressed while
  postponed — legacy shows it only for pending/approved/in-progress.
- **Resurfacing is a query condition, not a job.** Treat
  `status = POSTPONED and postponed_until <= today` as pending everywhere:
  the tab count, the list filter, and the action guards. No scheduler to miss a
  night, no state to repair. When it resurfaces, write the action row legacy
  writes — actor `النظام` (`system_actor`), comment
  `أُعيد الطلب تلقائيًا لانتهاء مدة التأجيل المحددة.` (`postpone_auto_comment`)
  — on first read after the date, once.

### 4b. Reject — رفض

Modal (`action_reject_title`): reason **required**; confirm `تأكيد`.

- Status → `REJECTED_UNDER_REVIEW`, flag `مرفوض (تحت المراجعة)`.
- Card shows reason, date, rejecting employee.
- Surfaces to the senior approver, who either:
  - **Confirms** (`تأكيد الرفض`) — optional comment → `REJECTED`, terminal.
  - **Overturns** (`إلغاء الرفض`, `btn_cancel_rejection`) — optional comment,
    then either postpone (required date + reason, as 4a) or grant final
    approval with the line edits of §5.

### 4c. Approve — اعتماد

Modal (`action_approve_title`): optional comment; confirm `تأكيد`; line editing
per §5.

- Status → `APPROVED_UNDER_REVIEW`, flag `اعتماد / تحت المراجعة`.
- Card shows comment, date, approving employee.
- Surfaces to the senior approver, who either:
  - **Confirms** (`تأكيد الاعتماد`) — optional comment, line editing still
    available → `APPROVED`, final.
  - **Cancels** (`إلغاء الاعتماد`, `btn_cancel_approval`) — optional comment,
    then either postpone or reject finally (`REJECTED`).

A request returned to `PENDING` by an overturn must not be silently re-decided
the same way by the same approver — see §7.5.

## 5. Line editing during a decision

Available in the first-level approve modal, the senior confirm modal, and the
senior overturn-to-approve modal. The decider may change a line quantity or drop
a line, under two invariants enforced on client **and** server:

- At least one line must remain.
- No remaining line may have quantity zero.

**These invariants apply only to requests that have lines.** `submit` accepts a
notes-only "custom request" with zero lines; for those the rule is unsatisfiable
and must be skipped, not enforced — see §7.6.

Each edit is recorded **on the action row that carried it**, not as a single
before/after pair on the line. Two deciders can edit the same line in sequence,
and the card must be able to say what each of them did. Card notices:

- `تم تعديل <اسم الصنف> من <الكمية قبل> إلى <الكمية بعد>`
- `تم حذف الأصناف: <أسماء الأصناف>`

Dropped lines are marked removed with the removing action, never hard-deleted
(rule 4 applies inside the request too — otherwise the notice outlives the row
it describes and the delivery modal can't show what was cut).

The **approved** quantity, not the originally requested one, is what the
delivery step caps against. See §7.4.

## 6. Delivery and receipt

### 6a. Delivery — إنهاء التسليم

Shown only at status `APPROVED`, only to `wh.act.finish` — the storekeeper who
physically hands the items over, **not** the requester. See §7.3.

Modal, titled `إنهاء التسليم — تقرير الأصناف` (`modal_finish_need`), hint
(`finish_work_desc_wh`):

> `حدّد الأصناف التي سلّمتها فعليًا من المستودع العام لهذا الطلب. سيُخصم المخزون تلقائيًا، وقد تختلف عن الكميات المطلوبة أصلًا.`

Contents, in legacy order:

1. Search box — `ابحث باسم الصنف أو رمزه...` (`search_items_ph`)
2. Selected-count chip — `{n} صنف محدَّد` (`finish_selected_count`)
3. Category group heading (icon + name), then per item: name, quantity input
   **with stepper arrows**, and the available-stock sub-line
   `الرصيد المتاح: 15 علبة`
4. `ملاحظات` textarea — `أي ملاحظات عن العمل المنجز...` (`finish_notes_ph`)
5. `إرفاق صور أو ملف PDF (اختياري)` with `إرفاق ملفات` and the
   `لا توجد مرفقات` empty state
6. Footer: `إنهاء العمل` (primary) and `إلغاء`

Effects:

- Deduct through the existing audited quantity path in one transaction — never a
  direct write to `quantity`.
- Issued may be **less** than approved (partial fulfilment, decision-record D1).
  It may not exceed approved, and may not exceed on-hand stock; both are
  validated server-side with a field-level error.
- At least one line must be issued a positive quantity. The current code accepts
  an all-zero delivery and closes the request — see §7.7.
- Delivery attachments must be distinguishable from the requester's own
  attachments, or both render on the card as if the requester filed them — see
  §7.8.
- Status → `DELIVERED` (or `CLOSED` if §7.2 is resolved against the receipt
  step).

### 6b. Receipt — تم الاستلام / رفض الاستلام

Legacy shows the requester two buttons once the request is delivered:

- `تم الاستلام` (`btn_close_receive`) → `CLOSED`.
- `رفض الاستلام` (`btn_reject_receipt`, `action_reject_receipt_title`) — reason
  **required** (`reject_receipt_ph`), and per `reject_receipt_desc` the request
  returns to its previous status **and the deducted stock is restored
  automatically**, with the same items and quantities pre-filled when the
  delivery modal is reopened.

This step is currently ruled out by decision-record D3 and is absent from the
owner's description. §7.2 is the decision.

## 7. Defects and gaps

Ordered by blast radius. Each is a change to the workflow as described, not a
matter of taste.

### 7.1 Two-level review with one permission key is not a review — **blocking**
The permission catalogue has `wh.act.approve|reject|postpone|finish` and nothing
else. With no `wh.act.countersign`, the counter-sign endpoint must reuse
`wh.act.approve`, so the approver can confirm their own approval and the second
stage adds clicks and no control. Fix: seed the new key **and** add the
distinct-actor check of §1 — one employee may legitimately hold both keys, so
permissions alone don't separate the stages.

### 7.2 Receipt confirmation — **resolved: restored** (owner, 2026-08-14)
Legacy has `تم الاستلام` / `رفض الاستلام` with automatic stock restore.
`docs/decision-record.md` D3 explicitly dropped it ("no separate
requester-confirmation step, no admin force-close"), and D1–D4 are marked
**locked, schema-critical**. The owner's workflow ends at delivery and mentions
neither. Whichever way this goes, the decision record needs an amendment rather
than a silent divergence — D1 (quantity semantics) is also touched by §5's
approved-quantity field. If receipt is restored, it needs a timeout or an admin
force-close, otherwise delivered requests sit unconfirmed forever — exactly the
path D3 removed.

### 7.3 The requester must not be the one who deducts stock — **blocking**
"فقط بعد الاعتماد النهائي يظهر زر للموظف إنهاء التسليم" reads as the requester
pressing `إنهاء التسليم`. That makes the beneficiary of the request the person
who declares what left the warehouse and drives the stock decrement — directly
against ground rule 1. Legacy gates the button on `wh.act.finish`, and the
backend already does the same. Keep it with the storekeeper; give the requester
the receipt step (§6b) if the owner wants them in the loop.

### 7.4 Delivery is capped against the *requested* quantity — **bug**
`NeedRequestService.finish` rejects `quantityIssued > line.getQuantityRequested()`.
Once approvers can cut quantities (§5), a line approved down from 10 to 5 can
still be delivered at 10, because `quantityRequested` never changed. Add
`quantityApproved` (null = never edited) and cap against
`quantityApproved ?? quantityRequested`.

### 7.5 Overturn/postpone loops have no stop — **bug**
Three unbounded cycles: an approver can postpone the same request indefinitely;
a senior overturn returning to `PENDING` lands back with the approver who just
decided, who can repeat the same decision; and a rejected receipt (if restored)
returns to `APPROVED` for another delivery. Minimum fix: after an overturn, mark
the request as returned-by-senior and block the same actor from repeating the
same decision — a different approver or the senior must act. A postpone count on
the card makes the second and third postponement visible, which is usually
enough without a hard cap.

### 7.6 The "at least one line" rule is unsatisfiable for notes-only requests — **bug**
`submit` deliberately accepts a request with no lines, described entirely in
notes. §5's invariant would block approving one. Skip the invariant when the
request has no lines; the delivery modal for such a request shows
`لا توجد أصناف مرتبطة بهذا الطلب لعرضها هنا.` (`finish_no_req_items`).

### 7.7 A delivery of nothing closes the request — **bug**
`finish` accepts `quantityIssued = 0` on every line and still sets `CLOSED`, so a
request can be closed having delivered nothing, with no remainder tracked
anywhere. Require at least one positive line. Separately: a partial delivery
also closes the request and silently drops the remainder — if that is not
intended, it needs the partial-delivery proposal in §8.

### 7.8 Delivery attachments are indistinguishable from request attachments — **bug**
The finish modal uploads under `ownerType = NEED_REQUEST`, the same owner type
the requester's own attachments use, so the card will render the storekeeper's
delivery photos as if the requester had filed them. Needs a separate owner type
or a discriminator column.

### 7.9 Edit-notice removal contradicts legacy — **minor conflict**
The owner says to remove the notice when the hour lapses; legacy replaces it
with `edit_note_expired`, which explains why the button vanished. Recommend
legacy's behaviour under ground rule 2 — a control that silently disappears
reads as a bug to the user.

### 7.10 The admin edit is an unaudited hole — **bug**
The admin keeps the edit button indefinitely. Editing lines on a request that is
already approved or counter-signed changes what was approved after the fact,
under the approvers' names. Either block admin edits past `PENDING`, or record
the edit as an action and return the request to `PENDING` for re-approval.

### 7.11 Stale transitions in the current service — **bug**
`reject` currently allows `PENDING, APPROVED, POSTPONED` and `postpone` allows
`PENDING, APPROVED`. Under the new model those let a first-level approver undo a
counter-signed final approval. Re-scope every `requireStatus` list to the new
enum before wiring any UI.

### 7.12 Approval reserves nothing — **known limitation, worth surfacing**
Stock is deducted at delivery (D1), so two requests approved for the same item
can exceed stock and the second delivery fails at the counter, after both
requesters were told yes. Not a new defect — legacy behaves the same — but the
approval modal should at least show on-hand stock minus already-approved,
not-yet-delivered quantities, so the approver sees the collision before saying
yes.

### 7.13 Concurrency is survivable but reads badly — **minor**
`InventoryItem` carries `@Version`, so two simultaneous deliveries of the same
item cannot drive stock negative — the second throws an optimistic-lock failure.
It surfaces to the storekeeper as a generic conflict, not as
"another delivery just took this stock". Worth a targeted message.

### 7.14 Scope across request types — **resolved: all three** (owner, 2026-08-14)
Maintenance keeps its extra step: after final approval its card shows
`بدأ التنفيذ` (`mt.act.start`, status `IN_PROGRESS`), and `إنهاء العمل` only
once work has started. Need requests go straight from `APPROVED` to delivery.

Original note:
`MaintenanceRequest` and `AssetRequest` follow the same status pattern and share
the card layout. Two-level review on need requests only will leave three request
types with visibly different action rows. Decide now whether counter-signing
applies to all three; retrofitting later is a second migration on each.

### 7.15 No department scoping on the approver's queue — **question**
`search` restricts to the requester only when the caller lacks `wh.view`;
otherwise every approver sees every request. Two-level approval normally implies
each approver sees their own department's queue. If that is intended, it is a
repository change, not a UI filter.

## 8. Proposals (ground rule 3 — owner decides)

1. **Notify the requester** on each status change (in-app badge, no email).
   Today they learn of a rejection only by revisiting the page.
2. **Partial delivery with a remainder** — a second delivery pass when the first
   under-delivers, instead of closing and losing the difference.
3. **Delegation** — an approver on leave nominates a stand-in, so requests do not
   stall in `PENDING`.
4. **Auto-escalation** — flag requests sitting in `PENDING` beyond N days; pairs
   naturally with the tab count.
5. **Self-approval block** — an approver cannot decide their own request
   (distinct from §1's distinct-actor rule, which only separates the two review
   stages).
6. **Senior queue tab** — `بانتظار المراجعة النهائية (n)`, mirroring the
   pending tab, so counter-signing is not a hunt through the list.
7. **Recompute `suggestedStartDate` on resurface** — a postponed request keeps
   the start date computed at submission, which is in the past by the time it
   returns.

## 9. Schema and API deltas

Backend:

- `NeedRequestStatus`: add `APPROVED_UNDER_REVIEW`, `REJECTED_UNDER_REVIEW`, and
  `DELIVERED` if §7.2 restores receipt.
- `NeedRequest`: `postponedUntil`, `archivedAt`, `archivedBy`, `returnedBySenior`.
- `NeedRequestLine`: `quantityApproved`, `removedByActionId`.
- `NeedRequestAction`: the per-action line-edit detail of §5, and
  `@OrderBy("createdAt")` on the parent collection.
- Permissions: `wh.act.countersign`, `wh.act.receive`, `wh.act.archive`.
- Endpoints: `/countersign`, `/overturn`, `/receive`, `/reject-receipt`,
  `/archive`, `/restore`. Existing `requireStatus` lists re-scoped per §7.11.

Frontend (`NeedRequestListItem` already carries `lines`, `actions`,
`attachments`):

- add `editableUntil`, `postponedUntil`, `archivedAt`, per-line
  `quantityApproved`, and the action-level edit detail.
- Every decision endpoint takes the request `version` for optimistic locking —
  two approvers on the same card must not both win.
- Buttons keep the existing pattern: spinner in the button while in flight,
  toast on failure, list refresh on success.
