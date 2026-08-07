# Sijill — Architecture Review and Decisions Required

## Main cleanup performed

- Removed repeated explanations of the old code versions and converted them into implementation rules.
- Collapsed warehouse and maintenance into one reusable inventory/request design.
- Made the shared media viewer a single required component.
- Separated MVP scope from future expansion.
- Replaced vague nested `[]` data with entity and join-table requirements.
- Consolidated security, validation, backup, audit, and concurrency requirements.
- Removed demo credentials and made empty onboarding the production default.

## Decisions required before implementation

1. **Frontend choice:** use Next.js as the baseline, or intentionally choose React/Vite. Next.js is preferred for the public QR page and cohesive routing.
2. **Third language:** select the language and obtain reviewed translations. Urdu and Hindi must not be conflated.
3. **Object storage:** choose the S3-compatible provider and retention/access policy. Do not rely on ephemeral local disk for production files.
4. **Public QR privacy:** define the exact fields visible without login and whether the QR URL should use an unguessable token.
5. **Request workflow:** decide who may close a request and whether `DONE` and `CLOSED/RECEIVED` are distinct actions for every request type.
6. **Departments:** decide whether an employee may belong to multiple departments and how the requester’s department is selected when submitting.
7. **Stock semantics:** decide whether request approval reserves/decrements stock, or whether only invoice receipt increments stock and fulfillment decrements it. The source specifies restocking but not consumption accounting.
8. **Depreciation:** decide whether the optional fields are informational only for MVP or require a formal accounting method and period job.
9. **Backup restore format:** choose database-native backups, application export/import, or both. Application snapshots must preserve relationships and file references.
10. **Translation helper:** choose provider, allowed data sent externally, quota/cost controls, and whether the feature is disabled by default.
11. **Deployment topology:** decide whether frontend and API use separate Render services and where object storage is hosted.
12. **First-admin recovery:** define the operational recovery path if the only admin is deactivated or loses the PIN.

## Important gaps added to the implementation plan

- request action history rather than only one approver field;
- upload validation, safe access, retention, and file-size limits;
- login/restore rate limiting;
- database uniqueness and transaction-safe human-readable numbers;
- public QR privacy boundary;
- stock consumption/reservation semantics;
- admin recovery procedure;
- automated tests and a deployment/backup runbook.

## Minimum acceptance tests

- Two simultaneous asset creations cannot receive the same asset number.
- A stale edit returns a conflict and does not silently overwrite the newer version.
- Arabic-Indic phone/PIN digits authenticate exactly like Western digits.
- Login, PIN change, and restore all verify the BCrypt hash; no plaintext PIN is persisted or logged.
- Posting one invoice updates stock and purchase pricing once, even if a client retries.
- A referenced category and occupied room cannot be deleted.
- Every asset room change creates a location-history record.
- QR scanning shows only the approved public asset projection.
- The same lightbox implementation works for item, room, asset, invoice, acquisition, and request media.
- Arabic reports print RTL on A4 with branding and signature blocks where required.
- Production startup with no seed data leads to onboarding, not demo accounts.
