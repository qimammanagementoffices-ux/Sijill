# Handoff — two-stage request review

Review brief for a second pass. Everything below was built in one session
against `docs/need-request-workflow.md`, which is the spec; this file is the
implementation account, the reasoning behind the non-obvious choices, and the
list of what is still wrong.

## 1. What shipped

| Commit | On | Contents |
|---|---|---|
| `f849b9c` | `main` | Two-stage review across need, maintenance and asset requests |
| `57a3edc` | `main` | Renumber `V107` → `V109` (Codex; Flyway version collision) |
| `e02ba5f` | `main` | Correct the migration numbers left stale by the rename |
| `ae40e99` | `feat/request-wizard-room-attachments` | Translate workflow refusals — **not yet merged** |

`main` is deployed and in use. `ae40e99` is not.

## 2. The flow as built

```
PENDING ──approve──→ APPROVED_UNDER_REVIEW ──countersign──→ APPROVED ──→ …
   │                        │
   │                        └──overturn──→ REJECTED / POSTPONED
   ├──reject───→ REJECTED_UNDER_REVIEW ──countersign──→ REJECTED
   │                        └──overturn──→ APPROVED / POSTPONED
   └──postpone─→ POSTPONED ──(date arrives)──→ reads as PENDING
```

Tail per domain:

- **Need:** `APPROVED` → `إنهاء التسليم` (storekeeper, `wh.act.finish`) → `DELIVERED`
  → requester confirms → `CLOSED`. Rejecting receipt returns the issued
  quantities to stock and goes back to `APPROVED`.
- **Maintenance:** `APPROVED` → `بدأ التنفيذ` (`mt.act.start`) → `IN_PROGRESS` →
  `إنهاء العمل` on the request page, where parts consumed are recorded → `DONE`
  → requester confirms → `CLOSED`. Rejecting receipt returns the parts to stock
  and goes back to `IN_PROGRESS`.
- **Asset:** `APPROVED` → finish performs a custody transfer → `CLOSED`. No
  receipt step (see §4).

## 3. Decisions worth re-examining

Each of these was a judgement call, not a forced move. Listed so a reviewer can
disagree with the reasoning rather than just the code.

**Two permission keys do not separate two stages.** `*.act.countersign` was
added per domain, but one employee can hold both it and `*.act.approve`, so the
separation is enforced on the *actor id*: `requireDistinctFromFirstLevel` walks
the action history for the last `APPROVE`/`REJECT` and refuses if it was this
actor, and refuses the requester outright. Permissions alone would have been
decorative.

**Resurfacing is a query condition, not a job.** A postponed request whose date
has arrived is treated as `PENDING` by `effectiveStatus()`, by the repository
`search`, and by `countByStatus`. No scheduler, so no night to miss and no state
to repair — but it means the *stored* status still says `POSTPONED` and any new
query that filters on `status` directly will disagree with the UI. That is the
main hazard of this design; grep for `effectiveStatus` before adding one.

**Archive is a flag, not a status.** `archivedAt` / `archivedBy`. As a status it
would erase whether the request was rejected or closed, and make "restore"
ambiguous. Every default query carries `archived_at is null`.

**Line edits are recorded per action, not per line.** `need_request_action_line`
holds `(action, line, quantity_before, quantity_after, removed)`. A single
before/after pair on the line was the first design and is wrong: the first-level
approver and the counter-signer can both trim the same line, and the card has to
attribute each change. Soft-removal (`need_request_line.removed`) exists for the
same reason — the "تم حذف الأصناف" notice must outlive the row it names.

**Delivery caps against `quantity_approved`, not `quantity_requested`.** Without
this a line approved down from 10 to 5 stayed deliverable at 10.

**Decisions live only on the cards.** The three detail views were reduced to
read-only rather than maintaining a second copy of the action buttons. The one
exception is maintenance `إنهاء العمل`, which stays on the detail page because
that is where parts consumed are recorded; the card links to it.

## 4. Deliberate omissions

- **Asset requests have no receipt step.** Fulfilling one performs a custody
  transfer that is already an audited record naming the receiving employee;
  rejecting receipt would mean reversing a transfer. Revisit if the owner wants
  symmetry.
