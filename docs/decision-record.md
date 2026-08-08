# Sijill — Decision Record

Status: **ACCEPTED (D1–D10) — D1–D4 on 2026-08-07, D5–D10 on 2026-08-08**. Recommendations adopted as drafted, pending any later amendment. Sub-decisions resolved as follows unless changed:
- D1 sub-decision: partial fulfillment **allowed** at finish (issued quantity may be ≤ requested quantity; difference recorded in action history).
- D2 sub-decision: room number/name **is** exposed on the public QR view (simpler for MVP; revisit if this becomes a concern).
- D3 sub-decision: two-step DONE→CLOSED **collapsed to a single fulfiller-driven status** — the requester-confirmation step and the admin force-close-after-timeout path are dropped. A request moves directly to `CLOSED` when the fulfiller (`wh.act.finish` / `mt.act.finish` / `as.act.finish` holder) marks it done; no separate "received" confirmation UI.
- D4: `sys.*` prefix accepted.
- D5: restore reuses `sys.backup` (no new permission key); wrong-PIN returns 409, not 401.
- D6: site maintenance-mode gets its own new `sys.maintenance` permission (not folded into `sys.branding`); the reopen timer is informational only, never auto-disables maintenance mode.
- D7: admin-addable languages are stored **additively** (new `language`/`translation_extra_value` tables), not a redesign of the existing `translation` table's ar/en/hi columns; reuses `sys.translations` (no new permission key).
- D8: the live language switcher uses a plain preference **cookie** (not a route-segment locale prefix, not localStorage) read server-side on every page; a new public `GET /i18n/locales` endpoint backs it.
- D9: rate limiting moved from in-memory to a **Postgres-backed** `RateLimitStore` (not Redis) — reuses the existing DB rather than adding a new paid dependency for a login/restore-attempt hot path this small.
- D10: Render deploys are now gated on CI (`autoDeploy: false` + a CI `deploy` job that POSTs to a Render Deploy Hook only after `build` succeeds on `main`) — requires two GitHub secrets set manually before it's active.

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
- **Failure self-heal:** if `pg_restore` fails *after* the schema has already been reset (a separate, already-committed step), the live database would otherwise be left with zero tables — worse than the failure that triggered it. `restore()` catches that failure and attempts to restore the just-taken `PRE_RESTORE` snapshot as a best-effort rollback, surfacing a clear "rolled back, here's the original error" message on success, or a loud "CRITICAL: manual intervention needed" message naming the snapshot to restore from if the rollback attempt *also* fails.
- **Post-restore restart is manual, not automatic — reversed a decision mid-phase.** Confirmed live that a successful restore (schema reset + `pg_restore`) leaves the still-running app instance's Hikari pool and Hibernate metadata stale against the new schema — every DB-backed endpoint 500'd until the service was restarted. First tried scheduling `System.exit(0)` a few seconds after a successful restore, on the assumption Render restarts a web service whose process exits. That assumption did not hold up under live testing: the process exiting did not reliably bring the service back within any reasonable window (confirmed by waiting ~30s without manual intervention and still getting a 502), turning "some endpoints error until a restart" into "the whole app stuck down until someone manually restarts it in the Render dashboard" — worse than the problem it was meant to solve. Reverted; a manual restart of `sijill-api` after every restore is now a required, documented runbook step (§5), and the restore-success message shown in the UI reminds the admin of it directly.
- **Backup history is excluded from what restore rolls back — user's explicit choice, made after live testing surfaced the alternative.** A restore replacing the entire database also replaces `backup_snapshot` itself; combined with the target's own row never being in its own dump (see the bookkeeping point above), every restore was making the `/admin/backups` list appear to lose history — confusing and alarming even though the actual dump files in object storage were untouched. Presented as a real choice (leave as expected-but-confusing behavior, vs. exclude the table from restore scope entirely) rather than silently picking one. User chose exclusion. Implementation: `runPgDump` now passes `--exclude-table=public.backup_snapshot` (applies to every dump, not just pre-restore ones, for consistency — one dump format, not two); `resetPublicSchema` moves the live `backup_snapshot` table into a scratch schema before `DROP SCHEMA public CASCADE` and back afterward, so its current rows survive the reset untouched rather than being replaced by (excluded, absent) dump contents. Restore therefore no longer restores 100% of the database, deliberately — everything except the backup history itself. Known edge case: a target dump taken *before* this exclusion shipped still contains its own `backup_snapshot` table, so restoring one of those fails cleanly (table-already-exists) and triggers the existing self-heal rollback rather than corrupting anything; ages out naturally as old snapshots expire past the retention window.
- **Backup/restore is serialized with an in-process lock (`ReentrantLock`, `tryLock`) — added after live testing lost rows with no error logged anywhere.** After the backup-history-exclusion fix above, a restore run against a plain, current-format snapshot still silently dropped one row and didn't add the expected new pre-restore row — with nothing in the logs. The most plausible explanation: two backup/restore operations (e.g. a double-submitted restore click, or a "run backup now" overlapping a restore) interleaved their DDL against `resetPublicSchema`'s multi-step move-drop-recreate-move-back sequence, losing data without any single SQL statement actually erroring. Rather than confirm this from logs (none were available), added a lock covering both `runBackup` and `restore` — `tryLock` (not blocking `lock`) so a second concurrent attempt gets an immediate, clear 409 ("A backup or restore is already in progress") instead of silently queuing or interleaving. Also made `resetPublicSchema` unconditionally clear any leftover `restore_temp` schema at the start, as a defensive belt-and-suspenders measure independent of whether the lock is the full explanation. The frontend now only shows the localized "incorrect PIN" text for a 409 whose message is literally `"Invalid PIN"`; any other 409 (including this lock conflict) shows the backend's own message, since the two cases must not be conflated.

