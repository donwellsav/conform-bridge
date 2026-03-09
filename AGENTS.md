# Conform Bridge Agent Contract

## Repo Intent

This repository is a frontend-first internal operator application for
Resolve-to-Nuendo translation workflows.

## Current Repo State At A Glance

- Current phase: `Phase 3J` complete
- Next phase: `Phase 3K`
- Current real transport path: `filesystem-transport-adapter` only
- Current persistence model: browser-local review-state deltas only
- Real intake parsing exists for `fcpxml/xml`, `aaf`, `edl`, metadata CSV,
  marker CSV, and `manifest.json`
- Importer precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`
- Browser-local review-state persistence exists for operator deltas keyed by
  job plus source signature
- Delivery planning, execution prep, staging, handoff, external packaging,
  adapter dry runs, runner contracts, transport packaging, receipt
  normalization/ingestion, and executor compatibility validation all exist
- No native Nuendo writer exists

## Required Engineering Rules

- Use Next.js App Router with TypeScript and Tailwind CSS.
- Keep initial render deterministic and SSR-safe.
- Do not use browser-only APIs during initial render.
- Do not use `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render
  logic.
- Do not add a fake backend, API route, database, queue, or server action that
  pretends parsing or writing exists.
- Prefer reusable components over page-specific duplication.
- Keep domain and workflow types centralized in `src/lib/types.ts`.

## Layering Rules

Keep these boundaries distinct:

1. intake parsing
2. canonical normalization and analysis
3. delivery planning
4. execution prep
5. staging
6. handoff contracts
7. external execution package export
8. writer-adapter dry runs
9. writer-runner contracts
10. transport and audit
11. transport-adapter packaging
12. receipt compatibility, normalization, and ingestion
13. executor/profile compatibility validation

Do not collapse those concerns into one layer.

## UI Rules

- Dark, serious post-production desktop aesthetic.
- Dense but readable information layout.
- Favor panels, inspectors, queues, and tables over oversized marketing cards.
- Use route content that reads like a real operator tool with imported turnover
  data first and deterministic mock fallback copy only when fixtures are
  absent.

## Terminology Rules

Use these terms consistently:

- `SourceBundle` / intake
- `TranslationModel` / canonical normalized model
- `ReviewState` / operator delta overlay
- `DeliveryPackage` / delivery
- `PreservationIssue` / validation or reconciliation finding
- execution prep
- staging
- handoff
- external execution package
- writer-adapter
- writer-runner
- transport
- receipt compatibility / normalization / ingestion

## Documentation Rules

- Keep root docs aligned on current phase and next phase.
- Describe the repo as beyond scaffold-only and beyond mock-only.
- Be explicit about what is generated now vs what remains deferred behind a
  writer boundary.
- Keep filesystem transport as the documented current real path.
- Keep browser-local persistence explicit wherever operator review-state is
  described.
- Do not imply that arbitrary AAF coverage is complete if it is not.
- Do not imply that a native Nuendo writer already exists.

## Ongoing Scope Rules

- No native Nuendo export writer.
- No auth, billing, database, or marketing pages.
- No AI chat UI.
- No backend, queue, or service layer for transport or receipt handling.

## Mock Data Rules

- Mock bundles must reflect real Resolve/Nuendo workflows and remain
  compatible with the current intake -> canonical -> delivery contract.
- Use fixed IDs, fixed date strings, and fixed counts.
- Treat imported fixture data as primary when available; use mock data only as
  deterministic fallback when the fixture library is absent.

## Route Contract

The app shell must continue to include:

- Dashboard
- New Job
- Jobs
- Templates
- Field Recorder
- ReConform
- Settings

## Review Standard

Reject work that:

- hides hydration problems with client-only wrappers
- uses browser APIs on first render
- introduces backend-looking abstractions for features that do not exist
- implies the repo is still scaffold-only or mock-only
- implies browser-local review persistence, staged bundle output, handoff
  contracts, external execution packaging, writer-adapter dry runs,
  writer-runner contracts, transport packaging, receipt-ingestion flow, or
  executor compatibility validation do not exist
- implies that a native Nuendo writer already exists
