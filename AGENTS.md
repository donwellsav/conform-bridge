# Conform Bridge Agent Contract

## Repo Intent
This repository is a frontend-first internal operator application for Resolve to Nuendo translation workflows.

## Required Engineering Rules
- Use Next.js App Router with TypeScript and Tailwind CSS.
- Keep initial render deterministic and SSR-safe.
- Do not use browser-only APIs during initial render.
- Do not use `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render logic.
- Do not add a fake backend, API route, database, queue, or server action that pretends parsing or writing exists.
- Prefer reusable components over page-specific duplication.
- Keep domain and workflow types centralized in `src/lib/types.ts`.

## UI Rules
- Dark, serious post-production desktop aesthetic.
- Dense but readable information layout.
- Favor panels, inspectors, queues, and tables over oversized marketing cards.
- Use route content that reads like a real operator tool with imported turnover data first and deterministic mock fallback copy only when fixtures are absent.

## Current Repo State
- Real intake parsing exists for `fcpxml/xml`, `aaf`, `edl`, metadata CSV, marker CSV, and `manifest.json`.
- Importer precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- Operator-facing mapping editors and validation workflow exist.
- Browser-local review-state persistence exists for operator deltas keyed by job plus source signature.
- Delivery planning exists in `exporter.ts`.
- Delivery execution prep exists in `delivery-execution.ts`.
- Delivery staging exists in `delivery-staging.ts`.
- Deferred writer-input contracts and handoff manifests exist in `delivery-handoff.ts`.
- External execution packaging exists in `external-execution-package.ts`.
- Writer-adapter dry runs exist in `writer-adapters.ts`.
- Writer-runner request/response/receipt contracts exist in `writer-runner.ts`.
- Writer-run transport/audit output exists in `writer-run-transport.ts`.
- Real filesystem transport adapter packaging exists in `writer-run-transport-adapters.ts`.
- Receipt compatibility profiles, normalization, migration, and signature-aware matching exist in `receipt-schema-registry.ts`, `receipt-normalization.ts`, and `receipt-compatibility.ts`.
- Deterministic receipt ingestion exists in `writer-run-receipt-ingestion.ts`.
- Executor/package compatibility validation exists in `executor-profile-registry.ts`, `executor-package-validation.ts`, and `executor-compatibility.ts`.

## Ongoing Scope Rules
- No native Nuendo export writer.
- No auth, billing, database, or marketing pages.
- No AI chat UI.
- No backend, queue, or service layer for transport or receipt handling.
- Do not collapse planning, execution prep, staging, handoff, external package export, adapter dry runs, runner contracts, transport/audit, or receipt-ingestion concerns into one layer.

## Documentation Rules
- Keep root docs aligned on current phase and next phase.
- Describe the repo as beyond scaffold-only and beyond mock-only.
- Use the current terminology consistently:
  - `SourceBundle` / intake
  - `TranslationModel` / canonical
  - `DeliveryPackage` / delivery
  - `ReviewState` / operator delta overlay
  - `PreservationIssue` / validation and reconciliation findings
- Be explicit about what is generated now vs what remains deferred behind a writer boundary.

## Mock Data Rules
- Mock bundles must reflect real Resolve/Nuendo workflows and remain compatible with the current intake -> canonical -> delivery contract.
- Use fixed IDs, fixed date strings, and fixed counts.
- Treat imported fixture data as primary when available; use mock data only as deterministic fallback when the fixture library is absent.

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
- implies browser-local review persistence, staged bundle output, handoff contracts, external execution packaging, writer-adapter dry runs, writer-runner contracts, transport packaging, or receipt-ingestion flow do not exist
- implies executor/profile compatibility validation does not exist
- implies that a Nuendo writer already exists
