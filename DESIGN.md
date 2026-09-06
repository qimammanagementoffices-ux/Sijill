---
version: alpha
name: "Sijill Design System"
description: "Institutional, paper-and-ink visual vocabulary for governmental record-keeping, warehouse inventory, and maintenance operations."
colors:
  primary: "#1b2a4a"
  ink: "#1b2a4a"
  ink-light: "#2e4272"
  ink-soft: "#3e5482"
  paper: "#f7f3ea"
  paper-dim: "#efe7d6"
  card: "#ffffff"
  sage: "#3e7a57"
  sage-soft: "#e3efe4"
  forest: "#3e7a57"
  seal: "#8b2635"
  seal-soft: "#f4e4e3"
  amber: "#b4791e"
  amber-soft: "#f7ead3"
  slate: "#5b6472"
  slate-soft: "#eae7de"
  line: "#ded4bc"
  line-soft: "#eae2cc"
typography:
  sans:
    fontFamily: '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  mono:
    fontFamily: '"IBM Plex Mono", monospace'
rounded:
  DEFAULT: "14px"
  sm: "8px"
  md: "10px"
  lg: "14px"
spacing:
  section-gap: "24px"
  page-max: "1280px"
components:
  button:
    backgroundColor: colors.primary
    textColor: colors.card
    rounded: rounded.DEFAULT
  card:
    backgroundColor: colors.card
    textColor: colors.ink
    rounded: rounded.DEFAULT
  dialog:
    backgroundColor: colors.card
    textColor: colors.ink
    rounded: rounded.DEFAULT
  table:
    backgroundColor: colors.card
    textColor: colors.ink
  input:
    backgroundColor: colors.card
    textColor: colors.ink
    rounded: rounded.DEFAULT
---

# Sijill Design System & Visual Architecture

## Overview

### Creative North Star
Sijill is designed with an organic, institutional visual vocabulary that conveys warmth, authority, and reliability. The interface uses paper and parchment tones balanced with deep navy ink and sage green accents, reflecting governmental and academic record-keeping in Saudi Arabia.

### Product Context and Register
- **Audience and Primary Job:** Warehouse operators, maintenance supervisors, and administrative personnel recording purchases, tracking assets, and maintaining stock ledgers.
- **Target Market(s):** Saudi Arabian institutional operations, governmental logistics offices, and public utility workspaces.
- **Locale(s) and Language Policy:** Trilingual support (Arabic default, English, and Hindi). Every user-facing string is managed through localized dictionaries (`warehouseInvoices`, `common`, `errors`). Arabic is primary; numerical codes and serials maintain strict LTR bidi isolation.
- **Usage Scene:** Desktop and tablet environments with high data-entry density, transactional ledger updates, and immutable posting confirmations.
- **Register:** Institutional product. Utility, legibility, and tabular precision take precedence over decorative consumer aesthetics.
- **Memorable Signature:** Stacked parchment accounting ledger (`.invoice-ledger`) docked alongside data tables with prominent sage green tabular totals.
- **Restraint:** Quiet, low-noise chrome. No gratuitous floating panels or non-standard interactive widgets.
- **Anti-references:** Flashy SaaS gradients, ungrounded dark mode neon palettes, and non-accessible custom combobox reinventing browser accessibility.
- **Token Ownership / Runtime Mapping:** Grounded in `:root` CSS variables in `frontend/src/app/globals.css`.

## Colors
All colors are grounded in `:root` CSS variables defined in `frontend/src/app/globals.css`:
- **Primary Ink:** `--ink` (`#1b2a4a`), `--ink-light` (`#2e4272`), `--ink-soft` (`#3e5482`). High-emphasis typography and primary branding.
- **Surfaces & Paper:** `--paper` (`#f7f3ea`), `--paper-dim` (`#efe7d6`), `--card` (`#ffffff`). Parchment backgrounds and clean white cards.
- **Accents & Status:**
  - `--sage` (`#3e7a57`): Authoritative green for positive totals, primary buttons, and focus halos.
  - `--sage-soft` (`#e3efe4`): Background for confirmed chips.
  - `--seal` (`#8b2635`): Crimson accent for delete/destructive warnings.
  - `--seal-soft` (`#f4e4e3`): Error background alerts.
  - `--amber` (`#b4791e`): Pending states and warning chips.
  - `--slate` (`#5b6472`): Muted labels and secondary table column headers.
- **Borders & Dividers:** `--line` (`#ded4bc`) for primary containers; `--line-soft` (`#eae2cc`) for internal row dividers.

## Typography
Multi-script typography supporting Arabic, English, and Hindi natively:
- **Arabic (Primary / Default):** `"Cairo", "Inter", sans-serif` — Elegant Arabic geometric sans with clear numeral readability.
- **English:** `"Inter", sans-serif` (activated via `body.lang-en`).
- **Hindi:** `"Noto Sans Devanagari", "Cairo", sans-serif` (activated via `body.lang-hi`).
- **Monospace & Figures:** `"IBM Plex Mono", monospace` (`.mono`) — Strictly `direction: ltr; unicode-bidi: plaintext;` for dates, serial numbers, codes, and numerical ledger values.
- **Tabular Figures:** `font-variant-numeric: tabular-nums` used on all monetary columns, tables, and accounting ledgers to guarantee strict vertical decimal alignment.

## Layout & Geometry
- **Responsive Layout:** CSS Grid and Flexbox using CSS logical properties (`margin-inline-start`, `padding-inline`, `border-inline`) for effortless RTL/LTR adaptation.
- **Containers:** Panels and cards utilize `var(--radius)` (14px) with subtle institutional elevation (`var(--shadow)`).
- **Accounting Ledger (`.invoice-ledger`):** Docked via `margin-inline-start: auto` with `--paper` surface and `--line` border. Provides stable layout by permanently rendering subtotal, tax, gross before discount, discount row, and final total.

## Control Ownership & Intentional Native Controls
- **Intentional Native Ownership:** Form controls (`<input type="number">`, `<input type="date">`, `<input type="text">`, and `<select>`) intentionally retain native browser ownership rather than custom-styled JavaScript widgets. This guarantees dependable OS-level virtual keyboard triggers, native date pickers, native scroll-into-view geometry, and rock-solid screen reader integration across diverse enterprise hardware.
- **Validation Contract:** Forms specify `noValidate` and manage actionable, localized error feedback through `role="alert"`, `aria-invalid`, and `aria-describedby` linking directly to error summaries. Form inputs remain preserved upon server or validation error to eliminate data-entry frustration.
- **Keyboard-Safe Dialogs:** Consequential actions (such as posting an immutable purchase invoice) utilize semantic HTML `<dialog>` elements managed with `.showModal()` and `.close()`. Native Escape key behavior is preserved (blocked only when actively submitting), initial focus lands on the least-destructive action (Cancel), and focus returns to the initiating trigger upon closing. Zero browser `window.confirm` or `window.alert` popups are permitted in transactional workflows.