- **The delivery modal has no attachment control**, though the legacy design has
  one. Uploading under `ownerType = NEED_REQUEST` would make the storekeeper's
  delivery photos render as the requester's own attachments. Needs a distinct
  owner type first.
- **Maintenance requests have no approval-time line editing** — they have no
  lines; parts are recorded at finish.
- **No notification** on status change. The requester learns of a rejection by
  revisiting.

## 5. Open bugs

**5.1 Reduced or deleted items do not show on the card — unresolved, reported by the owner.**
The approver reduces a quantity or drops a line during approval; the card shows
no `تم تعديل …` / `تم حذف الأصناف …` notice. The whole path reads as correct:
`RequestDecisionDialog.submit` sends only changed lines →
`NeedRequestService.applyLineEdits` writes `NeedRequestActionLine` rows →
`NeedRequestActionDto.LineEdit` maps them → `lineEditNotices()` in
`RequestList.tsx` renders them. Not reproduced locally (no JDK, no DB).

The diagnostic that splits it: after approving with a reduction, does the item
chip show the new quantity or the original? The chip renders
`quantityApproved ?? quantityRequested`, so the new number means the edit
persisted and only the notice is broken; the original number means the edit
never reached the backend.

Candidates worth checking in order: whether `need_request_action_line` has rows
at all after an approval; whether the nested EAGER collection
(`NeedRequest.actions` → `NeedRequestAction.lineEdits`) is actually populated in
the list DTO; and whether `requestCard.lineQuantityChanged` resolves (a missing
translation key renders as an empty string, which would show as an empty
paragraph rather than nothing at all).

**5.2 Archiving returns an error — unresolved, reported by the owner.**
Exact message not yet captured. `archive()` deliberately uses `get()` rather
than `openRequest()`, so it is not the archived-guard. The button is gated on
`emp.manage`, matching `@PreAuthorize`. Unknown from here.

**5.3 `V108` runs before `V109`.** Harmless — different tables, and `V108` does
not depend on the permissions `V109` seeds — but the numbering reads backwards
permanently, a leftover of the collision rename.

## 6. Where to look

Backend:

```
domain/{Need,Maintenance,Asset}RequestStatus.java   the state machines
domain/NeedRequestActionLine.java                   per-action line edits
service/NeedRequestService.java                     canonical implementation
service/{Maintenance,Asset}RequestService.java      same flow, per-domain tails
error/RequestWorkflowErrors.java                    coded refusals (ae40e99)
repository/*RequestRepository.java                  archived + resurface conditions
resources/db/migration/V108,V109,V110
```

Frontend:

```
components/RequestDecisionDialog.tsx    one dialog for all six decisions
components/RequestDeliveryDialog.tsx    إنهاء التسليم
lib/requestErrorMessage.ts              error code → translated message
app/(app)/warehouse/requests/RequestList.tsx        canonical card
app/(app)/{maintenance/requests,asset-requests}/…   same treatment
```

## 7. Constraints a reviewer should know

- **No JDK, Docker or `gh` locally.** The backend has never been compiled or run
  on this machine; `npx tsc --noEmit` and `npx eslint` are the only local checks.
  CI is the first real compile. Backend test results have to be pasted in.
- **`V108`/`V109` have run in production and are immutable.** Any correction is a
  new migration. `V110` has not run yet.
- **Pick new migration versions from `origin/main`,** not the local tree — that
  is exactly how the `V107` collision happened.
- **Deploy is gated on `main`**; merging triggers it.
- The permission rows exist but are **not assigned to anyone** by the migration.
  Until a second official holds `*.act.countersign`, requests pile up in
  `اعتماد / تحت المراجعة` — and by design it cannot be the same person who
  approved.

## 8. Testing status

Integration tests cover the need-request happy path (approve → countersign →
deliver → receive), the refusal when the same official counter-signs their own
approval, the delivery quantity cap, the empty-delivery refusal, and the
maintenance path through `START`. There is no test for overturn, archive,
reject-receipt stock restoration, or postpone resurfacing. None of the flow has
been exercised by hand against a real database by the author.
