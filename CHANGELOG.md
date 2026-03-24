# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Removed debug email display from /unauthorized page
- Removed /sign-up from public proxy routes (no sign-up page exists)

### Known Issues
- Ably real-time not verified end-to-end
- Scout → Pipeline integration not verified end-to-end
- No loading skeleton on initial data fetch
- No error states for failed API calls

## [0.0.1] - 2026-03-23

### Added
- Next.js 15 application scaffold (App Router, Turbopack, TypeScript, Tailwind)
- Clerk authentication with Google OAuth, restricted to @playgroundlogic.co and @enso.co
- Route group protection via `(protected)/layout.tsx` — domain check using `currentUser()`
- `/unauthorized` page for blocked users with sign-out action
- Neon Postgres database with Drizzle ORM (`opportunities` table with `stage` and `company_type` enums)
- Pipeline UI: 220px sidebar, opportunity list, 640px detail panel, add modal
- Stage filter (Sparks → Retired), text search across company/sector/sponsor
- Stage summary strip — proportional bar visualization, clickable to filter
- Opportunity cards with company name, stage badge, type badge, sector, sponsor, date
- Detail panel with inline editing (EditableField component), stage selector, all text fields
- Next actions — add/remove with action text + owner
- Add opportunity modal with full form
- Full REST API: `GET/POST /api/opportunities`, `GET/PATCH/DELETE /api/opportunities/[id]`
- Service auth: Bearer token validation for Signal Scout → Pipeline writes
- Ably real-time pub/sub: `opportunity:created`, `opportunity:updated`, `opportunity:deleted` events
- Scoped Ably token endpoint (`/api/ably-token`) — subscribe-only tokens for browser clients
- `usePipeline` hook — initial fetch + Ably subscription + CRUD actions
- Visual style: Bebas Neue + DM Mono typography, stage color system, ENSO warm neutral palette
