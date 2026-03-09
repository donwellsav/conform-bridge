# Conform Bridge

## Summary
Conform Bridge is a desktop-first internal operator application for Resolve to Nuendo translation workflows. The repo is no longer scaffold-only: intake parsing, canonical analysis, delivery planning, execution prep, staging, handoff, external packaging, adapter dry runs, runner contracts, transport packaging, and receipt compatibility are all implemented to the current documented boundary. Native Nuendo writing is still intentionally out of scope.

## Product Goal
Give post-production operators a clear, stable review surface for three explicit workflow layers:
1. Intake package from Resolve and editorial
2. Canonical normalized translation model inside Conform Bridge
3. Delivery package planned and prepared for Nuendo handoff

## Workflow Shape
Resolve exports in -> canonical internal model -> planned Nuendo-ready delivery package out

## Primary Users
- Post coordinators preparing turnovers
- Assistant editors validating Resolve export packages
- Dialogue and effects editors reviewing field recorder readiness
- ReConform operators checking revision deltas and review decisions

## Product Contract
- `SourceBundle` is intake only.
- `TranslationModel` is the canonical normalized layer.
- `DeliveryPackage` is output-planning only.
- Direction is modeled explicitly with stage and origin metadata.
- File format alone must never imply inbound vs outbound direction.
- Importer precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- AAF is a structured intake source with direct in-repo parsing first and compatibility fallback second.
- Review-state persistence is layered as browser-local deltas keyed by job plus source signature. The imported canonical payload is not duplicated in browser storage.

## Current Implemented Boundaries
- Intake parsing in `importer.ts`
- Delivery planning in `exporter.ts`
- Delivery execution prep in `delivery-execution.ts`
- Delivery staging in `delivery-staging.ts`
- Deferred-writer handoff contracts in `delivery-handoff.ts`
- External execution packaging in `external-execution-package.ts`
- Writer-adapter dry runs in `writer-adapters.ts`
- Writer-runner contracts in `writer-runner.ts`
- Writer-run transport and audit in `writer-run-transport.ts`
- Transport-adapter packaging in `writer-run-transport-adapters.ts`
- Receipt compatibility, normalization, and matching in `receipt-schema-registry.ts`, `receipt-normalization.ts`, and `receipt-compatibility.ts`
- Receipt ingestion in `writer-run-receipt-ingestion.ts`
- Executor/package compatibility validation in `executor-profile-registry.ts`, `executor-package-validation.ts`, and `executor-compatibility.ts`

Those boundaries must stay separate.

## Current Capabilities
- Real intake fixture scanning from `fixtures/intake/*`
- Structured parsing for FCPXML/XML, AAF, metadata CSV, marker CSV, `manifest.json`, and simple EDL
- Canonical hydration and reconciliation
- Operator mapping editors for track, marker, metadata, and field recorder review
- Validation summaries merged from intake completeness, reconciliation, and delivery blockers
- Browser-local persisted review-state deltas and reconform review decisions
- Deterministic delivery planning
- Deterministic generation of safe manifest/README/CSV/EDL/report payloads
- Deterministic staged delivery bundle materialization
- Deterministic deferred-writer contracts and handoff manifests
- Deterministic external execution packages with checksums and indexes
- Deterministic adapter dry runs, runner requests/responses/receipts, transport packaging, filesystem dispatch bundles, receipt-ingestion audit updates, and executor compatibility reports

## Current Status
- Current phase: `Phase 3J` complete
- Current real external transport path: filesystem-based only
- Current real writer path: none
- Current saved review persistence: browser-local only

## Current Non-Goals
- No native Nuendo project/session writing
- No backend, queue, auth, billing, database, or marketing site
- No fake server API that pretends execution exists

## Known Limitations
- Some AAF layouts still require compatibility fallback payloads.
- BWF/WAV and MOV/MP4 are classified but not deeply parsed.
- Deferred binary outputs remain contracts, not generated binaries.
- Receipt compatibility is currently limited to the defined filesystem-oriented profiles plus a future placeholder profile.
- Executor compatibility is currently limited to canonical filesystem, compatibility filesystem, and future-placeholder executor profiles.
- Writer adapters and runners are still reference/no-op or placeholder implementations.
- Additional transport adapters remain intentionally deferred until a real external executor requires a second deterministic profile.

## Near-Term Roadmap
- `Phase 3K`: only add executor/profile variants or additional transport adapters when real external executors require them and the current boundaries can stay intact
- Continue reducing AAF compatibility fallback only when new real containers justify more parser coverage
- Keep native Nuendo writing deferred until external execution interoperability is stable

## UX Direction
- Dark, serious post-production desktop aesthetic
- Dense but readable information layout
- Deterministic first render with SSR-safe defaults
- Strong operator terminology, not marketing language

## Acceptance For The Current Repo State
- Intake, canonical, and delivery layers are explicit in code and docs
- Real fixture imports are primary when available
- Deterministic mock fallback remains available only when the fixture library is absent
- Delivery planning, execution prep, staging, handoff, packaging, adapter dry runs, runner contracts, transport packaging, and receipt ingestion are all documented as separate boundaries
- No wording implies that a Nuendo writer already exists
