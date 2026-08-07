# Sijill — Implementation-Ready Master Specification

## 1. Product goal

Sijill is an Arabic-first internal web application for one school. It manages:

- warehouse consumables, purchases, stock, costs, and staff need requests;
- maintenance parts, purchases, costs, and maintenance/fault requests;
- rooms, QR-tagged fixed assets, acquisitions, depreciation, transfers, and asset requests;
- employees, organizational structure, authentication, and fine-grained permissions.

Build a clean multi-user application that works for a prototype but uses a real relational model so it can scale later. Do not reproduce the previous single-file SPA, JSON application state, Firebase/Firestore remnants, or base64 images.

## 2. Required technology decisions

Use the following baseline unless a decision is recorded before implementation:

- Frontend: Next.js with TypeScript, component-based UI, responsive layout.
- Backend: Spring Boot with Java, Spring Security, Spring Data JPA/Hibernate.
- API: REST/JSON.
- Database: PostgreSQL.
- Authentication: phone number + numeric PIN; BCrypt hash; JWT access token.
- File storage: S3-compatible object storage; store only object keys/URLs in PostgreSQL.
- Deployment: GitHub plus Render services for frontend, API, PostgreSQL, and object storage.
- Exports: XLSX and print-optimized HTML/PDF.

Use server-side authorization on every protected endpoint. Frontend visibility is not security.

## 3. Product boundaries

### MVP

Authentication, onboarding, employees and permissions, warehouse, maintenance, assets and rooms, QR public asset view, requests and workflows, uploads, audit trail, Arabic/English UI, responsive design, exports, printing, branding, backups, and optimistic concurrency.

### Explicitly out of scope unless approved

Multi-school tenancy, public asset editing, payroll/accounting integration, procurement approval outside Sijill, native mobile apps, advanced depreciation accounting, and real-time WebSockets. Start with polling or normal refresh plus conflict-safe writes.

## 4. Users and authorization

Employees may have multiple departments and individually assigned permissions. Implement a permission catalogue and an admin checkbox grid. The backend must enforce these exact keys:

`emp.view`, `emp.manage`, `emp.structure`

`wh.view`, `wh.qty`, `wh.items`, `wh.invoices`, `wh.invoices.edit`, `wh.costs`, `wh.request`, `wh.act.approve`, `wh.act.reject`, `wh.act.postpone`, `wh.act.finish`

`mt.view`, `mt.request`, `mt.act.approve`, `mt.act.reject`, `mt.act.postpone`, `mt.act.start`, `mt.act.finish`

`as.view`, `as.manage`, `as.request`, `as.act.approve`, `as.act.reject`, `as.act.postpone`, `as.act.finish`

Add audit entries for permission changes, request actions, asset transfers, and backup restores. An administrator with `emp.manage` may use a clearly marked View As mode for permission testing; it must never bypass backend authorization.

## 5. Core data model

Use separate tables/entities with IDs, foreign keys, timestamps, and `version` fields for editable records. Never embed the complete dataset in one JSON document.

- **Employee:** employee number, name, phone, BCrypt PIN hash, email, national ID, joined date, photo, active/inactive status, job title, departments, permissions.
- **Department / JobTitle:** localized names; admin CRUD.
- **Category:** reusable localized reference entity for warehouse items, maintenance parts, assets, and room groups. Keep domain ownership/type so unrelated domains cannot reference it.
- **InventoryItem:** code, localized name, category, on-hand quantity, unit, optional weight, date added, minimum quantity, last purchase price, tax, tax-inclusive price, images, document, active status.
- **PurchaseInvoice:** number, date, vendor, tax rate, line items, attachments, totals, domain (`warehouse` or `maintenance`).
- **Room:** number, localized name, group, responsible employee, photos.
- **Asset:** unique asset number, localized name, category, room, status (`active`, `maintenance`, `retired`), purchase date, notes, photos, QR identifier.
- **AssetAcquisition:** invoice/contract number, date, vendor, tax-inclusive amount, linked assets, attachment, optional depreciation fields.
- **NeedRequest:** requester, department, category, item lines, notes, attachments, status, action history, approval metadata, suggested start date.
- **MaintenanceRequest:** requester, department, fault type, location, priority, description, attachments, status, action history, suggested start date.
- **AssetRequest:** requester, department, purpose (`purchase_new`, `maintain_existing`, `transfer`), requested category/quantity or linked assets, destination room when transferring, description, status, action history.
- **BrandingSettings:** logo, platform name, school name, school label, subtitle, colors.
- **BackupSnapshot:** timestamp, storage location, retention metadata, creator/type.
- **AuditLog:** actor, action, entity type/id, before/after summary where appropriate, timestamp.

Use join tables for employee-department, employee-permission, invoice-line, asset-acquisition, asset-request-assets, and asset location history. Use request action history rather than only `approvedByEmployeeId` so the full trail is retained.

## 6. Status and business rules

Shared request statuses: `PENDING`, `APPROVED`, `REJECTED`, `POSTPONED`, `IN_PROGRESS`, `DONE`, `CLOSED`. Display Arabic labels and translated English/third-language labels from the i18n dictionary.

