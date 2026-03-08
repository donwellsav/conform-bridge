# Conform Bridge

## Summary
Conform Bridge is a desktop-first internal operator application for Resolve to Nuendo translation workflows. Phase 1 is scaffold-only: stable routes, typed domain models, realistic mock data, and a serious operator UI with no real parser, writer, backend, or external service dependency.

## Product Goal
Give post-production operators a clean review surface for intake bundles, mapping assumptions, preservation risks, field recorder readiness, and the shape of a Nuendo-ready output package.

## Workflow Focus
Resolve exports in, Nuendo-ready bundle out.

## Primary Users
- Post coordinators preparing turnovers.
- Assistant editors validating Resolve export packages.
- Dialogue and effects editors reviewing field recorder readiness.
- ReConform operators checking revision deltas before any real translation logic exists.

## Non-Goals For Phase 1
- No real AAF, EDL, CSV, or manifest parsing.
- No real Nuendo export writing.
- No auth, billing, database, or marketing site.
- No background jobs, queues, or fake API layer.

## UX Direction
- Dark, serious post-production desktop aesthetic.
- Dense but readable panels, tables, and inspectors.
- Navigation should feel like an internal operator tool, not a consumer SaaS dashboard.
- Routes should render meaningful placeholder content from stable mock data on first paint.

## Routes
- Dashboard
- New Job
- Jobs
- Templates
- Field Recorder
- ReConform
- Settings

## Phase 1 Deliverables
- Root spec files that define product, schema, bundle shape, contributor rules, and task status.
- Next.js App Router scaffold with TypeScript, Tailwind, and shadcn/ui-style reusable primitives.
- Shared `src/lib/types.ts` domain model.
- Shared `src/lib/mock-data.ts` with realistic Resolve/Nuendo workflow fixtures.
- App shell with sidebar and top bar.
- Strong placeholder layouts for all required routes.

## Rendering Rules
- Initial render must be deterministic and SSR-safe.
- No browser-only APIs during initial render.
- No `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render paths.
- No page-wide client-only workaround patterns.
- Use client components only where interaction is required.

## Acceptance For This Task
- Repo scaffolds cleanly and builds.
- All requested routes exist.
- Domain concepts are modeled in TypeScript.
- Mock bundles reflect real turnover contents.
- UI is visibly ready for phase 2 without pretending that parsing or export writing exists.
