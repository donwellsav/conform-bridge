# Conform Bridge Agent Contract

## Repo Intent
This repository is a frontend-only internal operator application for Resolve to Nuendo translation workflows.

## Required Engineering Rules
- Use Next.js App Router with TypeScript and Tailwind CSS.
- Keep initial render deterministic and SSR-safe.
- Do not use browser-only APIs during initial render.
- Do not use `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render logic.
- Do not add a fake backend, API route, database, queue, or server action that pretends parsing/export exists.
- Prefer reusable components over page-specific duplication.
- Keep domain types centralized in `src/lib/types.ts`.

## UI Rules
- Dark, serious post-production desktop aesthetic.
- Dense but readable information layout.
- Favor panels, inspectors, queues, and tables over oversized marketing cards.
- Use route content that reads like a real operator tool with realistic imported turnover data, while keeping deterministic mock fallback copy accurate.

## Current Repo State
- Real intake parsing exists for `fcpxml/xml`, `aaf`, `edl`, metadata CSV, marker CSV, and `manifest.json`.
- Importer precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- Operator-facing mapping editors and validation workflow exist.
- Delivery planning exists in `exporter.ts`.
- Delivery execution prep exists in `delivery-execution.ts`.
- Delivery staging exists in `delivery-staging.ts`.
- Deferred writer-input contracts and handoff manifests exist in `delivery-handoff.ts`.
- External execution packaging exists in `external-execution-package.ts`.
- Writer-adapter validation, capability matching, and dry-run planning exist in `writer-adapters.ts` and `writer-adapter-registry.ts`.
- Writer-runner request, response, and receipt contracts exist in `writer-runner.ts` and `writer-runner-registry.ts`.
- Writer-run transport envelopes, dispatch records, audit logs, and history exist in `writer-run-transport.ts` and `writer-run-audit.ts`.
- Real filesystem transport adapter packaging exists in `writer-run-transport-adapters.ts` and `writer-run-transport-registry.ts`.
- Deterministic receipt ingestion exists in `writer-run-receipt-ingestion.ts`.
- Operator review persistence exists as browser-local review deltas keyed by job plus source signature.

## Ongoing Scope Rules
- No real Nuendo export writer.
- No auth, billing, database, or marketing pages.
- No AI chat UI.
- No backend, queue, or server-side execution service for transport/receipt handling.
- Do not collapse planning, execution prep, staging, handoff, external package export, writer-adapter dry runs, writer-runner contracts, writer-run transport/audit contracts, and future writer execution into one layer.

## Mock Data Rules
- Mock bundles must reflect real Resolve/Nuendo workflows and remain compatible with the current intake -> canonical -> delivery contract.
- Use fixed IDs, fixed date strings, and fixed counts.
- Treat imported fixture data as primary when available; use mock data only as deterministic fallback when the fixture library is absent.

## Route Contract
The scaffold must include:
- Dashboard
- New Job
- Jobs
- Templates
- Field Recorder
- ReConform
- Settings

## Review Standard
Reject work that hides hydration problems with client-only wrappers, uses browser APIs on first render, or introduces backend-looking abstractions for features that do not exist yet.
Reject wording that implies the repo is still scaffold-only or mock-only when describing the current implementation state.
Reject wording that implies browser-local review persistence, staged bundle output, deferred writer contracts, external execution packaging, writer-adapter dry runs, writer-runner receipts, writer-run transport/audit output, filesystem transport adapter packaging, or receipt-ingestion flow do not exist.