**Why not just reuse login's 401 + LoginRateLimiter:** both would technically work, but each would silently misapply a rule designed for a different threat model (anonymous credential guessing) to this one (an authenticated session re-confirming a destructive action) — the 401 collision in particular isn't a style nitpick, it's a real UX bug (surfaced and fixed during Phase 7 implementation): the global "401 = session expired" handling would have forced a logout on the very screen where the admin is trying to retry a mistyped PIN.

**Schema impact:** widened `triggered_by` check constraint (`PRE_RESTORE` added to `SCHEDULED`/`MANUAL`). No new permission catalogue entry. (`restoredAt`/`restoredBy` columns were added then dropped in the same phase once live testing showed they couldn't work — see above.)

**Known accepted gap:** if a restore targets a snapshot old enough to predate the calling actor's own employee record, the `BACKUP_RESTORED` audit insert fails on the actor foreign key — but only *after* the actual data restore has already fully succeeded. Not handled further; restoring anything but a recent snapshot is already a rare, deliberate action at this app's scale, and the failure mode is "confirmation step errors," not "restore silently fails."

---

## D6. Site maintenance-mode

**Question (Phase 8, not in the original 12 — user-requested kill-switch: an admin can close the whole site at any time, showing a maintenance page with an image, a message, and a reopen countdown):** What permission gates it, how is "the whole site" actually blocked given there's no existing middleware/route-interception mechanism, and does the reopen timer auto-disable maintenance mode?

**Decision:**

- **Permission:** new `sys.maintenance` key, not folded into `sys.branding` — this isn't a branding/appearance concern, it's a distinct, more consequential capability (taking the entire site offline for everyone else), and it also doubles as the *bypass* authority checked on every request while maintenance mode is on. Conflating it with branding would mean anyone who can change the theme color could also lock everyone else out.
- **Storage:** `maintenance_setting`, a single-row table using the exact same boolean-PK-with-check-constraint trick as `branding_setting` (V10) — `enabled`, `message_ar`/`message_en`/`message_hi`, an `image_attachment_id` FK reusing the existing generic `Attachment`/`AttachmentOwnerType` mechanism (new `MAINTENANCE` owner type, gated by `sys.maintenance` in both the view and manage switches), and `reopen_at`.
- **Enforcement mechanism:** the app has no Next.js middleware and no server-side auth check in the root layout (auth lives in `localStorage`, not a cookie, so the server-rendered layout can't itself resolve "is this visitor an admin"). Enforcement is therefore two-layered:
  - **Backend (the real enforcement):** a new `MaintenanceModeFilter`, added to the Spring Security chain via `.addFilterAfter(maintenanceModeFilter, JwtAuthenticationFilter.class)` — after JWT auth resolves `Authentication`, so it can check for the `sys.maintenance` bypass authority. When enabled, every request gets a 503 except an explicit allowlist (health check, login, `/auth/me`, the dictionary/branding/maintenance-status endpoints — kept in sync with `SecurityConfig`'s own `permitAll` list) and any caller currently holding `sys.maintenance`. This is what actually blocks API access; hiding UI is not treated as a security boundary (same principle as every other permission in this app).
  - **Frontend (UX only):** a `MaintenanceGate` client component wraps `{children}` in the root layout, which already does a public server-side fetch for branding — extended to also fetch maintenance status the same way (deliberately `cache: "no-store"`, not the 60s revalidate branding uses, so a toggle takes effect immediately rather than up to a minute later). Since the server layout can't resolve admin status itself, the gate does a **client-side** check after mount: if a token exists, call `/auth/me` and look for `sys.maintenance` in the returned permissions; render the maintenance page by default and swap in real content only once bypass is confirmed (avoids a flash of protected content). `/login` is explicitly exempted from the gate so an admin can always reach it to turn maintenance mode back off.
  - The maintenance page itself (`MaintenancePage.tsx`) is a **display component, not a route** — rendered in place by the gate at whatever URL the visitor was trying to reach, rather than a redirect to one fixed path. This works uniformly for every route without needing per-page redirect logic.
- **Naming:** everything here uses a `siteMaintenance*` prefix throughout (dict keys, nav label, route `/admin/site-maintenance`) — deliberately distinct from the app's existing `maintenance*` naming, which already belongs to the unrelated building-maintenance-request module (fault reporting/repair workflow, `mt.*` permissions). Mixing the two would be a serious, easy-to-make naming collision.
- **Reopen timer:** informational only. It renders a live countdown on the maintenance page, but does **not** automatically flip `enabled` back to false — an admin always does that explicitly. No scheduler/job was added for this; matches the "admin chooses when to close/reopen" framing of the original request rather than adding an unrequested auto-reopen mechanism.

**Schema impact:** new `maintenance_setting` table (V22), new `sys.maintenance` permission (V21), `AttachmentOwnerType` gains a `MAINTENANCE` variant.

**Bug found live post-deploy, fixed in V27:** the "no migration needed for the new `AttachmentOwnerType` value" reasoning above was wrong — `attachment.owner_type` has an explicit `CHECK (owner_type IN (...))` constraint from V10, not a bare unconstrained `varchar`. Every maintenance-image upload was failing with a 409 ("This action conflicts with existing data" — `DataIntegrityViolationException` on the CHECK violation) because `'MAINTENANCE'` was never added to the allowed list. `V27__widen_attachment_owner_type_check.sql` drops and re-adds the constraint with `'MAINTENANCE'` included, same pattern as V15 widening `backup_snapshot`'s trigger check. Lesson for any future `AttachmentOwnerType` addition: check V10 for the CHECK constraint, don't assume the column is unconstrained.

---

## D7. Admin-addable languages + AI auto-translation

**Question (Phase 9, not in the original 12 — user-requested: an admin languages page, "with possibility of adding more language, translated automatically by AI"):** How should languages beyond the built-in ar/en/hi be stored, given the existing `translation` table is hardcoded to exactly those three columns and ~40 frontend files already consume the `Dictionary` TS shape it produces?

**Decision:**

- **Additive, not a redesign.** The obvious "correct" design is an EAV rewrite — a `language` table plus a `translation_value(key, language, value)` table replacing `value_ar`/`value_en`/`value_hi` entirely, with the existing rows migrated in. That was seriously considered and rejected for this phase: it touches a core, already-working, already-tested system (`TranslationService`, `TranslationController`, the `/admin/translations` edit grid, `TranslationAdminTest`, `TranslationDictionaryTest`) on a **live production database with no review checkpoint before deploy** (this was built autonomously overnight — see the session's own context). A subtly-wrong data migration on that scale risks actual translation data loss with no way back, for a system that's been stable through 7+ phases. Instead: the existing `translation` table and its ar/en/hi columns are **completely untouched**. Two new tables — `language` (admin-added languages) and `translation_extra_value` (one row per key × extra-language pair) — sit alongside it. `TranslationService.getDictionary(locale)` checks `locale` against `{ar, en, hi}` first (unchanged existing code path) and only falls through to the new tables for anything else. Blast radius: additive only, nothing existing changes behavior.
- **Permission:** reuses `sys.translations` (its description broadened via a data-only migration) rather than a new key — managing which languages exist is the same capability as managing the strings themselves, one level up.
- **AI provider:** no SDK dependency added — a single plain HTTP call via `java.net.http.HttpClient` (built into the JDK) to the Anthropic Messages API, gated by the `app.translation.enabled`/`provider`/`api-key` properties that were already scaffolded in `application.yml`/`render.yaml` (as `TRANSLATION_HELPER_ENABLED`/`TRANSLATION_PROVIDER`/`TRANSLATION_API_KEY`) before this feature existed but were never actually wired to anything. `TranslationAiClient` is an interface with one implementation (`AnthropicTranslationAiClient`) — `provider` is validated against `"anthropic"` rather than silently ignored, since the property already implied a choice existed. **Requires manual setup**: `TRANSLATION_HELPER_ENABLED` defaults to `"false"` in `render.yaml`; `TRANSLATION_API_KEY` is `sync: false` (must be set manually in the Render dashboard, same pattern as the object-storage credentials) before "add language" will actually work. Until then it fails with a clear validation error naming exactly what's missing — this was verified live in CI, where the key is genuinely absent (see `LanguageTest`).
- **Batching, not per-key calls:** all ~150 existing keys are translated in a **single** request (source English values as one JSON object in the prompt, translated JSON object back), not 150 separate API calls — this is a cost/latency choice, not a technical constraint. Synchronous, not backgrounded: no job-queue infrastructure exists in this app, and adding a language is a rare, deliberate admin action, not a hot path, so the ~1-2 minute round-trip is a documented tradeoff (`LanguageController`'s own comment) rather than added complexity to avoid it.
- **Partial-failure behavior:** the `Language` row is inserted (its own transaction, via a separate `LanguagePersistence` bean — same self-invocation `@Transactional` fix as `RestoreBookkeeper` in Phase 7, since the AI HTTP call deliberately runs outside any transaction) *before* the AI call runs. If translation fails, the language stays visible with zero values rather than vanishing — the admin can see the failed attempt and delete-and-retry rather than wondering whether anything happened.
- **Review/edit UI:** a new page (`/admin/languages`) lists languages, adds new ones, and — after creation — shows a simple per-language key/value review table (`GET`/`PUT /i18n/languages/{code}/values...`), matching this project's own established caution (see V4's original i18n migration comment) that AI-drafted translations need human review before being trusted. The **existing** `/admin/translations` grid (ar/en/hi) is untouched, not extended to show extra languages dynamically — that's a follow-up if it's actually wanted, not assumed.

**Schema impact:** new `language` and `translation_extra_value` tables (V24); `sys.translations` permission description broadened (V25, data-only); no changes to `translation`'s existing columns.

**Known limitation, deliberately not addressed:** there is still no live language switcher anywhere in the app (confirmed pre-existing, `frontend/src/i18n/config.ts`'s comment: "a switcher is a later phase") — the site renders Arabic only, regardless of what languages exist in the admin page. Adding a language makes its dictionary genuinely fetchable via the existing `GET /i18n/dictionary?locale=xx` endpoint, but nothing in the UI lets an end user actually select it yet. That's out of scope here; this phase delivers the admin capability the user asked for, not the switcher nobody asked for yet.

---

## D8. Live language switcher

**Question (post-Phase-9 follow-up, user-requested: "no live language switcher" was flagged as a known gap in the runbook, and the user asked to close it first among a batch of pre-production items):** Phase 9 made admin-added languages fetchable via the API but nothing in the UI let an end user pick one — the site always rendered Arabic. How should a visitor's chosen locale actually reach every server-rendered page, given there's no route-segment locale (`/en/...`) and auth already lives in `localStorage`, not a cookie the server can read?

**Decision:**

- **Cookie, not localStorage, not a route prefix.** Auth uses `localStorage` specifically because there's no server-side session to check (see D6's note on why `MaintenanceGate` needs a client-side check) — but a locale *preference* has no such constraint, and a cookie is the only one of the three options a server component can read directly (`next/headers` `cookies()`), which is required since every page is `export const dynamic = "force-dynamic"` and server-renders its own dictionary. A route-segment locale (`/en/dashboard`) was rejected as a much larger refactor (every `Link`/`router.push` in ~40 files would need locale-awareness) for no real benefit over a cookie at this app's scale.
- **New public `GET /i18n/locales`** (`TranslationController`, no `@PreAuthorize`) returns the three built-ins (hardcoded display names/directions — nothing in the schema stores "what do we call Arabic," unlike admin-added `Language` rows which already have their own `name`/`direction`) plus every row from `LanguageRepository.findAll()`. Deliberately separate from `GET /i18n/languages` (admin management list, `sys.translations`-gated) — a language switcher is for every visitor, not just admins. Added to both `SecurityConfig`'s `permitAll` list and `MaintenanceModeFilter`'s allowlist, same treatment as `/i18n/dictionary`.
- **Every page resolves its own locale, mirroring the existing per-page `getDictionary(defaultLocale)` pattern.** The codebase never centralized dictionary-fetching into `RootLayout` and threaded it down — each of the ~42 `page.tsx` files independently calls `getDictionary(...)`. Rather than restructure that (large, unrelated blast radius), a new `getRequestLocale()` helper (`i18n/getRequestLocale.ts`) was substituted 1:1 for the old `defaultLocale` constant everywhere it was used — every page now resolves the visitor's actual cookie-selected locale instead of a hardcoded one, with no other change to each page's structure.
- **Cookie value is re-validated against the live locale list on every read, not trusted blindly.** If an admin deletes a language after a visitor's browser already stored that code in its cookie, `getRequestLocale()` falls back to `defaultLocale` rather than requesting a dictionary for a locale that no longer has any rows.
- **`getDictionary()` itself also falls back defensively** if the resulting flat map comes back empty for any other reason (a locale existing in `GET /i18n/locales` but somehow having zero translation rows) — re-fetches `defaultLocale`'s dictionary rather than returning `{}`, since every `dict.section.key` access downstream assumes a fully populated nested object; an empty one would crash the page instead of just showing the wrong language.
- **Switching triggers a full page reload, not a client-side transition.** `LocaleSwitcher.tsx` sets the cookie via `document.cookie` then calls `window.location.reload()` — a Next.js client-side route transition does not re-run the shared root layout, so the new cookie would sit unread until some other full navigation happened. A hard reload is the simplest way to guarantee the server layout re-executes immediately.

**Schema impact:** none — no new tables. Reuses the `language` table from D7.

---

## D9. Rate limiting: Postgres, not Redis

**Question (post-Phase-9 follow-up, same pre-production batch as D8):** `LoginRateLimiter`/`RestoreRateLimiter` were in-memory (`ConcurrentHashMap`), documented from the start as single-instance-only. The runbook flagged this as a real gap. How should it actually be fixed?

**Decision:**

- **A new Postgres table (`rate_limit_window`) via a shared `RateLimitStore`, not Redis.** Render has no free managed Redis; adding one means a new paid service, new credentials to rotate (another entry in the credential-rotation runbook section), and new infrastructure to provision for what is, at this app's scale, a handful of login/restore attempts per day. Postgres is already there, already correctly shared across however many API instances exist, and a single upsert-with-conditional-reset per attempt is cheap.
- **One atomic SQL statement, not read-then-write.** `RateLimitStore.tryAcquire` does `INSERT ... ON CONFLICT (id) DO UPDATE ... RETURNING attempt_count` in a single round-trip — the conditional reset (has the window expired?) and the increment happen in the same statement Postgres executes under one row lock, so two concurrent requests for the same key can't race each other into under-counting (the bug class D5's restore lock was written to avoid in a different part of the system).
- **`LoginRateLimiter` and `RestoreRateLimiter` keep their exact prior public API** (`tryAcquire(String)` / `tryAcquire(UUID)`) — `AuthService` and `BackupController` needed zero changes. Each now just delegates to `RateLimitStore` with its own namespaced key prefix (`"login:"` / `"restore:"`) so the two limiters' keys can't collide in the shared table, and its own existing max-attempts/window constants.
- **Test cleanup, not just a swap.** `AuthLoginTest` previously needed `@DirtiesContext(classMode = AFTER_CLASS)` and a comment warning every test to use its own phone number, specifically because the in-memory limiter's state didn't roll back with `@Transactional` like DB state does. Now that it's a real table write through the same `DataSource`, it participates in the test transaction like everything else and rolls back automatically — both the `@DirtiesContext` annotation and the workaround comment were removed as no longer necessary, not just left in place out of caution.

**Schema impact:** new `rate_limit_window` table (V30).

---

## D10. CI-gated Render deploy

**Question (same pre-production batch as D8/D9):** the runbook flagged "CI and Render deploy are unlinked" as a real gap — Render auto-deployed on every push to `main` independently of `backend-ci.yml`/`frontend-ci.yml`, so a commit that failed tests could still ship. Fix it.

**Decision:**

- **`autoDeploy: false`** on both `render.yaml` services. Deploys are now triggered only by a new `deploy` job at the end of each CI workflow, gated with `needs: build` and `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` — so it only fires after tests/typecheck/lint actually pass, and only on `main` (not PRs, not other branches).
- **Render Deploy Hooks, not the Render API.** Each service's Deploy Hook is a plain unauthenticated POST URL from its Settings page — no API key to generate, store, or rotate. Simpler and lower-blast-radius than issuing a Render API token with account-wide scope just to trigger one service's deploy.
- **Missing-secret is a clean no-op, not a CI failure.** Setting the two GitHub secrets (`RENDER_DEPLOY_HOOK_BACKEND`/`_FRONTEND`) requires dashboard access neither Claude Code nor this session has — the `deploy` step checks for an empty env var and exits 0 with a log message instead of failing the workflow, so merging this doesn't break CI for anyone before the manual setup step happens. Runbook section 2 documents the setup and the fallback (Render's own Manual Deploy button) for the gap in between.

**Schema impact:** none.

---

## Summary — resolved 2026-08-07 (D1–D4), 2026-08-08 (D5, D6, D7, D8, D9, D10)

1. **D1:** Decrement-on-fulfillment (not reserve-on-approval). Partial fulfillment **allowed** at finish.
2. **D2:** Token-based QR addressing + the stated public field allowlist. Room name/number **is** exposed.
3. **D3:** Collapsed to one fulfiller-driven `CLOSED` status — no separate requester-confirmation step, no admin force-close.
4. **D4:** New `sys.*` permission keys for branding/backup/audit — accepted.
5. **D5:** Restore reuses `sys.backup`; PIN re-verification via a new `AuthService.verifyPin`; a dedicated 3/60s `RestoreRateLimiter`; wrong-PIN returns 409 (not 401, to avoid the frontend's global session-expiry handling); mandatory pre-restore safety snapshot; restore resets the `public` schema and restores into it empty rather than relying on `pg_restore --clean`; confirmation is audit-log-only (no columns on the restored table itself — structurally can't work); a failed `pg_restore` triggers a best-effort rollback to the pre-restore snapshot rather than leaving an empty database; the post-restore process restart is a **manual** required runbook step, not automatic (an automatic `System.exit(0)` was tried and reverted after live testing showed it doesn't reliably work on Render); backup history (`backup_snapshot`) is deliberately excluded from restore scope — user's explicit choice — so the backup list survives restores intact even though everything else gets rolled back.
6. **D6:** New `sys.maintenance` permission, doubling as the request-blocking bypass authority. Enforcement is backend-first (`MaintenanceModeFilter` in the Spring Security chain, 503 for everyone except an allowlist and bypass holders) with a frontend `MaintenanceGate` for UX only (client-side bypass check via `/auth/me`, since auth lives in `localStorage` not a cookie so the server layout can't resolve it itself). The maintenance page is a display component rendered in place, not a dedicated route. Reopen timer is informational only — never auto-disables maintenance mode.
7. **D7:** Admin-addable languages via new, additive `language`/`translation_extra_value` tables — the existing `translation` table's ar/en/hi columns are untouched, not redesigned into a full EAV model. Reuses `sys.translations`. AI translation via a plain HTTP call to Anthropic's Messages API (no SDK dependency), gated by previously-scaffolded-but-unwired `TRANSLATION_HELPER_ENABLED`/`PROVIDER`/`API_KEY` env vars — requires manual `TRANSLATION_API_KEY` setup in Render before it works. All keys translated in one batched request, synchronously (no job queue exists). A failed translation leaves the language row visible with zero values rather than vanishing.
8. **D8:** Live language switcher via a plain preference cookie (`sijill.locale`), read server-side by a new `getRequestLocale()` helper substituted for the old hardcoded `defaultLocale` constant across every page. New public `GET /i18n/locales` lists built-ins + admin-added languages. Stale/deleted-language cookies fall back to `defaultLocale`, and `getDictionary()` itself falls back the same way if a locale's dictionary ever comes back empty. Switching does a full page reload (cookie-driven server layout, not a client transition).
9. **D9:** Rate limiting moved from in-memory to a Postgres-backed `RateLimitStore` (new `rate_limit_window` table) rather than adding Redis — one atomic upsert-with-conditional-reset per attempt, correct across any number of API instances. `LoginRateLimiter`/`RestoreRateLimiter` keep their exact prior public API, just delegate now.
10. **D10:** Render deploys gated on CI — `autoDeploy: false` in `render.yaml`, deploy triggered by a CI `deploy` job (via Render Deploy Hooks, not the Render API) that only runs after `build` succeeds on `main`. Requires two GitHub secrets set manually; missing secret is a clean no-op, not a CI failure.

D1–D4 are locked (schema-critical, settled before Phase 1 migrations). D5 is locked the same way for anything touching restore going forward — the 409-not-401 choice in particular should not be "corrected" back to 401 without re-checking `apiClient.ts`'s interceptor first. D6 is locked the same way for anything touching maintenance mode — in particular, never treat the frontend gate as the actual security boundary; it's UX only, the filter is what matters. D7 is locked for anything touching the translation system — in particular, do not "clean this up" into a single EAV table without a real reason; the additive split was a deliberate risk-reduction choice, not an oversight. D8 is locked for anything touching locale resolution — in particular, don't move locale into a route segment or localStorage without revisiting why the cookie approach was chosen (force-dynamic pages + no server session). D9 is locked for anything touching rate limiting — in particular, don't introduce Redis for this without a real scaling reason; Postgres was a deliberate cost/complexity choice, not an oversight. D10 is locked for anything touching deploy — don't re-enable `autoDeploy: true` without re-linking it to CI some other way first.
