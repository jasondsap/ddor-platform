# DDOR Modernization Platform

## Project Overview

This is the **DDOR Modernization Platform**, built for **Fletcher Group, Inc. (FGI)** under contract with **MADE180** (Jason Dickerson, sole developer). The platform serves Kentucky's **Behavioral Health Conditional Dismissal Program (BHCDP)**, a court-ordered SUD/MH treatment diversion program established under SB90.

It replaces FGI's legacy DDOR system and consolidates Airtable-based operational workflows into a single Next.js application with full clinical and administrative tooling, dashboards, and analytics.

### Stakeholders
- **Dave Johnson** — FGI CEO; client/billing contact
- **Erin Henle** — FGI PM; primary operational user; key pain point was provider name normalization (now solved by the providers→facilities hierarchy)
- **Jason Dickerson (MADE180)** — sole developer and 5-year maintainer

### Contract & deadlines
- **$50,000 fixed fee**, two phases
- **Phase 1 (Operational Launch): $38,000 — hard deadline July 1, 2026.** This is statutory: the FGI contract with the state expires on this date. Phase 1 must include all mission-critical functions.
- **Phase 2 (Full Platform Completion): $12,000 — through mid-August 2026.** Dashboards, advanced analytics, remaining automations.

**The July 1 deadline is non-negotiable.** When in doubt about scope, default to deferring to Phase 2.

---

## Critical Operating Principles

### 1. Code-as-config is intentional
Most things that would normally be admin-UI-editable (role/permissions, report cadence offsets, status workflows, dropdown lists, provider regex patterns) are hardcoded **on purpose**. Rationale: solo developer, 5-year ownership, July 1 deadline, statutory constraints that rarely change. Admin UI for these is wasted complexity.

**Do not** suggest building admin UI for hardcoded values without first asking. Treat code-as-config as a load-bearing architectural decision.

### 2. The one exception: email templates
Email templates and lookup/dropdown reference data should eventually be database-driven so Erin can edit wording without a code deployment. This is **Phase 2 work** — flagged, not yet built. Do not start this before Phase 1 is shipped.

### 3. Providers → facilities hierarchy
The providers→facilities structural hierarchy is how we solved Erin's manual provider name normalization problem (variants like "MCCC", "MCCC Pike", "MCCC Radiance" all rolling up to one provider). Do not flatten this or introduce parallel free-text provider fields.

### 4. Assessment schedule (per Erin, finalized)
- **WAI-SR: dropped entirely.** Do not reintroduce.
- **BARC-10 (SUD):** administered at screening, 90-day, and Final Report only
- **PHQ-9/GAD-7 (MH):** administered at screening, 90-day, and Final Report only
- Delivery: participant self-service via texted/emailed tokenized link (the `assessment_invitations` pattern)

