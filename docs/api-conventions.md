# API Conventions

These conventions apply to every REST endpoint in the backend. Written now (Phase 1) so later phases don't improvise inconsistent shapes.

## Base

- Base path: `/api/v1`.
- JSON only, UTF-8, `Content-Type: application/json` for bodies.
- All timestamps: ISO-8601 UTC (`2026-08-07T10:15:00Z`). Convert to local display on the frontend.
- All dates (no time component, e.g. suggested start date): ISO-8601 `YYYY-MM-DD`, treated as calendar dates, not instants.
- IDs: UUID v4 strings in JSON. Human-readable numbers (employee number, asset number, item code) are separate fields, never used as the primary key/route identifier.

## Auth

- `Authorization: Bearer <jwt>` on every protected route.
- Public routes are explicitly listed in a security config allowlist (`/api/v1/auth/*`, `/api/v1/public/assets/{token}`) — default posture is "protected," not "open unless secured."

## Pagination

- List endpoints accept `page` (0-based) and `size` (default 20, max 100).
- Response shape:
```json
{
  "content": [ ... ],
  "page": 0,
  "size": 20,
  "totalElements": 137,
  "totalPages": 7
}
```

## Filtering & search

- Simple field filters as query params, e.g. `?status=PENDING&departmentId=...`.
- Free-text search via `?q=`.
- No generic query-language filter in MVP (e.g. no RSQL/OData) — add specific filter params per endpoint as needed.

## Sorting

- `?sort=fieldName,asc` or `?sort=fieldName,desc`. Single-field sort in MVP.

## Errors

Every non-2xx response uses this shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "fields": { "quantity": "must be greater than 0" },
    "traceId": "..."
  }
}
```

Standard codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409, includes stale-version conflicts), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

Login failures always return a generic `UNAUTHENTICATED` message ("invalid phone or PIN") — never reveal which part was wrong.

## Optimistic concurrency

- Editable entities carry a `version` integer field, returned on every read.
- Updates (`PUT`/`PATCH`) must include the `version` they read. If it doesn't match current, respond `409 CONFLICT` with the current server copy embedded, so the frontend can render a keep-mine/take-theirs UI.
- Action endpoints (approve/reject/postpone/finish/start/close) are not version-based — they check current `status` server-side and reject with `409 CONFLICT` if the request is no longer in the expected status (see decision-record.md D3 note on actions vs. edits).

## Request/response casing

- JSON fields: `camelCase`.
- Database columns: `snake_case` (standard JPA/Hibernate mapping).

## File uploads

- Two-step: `POST /api/v1/uploads` (multipart) returns an object key/URL after server-side type/size validation; the object key is then referenced in the entity's create/update payload. Entities never accept raw file bytes directly.
- Allowed types and max size are enforced server-side regardless of what the frontend restricts.

## Localized fields

- Entities with localized text (Category, Department, JobTitle, BrandingSettings labels, etc.) store one JSON object per field: `{ "ar": "...", "en": "...", "<third-lang>": "..." }`, never separate tables per language.

## Audit log writes

- Audit entries are written server-side inside the same transaction as the action they describe, never as a fire-and-forget side effect after commit.
