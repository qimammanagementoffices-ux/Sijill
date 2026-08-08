# Sijill — Decision Record

Status: **ACCEPTED (D1–D5) — D1–D4 on 2026-08-07, D5 on 2026-08-08**. Recommendations adopted as drafted, pending any later amendment. Sub-decisions resolved as follows unless changed:
- D1 sub-decision: partial fulfillment **allowed** at finish (issued quantity may be ≤ requested quantity; difference recorded in action history).
- D2 sub-decision: room number/name **is** exposed on the public QR view (simpler for MVP; revisit if this becomes a concern).
- D3 sub-decision: two-step DONE→CLOSED **collapsed to a single fulfiller-driven status** — the requester-confirmation step and the admin force-close-after-timeout path are dropped. A request moves directly to `CLOSED` when the fulfiller (`wh.act.finish` / `mt.act.finish` / `as.act.finish` holder) marks it done; no separate "received" confirmation UI.
- D4: `sys.*` prefix accepted.
- D5: restore reuses `sys.backup` (no new permission key); wrong-PIN returns 409, not 401.

These are working defaults, not irreversible — flag anything you want changed before we get further into Phase 2+ (schema starts locking in once the initial migration lands, and it's still cheap to adjust in Phase 1).
Scope: schema-critical decisions only. These four items change entity shape, table structure, or transaction logic, so they must be settled before Phase 1 migrations are written. The remaining items in `sijill-architecture-review.md` (§ "Decisions required before implementation," items 2, 3, 8, 9, 10, 11, 12) are vendor/ops/config choices and can be decided phase-by-phase without schema rework.

---

## D1. Stock semantics — when does quantity actually change?

**Question (source: architecture review #7):** Does approving a `NeedRequest` reserve or decrement stock, or does only invoice receipt increment stock, with fulfillment decrementing it separately?

**Recommendation:** Decrement-on-fulfillment, no reservation in MVP.

- Invoice receipt (`PurchaseInvoice` posting) increments `InventoryItem.quantity` and updates last-purchase price — as already specified.
- `NeedRequest` approval does **not** touch quantity. It only changes request status.
- Quantity is decremented when the request action is marked `finish` (i.e., items are physically issued to the requester), by a fixed amount equal to the request's line-item quantities at that time.
- No stock reservation/hold state in MVP. Two approved-but-unfulfilled requests can compete for the same limited stock; the finisher sees current quantity and may partially fulfill or flag a shortfall.

**Why not reserve-on-approval:** reservation requires a hold/expiry model, a way to release holds on rejection/postponement, and changes `NeedRequest` from a simple status machine into a stateful stock-lock. That's real added complexity for an MVP where the school likely has one or two people processing requests sequentially, not concurrent high-volume fulfillment.

**Schema impact:** `NeedRequest` line items need a captured "quantity requested" (immutable) and, at finish, an audit trail of what was actually issued if it can differ from what was requested. Confirm: **should finish quantity be editable from the requested quantity** (partial fulfillment), or must it exactly match? This sub-question needs an answer alongside D1.

**Open sub-decision:** partial fulfillment allowed at finish, yes/no?

---

## D2. Public QR page — what's exposed, and how is the asset addressed?

**Question (source: architecture review #4):** Exact public field allowlist, and whether the QR URL uses the asset's real ID or an unguessable token.

**Recommendation:**

- **Addressing:** add a separate `publicToken` (UUID, indexed, unique) to `Asset`, generated at asset creation and never reused. The QR code encodes a URL built from this token, not the primary key or asset number. This avoids exposing sequential/guessable asset numbers and lets a token be rotated (e.g., re-issued QR label) without changing the asset's identity or history.
- **Field allowlist (public, unauthenticated):**
  - Asset number, localized name, category name, status (active/maintenance/retired), room number + localized name.
  - One representative photo (not the full photo set).
  - **Not public:** acquisition cost/vendor/invoice data, full photo gallery, notes, location history, responsible employee, depreciation fields.
- This needs sign-off, since it's a judgment call, not a technical constraint — the recommendation above optimizes for "useful for anyone who scans it" (what/where is this thing) while keeping financial and custody data internal.

**Schema impact:** `Asset.publicToken` (new column, unique constraint), and a dedicated read-only public DTO/projection enforced server-side — never reuse the internal asset serializer for this endpoint.

**Open sub-decision:** is the room number/name acceptable to expose publicly, or should the public view show only a generic room group (e.g., "Science Wing" instead of "Room 214")?

---

## D3. Request closure model — is DONE distinct from CLOSED, and who closes?

**Question (source: architecture review #5):** For each request type, are `DONE` and `CLOSED`/received distinct actions, and who is authorized to perform the closing action?

**Decision: collapsed to a single fulfiller-driven status.** No separate requester-confirmation step, no admin force-close-after-timeout path.

| Request type | Terminal status set by | 
|---|---|
| NeedRequest | Fulfiller (`wh.act.finish` holder) marks the request finished; items issued, stock decremented per D1, status → `CLOSED` in the same action |
| MaintenanceRequest | Fulfiller (`mt.act.finish` holder) marks the repair complete → `CLOSED` |
| AssetRequest | Fulfiller (`as.act.finish` holder) marks the action complete → `CLOSED` |

- The fulfiller's completion action *is* the closing action — there is no intermediate `DONE` state awaiting requester confirmation.
- Rejected because, at this school's scale (one or two staff processing requests sequentially), a separate "received" confirmation UI and force-close timer added a whole extra surface for low benefit. If this later proves wrong (e.g. requesters dispute fulfillment), a requester-confirmation step can be reintroduced without changing the core request/status tables — it would be an additive status, not a rework.

**Schema impact:** `action_history` entries still need to capture actor + role at each transition (open/approve/finish/reject/etc.), but no separate `DONE` status value and no force-close scheduler/job are needed.

---

## D4. Admin / cross-cutting permissions

**Question (not in the original 12, but blocking — see architecture critique):** What permission governs branding settings, backup/restore, and report exports, none of which fit the `emp.*`/`wh.*`/`mt.*`/`as.*` catalogue?

**Recommendation:**

- Add explicit keys rather than an implicit "is_admin" flag, to stay consistent with the existing fine-grained model: `sys.branding`, `sys.backup`, `sys.audit.view`. `sys.translations` (admin UI translation table) added later, same pattern, seeded via `V5__seed_sys_translations_permission.sql`.
- Do **not** introduce a separate boolean `isAdmin` field on `Employee` — "admin" becomes simply "an employee who holds a sufficiently broad set of these keys," consistent with how every other capability in the spec works. The onboarding first-admin creation step grants the first employee all keys.
- Exports (XLSX/print) inherit the view permission of the domain being exported (e.g., exporting the warehouse inventory list requires `wh.view`; no separate export permission needed) — exports aren't a new capability, just a different rendering of data the user can already view.

**Schema impact:** three new permission catalogue entries; no new tables. Confirm naming convention (`sys.*` prefix) is acceptable alongside `emp.*`, `wh.*`, `mt.*`, `as.*`.

---

## D5. Backup restore — re-auth, rate limiting, and status codes

**Question (Phase 7, not in the original 12 — restore was deliberately deferred out of Phase 6c per that phase's commit message, pending its own focused pass on safety mechanics):** How should restore re-verify the caller, rate-limit repeated attempts, and signal a wrong PIN, given restore is the single most destructive action in the app (replaces the entire live database)?

**Decision:**

- **Permission:** reuse the existing `sys.backup` key (its DB description already reads "Manage backups and restores") rather than a new permission — restore isn't a separate capability, it's a more dangerous action within the same capability.
- **PIN re-verification:** a new `AuthService.verifyPin(Employee actor, String pin)` that reuses the exact `passwordEncoder.matches(...)` check already used by login, checked against the *already-authenticated* actor's own stored hash — no phone lookup, since the JWT already identifies who's asking. Not a new auth flow.
- **Rate limiting:** a dedicated `RestoreRateLimiter` (3 attempts/60s, keyed by employee id) rather than reusing/generalizing the existing `LoginRateLimiter` (5/60s, keyed by phone). Deliberately tighter, since a wrong PIN here is guessed against an already-authenticated (possibly stolen/hijacked) session, not an anonymous login attempt — and kept as a separate class rather than risk a regression on the well-tested login path for the sake of a shared abstraction.
- **Wrong-PIN status code:** 409 Conflict, not 401 Unauthorized — deliberately non-standard for an auth failure. `apiClient.ts`'s frontend interceptor force-clears the session and redirects to `/login` on *any* 401 while a token is present (its "your session expired" handling); since the caller's session is actually still valid here (only the re-entered PIN is wrong), a 401 would silently log the admin out mid-retry instead of showing an inline error. 409 sidesteps that global interceptor while still being a defensible status for "this action conflicts with the required confirmation."
- **Pre-restore safety snapshot:** mandatory and automatic, not optional or user-triggered — every restore first takes its own backup (tagged `PRE_RESTORE`) of the state it's about to overwrite.
- **Restore mechanics:** reset the `public` schema (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) and restore into it empty, rather than relying on `pg_restore --clean --if-exists` against the live schema. `--clean` doesn't add `CASCADE` to its own DROP statements and reliably fails on cross-table foreign keys (confirmed live: it couldn't drop `employee` while `backup_snapshot.restored_by`'s FK — since removed, see below — still referenced it). `pg_restore` itself runs with `--no-owner --no-privileges` (the dump replays ownership statements tied to the database's original `postgres` owner role, which the app's connected role can't execute) and `--single-transaction` (so a failure rolls back atomically instead of partially applying, which the first live attempt did — 9 errors "ignored on restore").
- **Restore confirmation bookkeeping:** the `BACKUP_RESTORED` audit log entry is the *only* record of "a restore happened," written after the restore completes. Originally also tried to stamp `restoredAt`/`restoredBy` onto the restored snapshot's own row in `backup_snapshot` — that doesn't work: the schema-reset/restore replaces the entire table with the dump's contents, and the target snapshot's own row was always inserted *after* its own dump was taken (`captureSnapshot` dumps first, saves the row second), so it can never contain itself. Every restore would have 404'd on this step. `AuditLog.entityId` is a soft (non-FK) reference, so it doesn't have this problem — removed the columns in a follow-up migration rather than try to make the update work.

**Why not just reuse login's 401 + LoginRateLimiter:** both would technically work, but each would silently misapply a rule designed for a different threat model (anonymous credential guessing) to this one (an authenticated session re-confirming a destructive action) — the 401 collision in particular isn't a style nitpick, it's a real UX bug (surfaced and fixed during Phase 7 implementation): the global "401 = session expired" handling would have forced a logout on the very screen where the admin is trying to retry a mistyped PIN.

**Schema impact:** widened `triggered_by` check constraint (`PRE_RESTORE` added to `SCHEDULED`/`MANUAL`). No new permission catalogue entry. (`restoredAt`/`restoredBy` columns were added then dropped in the same phase once live testing showed they couldn't work — see above.)

**Known accepted gap:** if a restore targets a snapshot old enough to predate the calling actor's own employee record, the `BACKUP_RESTORED` audit insert fails on the actor foreign key — but only *after* the actual data restore has already fully succeeded. Not handled further; restoring anything but a recent snapshot is already a rare, deliberate action at this app's scale, and the failure mode is "confirmation step errors," not "restore silently fails."

---

## Summary — resolved 2026-08-07 (D1–D4), 2026-08-08 (D5)

1. **D1:** Decrement-on-fulfillment (not reserve-on-approval). Partial fulfillment **allowed** at finish.
2. **D2:** Token-based QR addressing + the stated public field allowlist. Room name/number **is** exposed.
3. **D3:** Collapsed to one fulfiller-driven `CLOSED` status — no separate requester-confirmation step, no admin force-close.
4. **D4:** New `sys.*` permission keys for branding/backup/audit — accepted.
5. **D5:** Restore reuses `sys.backup`; PIN re-verification via a new `AuthService.verifyPin`; a dedicated 3/60s `RestoreRateLimiter`; wrong-PIN returns 409 (not 401, to avoid the frontend's global session-expiry handling); mandatory pre-restore safety snapshot; restore resets the `public` schema and restores into it empty rather than relying on `pg_restore --clean`; confirmation is audit-log-only (no columns on the restored table itself — structurally can't work).

D1–D4 are locked (schema-critical, settled before Phase 1 migrations). D5 is locked the same way for anything touching restore going forward — the 409-not-401 choice in particular should not be "corrected" back to 401 without re-checking `apiClient.ts`'s interceptor first.