### 5. Report cadence (statutory, hardcoded)
Milestone offsets from treatment start date: **14, 42, 90, 180, 270, 360 days**. Enforced in code. Do not change without confirming with FGI first — these are program requirements.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Neon PostgreSQL 17 (project `winter-snow-07106494`, db `neondb`, branch `br-snowy-mouse-anql2h77`)
- **Auth:** AWS Cognito via NextAuth (custom `DDORSession` shape carries role/facility/provider context — see `lib/auth.ts`)
- **Hosting:** AWS Amplify (`amplify.yml` builds `.next` standalone)
- **File storage:** AWS S3 (`@aws-sdk/client-s3` + presigner)
- **Email:** Resend (`resend` SDK + `@react-email/components` for templates in `emails/`)
- **SMS:** Twilio (two-way — inbound and delivery-status webhooks at `/api/webhooks/twilio/inbound` and `/status`)
- **AI:** Anthropic SDK (`@anthropic-ai/sdk`) powering DoriChat at `/api/dori`
- **Charts/UI:** Tremor, Recharts, D3, Tailwind CSS, lucide-react
- **Key libraries in app:**
  - `exceljs` — quarterly DBH report xlsx export (Erin's 12-sheet workbook format)
  - `jspdf` + `lib/generateReportPDF.ts` — report PDFs
  - `@aws-sdk/client-polly` — text-to-speech (DoriChat voice)

### Host-machine tooling (used in workspace scripts, not in this repo)
These are referenced by ad-hoc Python utilities elsewhere on the developer machine, **not installed in this Node app**:
- `python-docx` — invoice generation
- `pytesseract` — PDF OCR (use `dpi=150`, NOT `dpi=200` which times out)
- `msoffcrypto-tool` — for encrypted xlsx files

---

## Repo Snapshot

- **Repo:** `github.com/jasondsap/ddor-platform.git`
- **Working directory (Windows):** `C:\Users\Unity\ddor-platform`
- **Size:** ~37 API routes, ~37 page routes (refresh counts via `find app -name route.ts` / `page.tsx` rather than trusting this line)

### What's built
- Full CRUD for: clients, referrals, reports, invoices, providers, facilities, notes
- Role-scoped access (`requireAuth` / `requireFacilityAccess` / `requireClientAccess` in `lib/auth.ts`)
- DoriChat (AI assistant — globally mounted in `app/layout.tsx`, route at `/api/dori`)
- KentuckyMap (county/provider geographic view)
- Analytics with county, provider, and filtered views
- Admin panel (users, contracts, barrier relief)
- Messaging (channels + messages + read-status)
- Court reporting
- Assessment invitations with tokenized lookup (`/api/assessment-invitations/lookup/[token]`)
- Quarterly DBH report (API + dashboard + 12-sheet xlsx export at `/api/analytics/quarterly-report` and `/analytics/quarterly-report`)
- Consent workflow: send via email/SMS, tokenized response page (`/consent/[token]`)
- Two-way Twilio SMS (inbound message ingestion + delivery status callbacks)
- Initiation notifications, KYAE referrals, status changes, barrier relief, demographic intake, GAIN-SS

---

## Project Structure

```
ddor-platform/
├── app/                          # Next.js App Router — pages and API routes co-located
│   ├── layout.tsx                # Root layout; mounts SessionProvider + global DoriChat
│   ├── page.tsx                  # Home/dashboard
│   ├── globals.css
│   ├── admin/                    # Admin panel (users, contracts, barrier-relief)
│   ├── analytics/                # Analytics dashboards (county, provider, quarterly-report)
│   ├── assessments/              # BARC-10 + PHQ9/GAD7 self-service flows
│   ├── auth/signin/              # NextAuth sign-in page
│   ├── clients/                  # Client list, new, detail, edit
│   ├── consent/[token]/          # Public tokenized consent response page
│   ├── court/                    # Court reporting view
│   ├── demographic/              # Demographic intake form
│   ├── facilities/               # Facility list + detail
│   ├── gain-ss/                  # GAIN-SS form
│   ├── initiation/               # Initiation notification form
│   ├── invoices/                 # Invoice list, new, detail
│   ├── kyae-referral/            # KYAE referral form
│   ├── messages/                 # Channel-based messaging UI
│   ├── notes/                    # Client notes
│   ├── providers/                # Provider list + detail
│   ├── referrals/                # Referral list, new, detail
│   ├── report-tracking/          # Report due-date tracker
│   ├── reports/                  # Report new + detail (no list page — use report-tracking)
│   ├── status-change/            # Status change form
│   └── api/                      # Route handlers (route.ts per resource)
│       ├── admin/users/
│       ├── analytics/            # + filtered/ + quarterly-report/
│       ├── assessment-invitations/  # + lookup/[token]/
│       ├── auth/[...nextauth]/   # NextAuth catch-all
│       ├── barrier-relief/
│       ├── channels/             # + [id]/messages/
│       ├── clients/              # + [id]/consent/{,send}
│       ├── consent/[token]/respond/
│       ├── court/
│       ├── documents/
│       ├── dori/                 # DoriChat backend (Anthropic SDK)
│       ├── facilities/
│       ├── initiation-notifications/
│       ├── invoices/
│       ├── notes/
│       ├── notifications/
│       ├── providers/
│       ├── questionnaires/[type]/
│       ├── referrals/
│       ├── report-tracking/
│       ├── reports/
│       └── webhooks/twilio/{inbound,status}/
├── components/                   # Small set — most UI lives in page.tsx files
│   ├── ConsentSection.tsx
│   ├── DoriChat.tsx
│   ├── FilteredDashboard.tsx
│   ├── Header.tsx
│   ├── KentuckyMap.tsx
│   └── SessionProvider.tsx
├── lib/
│   ├── auth.ts                   # requireAuth, requireFacilityAccess, requireClientAccess, isAdmin
│   ├── auth-options.ts           # NextAuth config (Cognito provider, JWT/session callbacks)
│   ├── db.ts                     # Neon sql proxy (lazy-init for Amplify SSR) + query helpers + audit log
│   ├── email.ts
│   ├── email/resend.ts           # Resend client wrapper
│   ├── sms/twilio.ts             # Twilio client wrapper
│   ├── consent/                  # sender.ts, responder.ts, templates.ts, types.ts
│   ├── generateReportPDF.ts      # jspdf-based report rendering
│   └── report-fields.ts          # Report attribute schema definitions
├── emails/
│   └── ConsentRequestEmail.tsx   # React Email template
├── types/
│   └── index.ts                  # Central type registry (Provider, Facility, User, Referral, …)
├── scripts/                      # One-shot migration utilities (do not re-run; kept for debugging)
│   ├── migrate-ddor-data.mjs
│   ├── migrate-seven-counties.mjs
│   ├── fix-facility-assignments.mjs
│   ├── DDOR_Client_Repor_Unlocked.csv
│   └── ddor_airtable_export.json
├── public/                       # Static assets (favicons, manifest)
├── docs/                         # Gitignored reference docs (see Reference Documents section)
├── ddor_schema.sql               # Schema snapshot from Neon (regenerate via `npm run db:dump`)
├── amplify.yml                   # AWS Amplify build config (frontend phase only)
├── next.config.js                # standalone output; forwards env vars for Amplify SSR Lambda
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

### Patterns to follow when editing

- **API routes** import `requireAuth` / `requireFacilityAccess` / `requireClientAccess` from `@/lib/auth` first, then run queries via the `sql` tagged-template or `query()` helper from `@/lib/db`. Role scoping (admin vs navigator vs provider staff) is inlined per route.
- **`lib/db.ts` uses a Proxy for lazy Neon init** — needed because Amplify SSR cold-starts execute imports before env vars are guaranteed to be present.
- **`next.config.js` re-exports server env vars via `env:`** — Amplify's SSR Lambda doesn't propagate them otherwise. Every new server-side env var needs to be added there.
- **No `middleware.ts`** — auth is enforced inside each route handler, not via Next middleware.
- **No test framework** — verification is manual against the dev server. When you make UI changes, exercise the feature in a browser before declaring done.

---

## Database State (Neon)

Current snapshot — verify with live queries before relying on counts:
- **69 providers** (Emerald Therapy Center recently added)
- **195 active facilities**
- **80 counties**
- **8 questionnaire_definitions**, **97 questions**, **358 answer_options**
- **3 admin users**
- **1,098 clients**, **8,653 questionnaire submissions**, **1,745 reports**, **38,071 report_attributes**, **1,098 report_tracking rows**
- **Plus 76 Seven Counties clients + 73 referrals** (operational tracking only — Seven Counties never used DDOR clinically)

### Known schema quirks
- `report_tracking` has **11 NOT NULL status columns**, including `kyae_referral_status`, `barc10_status`, `phq9_gad7_status`, `final_provider_status`
- Provider matching engine uses **60+ regex patterns** + staff name fallback → 95.6% match rate from DDOR CSV migration
- 48 unmatched patients have null facility (mostly recent referrals with no facility text in source)

### Active database issues (fix before they propagate)
- **Provider duplicates in Neon — needs deduplication:**
  - Lifeskills ×2
  - Seven Counties ×2
  - Pennyroyal ×2
  - Comprehend + Comprehend Inc.
  - ARC ×2
- **Airtable PAT needs regeneration** (prior one was exposed in chat history)

---

## Local Development (Windows)

### Critical: env var quoting in CMD
The Neon connection string contains `&channel_binding=require`. In Windows CMD, the `&` will break the command unless the entire assignment is quoted:

```cmd
set "DATABASE_URL=postgresql://...&channel_binding=require"
```

The quotes go around the **entire `KEY=VALUE`**, not just the value. This trips people up constantly.

In PowerShell, this issue doesn't exist:
```powershell
$env:DATABASE_URL = "postgresql://...&channel_binding=require"
```

### Always run scripts from project root
Node scripts need access to `node_modules`. Run from `C:\Users\Unity\ddor-platform`, not from a `scripts/` subdirectory.

### File handling gotchas
- **DDOR CSV export:** must use `encoding='cp1252'` (not UTF-8)
- **Image-based PDFs:** OCR at `dpi=150`. `dpi=200` causes timeouts.
- **Encrypted xlsx:** requires `msoffcrypto-tool`
- **`DDOR_workflow.docx`:** despite the extension, is plain ASCII

---

## Data Migrations (Complete — Reference Only)

These are done. Don't re-run them. They're documented here for context if you're debugging downstream issues.

- **DDOR CSV migration:** 1,098 clients, 8,653 submissions, 1,745 reports → Neon. EAV format, cp1252 encoding.
- **Seven Counties Airtable migration:** 76 clients, 73 referrals, skeleton reports → Neon.

### Airtable export available
- `ddor_airtable_export.json` (25MB) — full Airtable snapshot, extracted via `extract_airtable.js`
- **SB90 MockUp:** 22 tables, 611 records (clinical data model)
- **SB90 Base:** 19 tables, 8,140 records (operational system)
- **Reports table** (1,733 records) is the operational command center with computed due-date formulas

---

## Quarterly DBH Report

This is one of the highest-value features — it eliminates Erin's manual Airtable → Excel work each quarter.

- **API endpoint:** `/api/analytics/quarterly-report` (returns JSON or xlsx via ExcelJS)
- **Dashboard:** `/analytics/quarterly-report`
- **Reference format:** `docs/reference/2026_DBH_Q1.xlsx` — defines the exact 12-sheet structure DBH expects
- **12 sheets:** Totals, Treatment, Discharge, Length of Stay, Discharge-MAT, MH, SUD, MAT, Training, Education, Completions, Final Reports

When modifying this export, **always cross-check against the reference xlsx**. DBH expects this exact structure; deviating breaks Erin's submission.

Requires `npm install exceljs`.

---

## Reference Documents

Reference materials live in `docs/` (gitignored). Do **not** load these into context unless the current task requires them — they're large and burn tokens.

### Currently in `docs/`
| File | When to consult |
|------|-----------------|
| `docs/DDOR workflow.docx` | Overall workflow narrative |
| `docs/Screen Referral Workflow.docx` | Statewide assessor → case navigator handoff |
| `docs/Statewide Assessor Referral to Case Navigator v1.2.pdf` | Referral process spec |
| `docs/State Assessor DDOR Training.pptx` | State assessor training deck |
| `docs/Case Navigators -DDOR Platform Training.pptx` | Case navigator training |
| `docs/Treatment Providers-DATA COLLECTION PLATFORM TRAINING 10.2.24.pptx` | Provider-facing UX expectations from training |
| `docs/Informed Consent (Cell phone text or email).pdf` | Consent template/wording for SMS+email flow |
| `docs/ROI in DDOR (1).pdf` | Release-of-information workflow |

### Canonical references NOT in `docs/` (historically expected here, but absent)
The SOP manual, FY25 provider contract, BARC-10 / PHQ-9-GAD-7 scoring sheets, 2026 DBH Q1 reference xlsx, airtable schema analysis, automation screenshots, and legacy DDOR UI screenshots are referenced in conversations but **do not currently live in `docs/`**. If you need them, ask — they may be elsewhere on the dev machine.

To pull a document into context for a specific task, use `@docs/<filename>`.

---

## Common Commands

```powershell
# Dev server
npm run dev

# Production build
npm run build && npm start

# Lint
npm run lint

# Schema dump from Neon → ddor_schema.sql (requires pg_dump on PATH; uses %DATABASE_URL%)
$env:DATABASE_URL = "postgresql://..."
npm run db:dump

# Apply schema (manual — db:push is just a reminder echo)
# Paste ddor_schema.sql contents into the Neon SQL Editor

# Data migration scripts (one-shot, already run — kept for debugging)
$env:DATABASE_URL = "postgresql://..."
node scripts/migrate-ddor-data.mjs [--dry-run] [--verbose]
node scripts/migrate-seven-counties.mjs [--dry-run]
node scripts/fix-facility-assignments.mjs [--dry-run]
```

### NPM scripts (from `package.json`)
| Script | What it does |
|--------|--------------|
| `npm run dev` | `next dev` — local dev server |
| `npm run build` | `next build` — production build (used by Amplify) |
| `npm start` | `next start` — run the built app |
| `npm run lint` | `next lint` |
| `npm run db:push` | Reminder echo — schema is applied manually via Neon SQL Editor |
| `npm run db:dump` | `pg_dump --schema-only --no-owner --no-privileges -f ddor_schema.sql %DATABASE_URL%` |

`pg_dump` lives at `C:\Users\Unity\pgsql\bin\pg_dump.exe` (PostgreSQL 17.6 portable binaries, already on user PATH).

---

## Invoicing Conventions

- Invoice numbering: `MADE-2026-XXX` series
- Formal document process modeled on prior MADE180 templates
- Generated via `python-docx`
- Phase 1 ($38K) and Phase 2 ($12K) are separate invoices

---

## Out of Scope for Phase 1 (Defer to Phase 2)

Do not start these before July 1 unless explicitly directed:

- Email template database migration (move from code to Neon)
- Lookup/dropdown reference data → Neon
- Advanced analytics dashboards
- Remaining Airtable automation rebuilds beyond what's mission-critical
- Admin UI for hardcoded config (and most of this stays code-as-config even in Phase 2)

---

## What "Done" Looks Like for Phase 1

The platform must, by July 1:
1. Accept all clinical data entry that DDOR currently handles
2. Generate all required reports (14-day, 42/90/180/270/360-day progress, Final, Status Change, Initiation Notification, KYAE Referral)
3. Compute and surface report due dates
4. Send overdue report notifications
5. Produce the quarterly DBH report in the exact 12-sheet format
6. Support assessment invitation flow (BARC-10, PHQ-9/GAD-7 via tokenized link)
7. Provide working admin panel for FGI staff
8. Replace the operational tracking Erin currently does manually in Airtable

Everything beyond this list is Phase 2.

---

## Notes for Future-Me

- The Airtable views are not separate data — they're filtered/sorted views of the same records. Don't model views as tables.
- Erin's pain points drive prioritization. When a new feature request comes in, ask "does this make Erin's quarterly report easier?" If no, it's probably Phase 2.
- DoriChat is built but lightly used; don't over-invest in its prompts until adoption is verified post-launch.
- The 5-year solo-maintainer horizon means **boring beats clever**. Prefer obvious code, clear naming, and inline comments over abstractions.
