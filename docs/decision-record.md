# Sijill — Decision Record

Status: **ACCEPTED (D1–D4) — 2026-08-07**. Recommendations adopted as drafted, pending any later amendment. Sub-decisions resolved as follows unless changed:
- D1 sub-decision: partial fulfillment **allowed** at finish (issued quantity may be ≤ requested quantity; difference recorded in action history).
- D2 sub-decision: room number/name **is** exposed on the public QR view (simpler for MVP; revisit if this becomes a concern).
- D3 sub-decision: two-step DONE→CLOSED **collapsed to a single fulfiller-driven status** — the requester-confirmation step and the admin force-close-after-timeout path are dropped. A request moves directly to `CLOSED` when the fulfiller (`wh.act.finish` / `mt.act.finish` / `as.act.finish` holder) marks it done; no separate "received" confirmation UI.
- D4: `sys.*` prefix accepted.

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

- Add explicit keys rather than an implicit "is_admin" flag, to stay consistent with the existing fine-grained model: `sys.branding`, `sys.backup`, `sys.audit.view`.
- Do **not** introduce a separate boolean `isAdmin` field on `Employee` — "admin" becomes simply "an employee who holds a sufficiently broad set of these keys," consistent with how every other capability in the spec works. The onboarding first-admin creation step grants the first employee all keys.
- Exports (XLSX/print) inherit the view permission of the domain being exported (e.g., exporting the warehouse inventory list requires `wh.view`; no separate export permission needed) — exports aren't a new capability, just a different rendering of data the user can already view.

**Schema impact:** three new permission catalogue entries; no new tables. Confirm naming convention (`sys.*` prefix) is acceptable alongside `emp.*`, `wh.*`, `mt.*`, `as.*`.

---

## Summary — resolved 2026-08-07

1. **D1:** Decrement-on-fulfillment (not reserve-on-approval). Partial fulfillment **allowed** at finish.
2. **D2:** Token-based QR addressing + the stated public field allowlist. Room name/number **is** exposed.
3. **D3:** Collapsed to one fulfiller-driven `CLOSED` status — no separate requester-confirmation step, no admin force-close.
4. **D4:** New `sys.*` permission keys for branding/backup/audit — accepted.

These four are locked. Phase 1 migrations (entities, join tables, permission catalogue seed) can be written without risk of reshaping tables mid-build.
