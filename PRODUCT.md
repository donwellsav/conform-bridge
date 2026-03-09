# Conform Bridge

## Summary
Conform Bridge is a desktop-first internal operator application for Resolve to Nuendo translation workflows. The current repo state is intake-analysis-first: the operator shell is stable, intake parsing is partially real, delivery planning is real, and Nuendo file writing is still intentionally out of scope.

## Product Goal
Give post-production operators a clear review surface for three explicit workflow layers:
1. Intake package from Resolve and editorial.
2. Canonical normalized translation model inside Conform Bridge.
3. Delivery package planned for Nuendo.

## Workflow Shape
Resolve exports in -> canonical internal model -> Nuendo-ready delivery package out.

## Primary Users
- Post coordinators preparing turnovers.
- Assistant editors validating Resolve export packages.
- Dialogue and effects editors reviewing field recorder readiness.
- ReConform operators checking revision deltas before any real translation logic exists.

## Product Contract For This Phase
- `SourceBundle` is intake only.
- `TranslationModel` is the canonical normalized layer used by the app.
- `DeliveryPackage` is output planning only.
- Direction must be modeled explicitly with stage and origin metadata.
- File format alone must not imply whether an asset is inbound or outbound.
- FCPXML/XML is the preferred primary timeline source when present.
- AAF is a structured intake source with direct in-repo container parsing: real `.aaf` files can now hydrate the canonical model directly or enrich and reconcile against FCPXML/XML, while adapter fallback remains available for compatibility.
- CSV, manifest, marker CSV, and simple EDL parsing remain active enrichment and fallback inputs.

## Current Non-Goals
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
- Jobs
- New Job
- Templates
- Field Recorder
- ReConform
- Settings

## Current Deliverables
- Root spec files that define the layered workflow contract.
- Next.js App Router shell with TypeScript, Tailwind, and shadcn/ui-style reusable primitives.
- Shared `src/lib/types.ts` domain model with intake, canonical, and delivery entities.
- Real intake fixture scanning from `fixtures/intake/*`.
- Structured intake parsing for manifest JSON, metadata CSV, marker CSV, simple EDL, FCPXML/XML, and direct in-repo AAF container parsing with adapter fallback compatibility.
- Canonical analysis and reconciliation output through `src/lib/services/importer.ts`.
- Delivery artifact planning through `src/lib/services/exporter.ts`.
- Strong operator-facing placeholder routes with imported-data fallback to mock data when no fixture library exists.

## Current AAF State
- Real `.aaf` files are detected through a binary/container-aware adapter boundary.
- Direct in-repo AAF container parsing now exists for supported fixture shapes.
- Stable AAF-derived adapter payloads remain available as a compatibility fallback when direct extraction does not cover a file.
- Legacy text-dump AAF fixtures remain supported as a fallback path for narrow tests and fixture maintenance.
- Nuendo project writing still does not exist.

## Rendering Rules
- Initial render must be deterministic and SSR-safe.
- No browser-only APIs during initial render.
- No `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render paths.
- No page-wide client-only workaround patterns.
- Use client components only where interaction is required.

## Acceptance For This Task
- Repo scaffolds cleanly and builds.
- All requested routes exist and keep the current operator shell intact.
- Intake, canonical, and delivery layers are explicit in docs, types, and mock data.
- Real intake fixtures and parsers feed the canonical model without pretending that Nuendo export writing already exists.