- Need and asset requests may be approved, rejected, postponed, finished, and closed/received according to their workflow.
- Maintenance requests additionally require `START` to enter `IN_PROGRESS`.
- Suggested start date is the day after submission/approval; if that date is Friday, use Saturday. Store dates as calendar dates and calculate with local date components.
- Saving an invoice is one transaction: validate lines, increment stock, and update last-purchase pricing. Prevent duplicate invoice submission.
- Low stock means `quantity <= minQuantity`.
- Do not delete employees with historical records; deactivate them.
- Do not delete a referenced category or room group. Do not delete a room containing assets. Return a clear validation error.
- Any room change creates a location-history row with old room, new room, actor, and timestamp.
- Asset numbers and item codes require database unique constraints and transaction-safe generation. Prefer UUID primary keys plus human-readable unique numbers.
- Every update uses optimistic concurrency. On stale `version`, return a conflict response and show a keep-mine/take-theirs resolution UI.

## 7. Required user-facing features

### Authentication and onboarding

Phone + numeric PIN login, logout, change-PIN flow, admin-set PIN, first-run empty-state onboarding, first-admin creation, and branding setup. Normalize Saudi phone formats to `05XXXXXXXX` and convert Arabic-Indic/Persian digits to Western digits on both client and server. PINs are never stored or logged in plaintext.

### Employees and structure

Searchable directory; add, edit, deactivate; employee photo; departments and job titles; permission assignment grid; optional translation helper with admin review and warning about machine translation.

### Inventory and requests

Implement one reusable inventory module parameterized by domain (`warehouse`/`maintenance`) rather than two copied code paths. It supports searchable items, categories, image/document uploads, low-stock warnings, invoices, stock restocking, costs, XLSX/print exports, and attachments.

Warehouse need requests contain department, category, item/quantity lines, notes, and attachments. Maintenance requests contain fault type, location, priority, description, and attachments. Maintenance finish flow may record parts used and should suggest the matching parts category from the fault type.

### Assets

Room CRUD with photos and filters; asset CRUD with category, room, status, photos, QR generation/download/label printing; acquisitions and attachments; optional depreciation; transfer workflow; location history; public read-only QR asset page; employee-assets custody report with A4 print layout, generated date, total count, and explicit signature block.

The public QR page must expose only approved public asset fields. Decide and document whether photos, room names, and acquisition details are public before implementation.

### Shared media viewer

Build exactly one reusable lightbox. It supports full-size image viewing, caption/filename, close button, click-outside close, and Escape close. PDFs and other documents display as file chips and open in a new tab. Use it in management screens and item/asset selection screens inside requests.

### Reports, branding, backups, and i18n

Provide XLSX exports for inventory, invoices, costs, rooms, assets, and requests. Provide print-ready A4 HTML/PDF reports with branding, filters, and generated timestamp. Provide admin branding/theme settings with presets, custom colors, live preview, and reset.

Run daily dataset backups retained for 30 days, prune older snapshots, list them in an admin panel, require fresh PIN re-authentication before restore, and snapshot the current state before restore. Use provider-managed PostgreSQL backups as an additional recovery layer.

Arabic is the default RTL language; English is LTR. Select one genuinely translated third language before coding; do not label Hindi/Devanagari as Urdu. All UI and report text must use one translation dictionary, including login, validation, exports, and print views. Use CSS logical properties and mirror icons/layout correctly.

## 8. Security and reliability requirements

- HTTPS in every deployed environment.
- Secrets only in environment variables or a secret manager.
- Server-side validation, enum validation, authorization, upload size/type limits, and safe filenames.
- Restrict public QR endpoints to an allowlisted, non-sensitive projection.
- Rate-limit login and restore attempts; provide generic login failure messages.
- Do not put PINs, hashes, API keys, or unrestricted admin data in frontend bundles.
- Use transactions for invoice posting, request actions, asset transfers, backup restore, and number allocation.
- Keep structured application logs without personal data or credentials.
- Add automated tests for auth, permissions, status transitions, restocking, deletion guards, date calculation, number uniqueness, upload validation, and stale-version conflicts.

## 9. Suggested repository structure

```text
/frontend        Next.js + TypeScript UI
/backend         Spring Boot API
/docs            decisions, API notes, deployment runbook
/infra            Render/deployment configuration and backup notes
/scripts          local setup and optional demo seed
docker-compose.yml
README.md
```

Keep frontend modules aligned with backend domains. Shared UI components include the lightbox, attachment picker, data table, filters, status badge, permission guard, print layout, and localized form controls.

## 10. Build sequence and definition of done

1. Repository, local services, database migrations, API conventions, and empty-state onboarding.
2. Authentication, employee/structure entities, permissions, audit log, and tests.
3. Reusable inventory module, warehouse configuration, invoices, costs, and need requests.
4. Maintenance configuration, parts, fault workflow, and parts-used flow.
5. Rooms, assets, QR view, acquisitions, transfers, requests, and custody report.
6. Shared media viewer, uploads, exports, printing, branding, i18n, and backups.
7. Concurrency/security/load testing and deployment runbook.

Each phase is complete only when its API, UI, authorization, validation, migrations, tests, empty state, responsive behavior, and print/export behavior are implemented. Do not seed demo records in production. Provide an explicit local-only seed command/flag if demo data is needed.

## 11. Claude Code operating instructions

Before coding, create a decision record for the unresolved choices in the companion review document. Work in small phases. For each phase: inspect existing files, propose the change, implement, run tests/lint/build, and summarize changed files and remaining risks. Never invent credentials, production URLs, translations, or sensitive sample data. Do not add a second persistence layer or duplicate shared components.
