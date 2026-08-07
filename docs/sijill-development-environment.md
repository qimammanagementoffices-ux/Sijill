# Sijill — Laptop and Development Environment Checklist

## Required

- 64-bit Windows 10/11 with current security updates.
- At least 16 GB RAM; 32 GB is preferable for running the frontend, Spring Boot, PostgreSQL, containers, and an AI coding agent together.
- 20–30 GB free SSD space for tools, dependencies, Docker images, and local backups.
- Git and a GitHub account/repository.
- Node.js LTS and npm (or pnpm, chosen once for the project).
- Java JDK 21 LTS and a Java IDE/editor such as IntelliJ IDEA or VS Code.
- Docker Desktop with WSL 2 enabled, for local PostgreSQL and optional object storage.
- A browser with Arabic/RTL developer tools support; test Chrome/Edge and a mobile viewport.
- Claude Code installed and authenticated, with the project opened from the repository root.

## Local services

- PostgreSQL matching the deployment major version.
- Object-storage emulator or local bucket for images/PDFs; do not use base64 fields.
- Optional mail service emulator if password/PIN recovery or invitations are added.
- Optional translation API key only in a local `.env` file; never commit it.

## Project configuration

Create `.env.example` with names only, and keep real values in untracked local environment files. Expect configuration for:

- database URL, username, and password;
- JWT signing secret and token expiry;
- object-storage endpoint, bucket, access key, and secret;
- frontend API URL and public QR base URL;
- translation provider/key, if the helper is enabled;
- backup storage location and retention settings.

## First setup checks

1. Clone the repository and install frontend/backend dependencies.
2. Start PostgreSQL and object storage locally.
3. Run database migrations.
4. Start the API and frontend.
5. Complete first-run onboarding and create the first admin.
6. Verify Arabic RTL, English LTR, phone/digit normalization, login, uploads, QR page, print layout, and XLSX export.
7. Run unit tests, integration tests, frontend lint/type checks, and production builds.

## Useful but optional

- DBeaver or pgAdmin for inspecting PostgreSQL.
- Postman/Insomnia or an OpenAPI UI for API testing.
- GitHub Actions for CI.
- A second phone on the same network for QR and mobile testing.
- A PDF viewer and a physical/printer-preview workflow for A4 forms.

## Do not install or retain for this rebuild

- Firebase/Firestore SDKs or security rules unless the architecture is formally changed.
- Netlify Blobs or another second persistence layer.
- An in-memory-only database as the main development database.
- Any tool that stores employee PINs, hashes, national IDs, or production secrets in source control.
