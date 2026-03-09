# Conform Bridge

## Summary

Conform Bridge is a desktop-first internal operator application for
Resolve-to-Nuendo translation workflows.

The repo is beyond scaffold-only status. It now includes real intake parsing,
canonical normalization, browser-local review-state overlays, deterministic
delivery planning, execution prep, staging, handoff contracts, external
execution packaging, adapter dry runs, runner contracts, transport packaging,
receipt compatibility, receipt ingestion, and executor/package compatibility
validation.

Native Nuendo writing remains intentionally out of scope.

## Product Goal

Give post-production operators a clear, stable review surface for three
explicit workflow layers:

1. `SourceBundle` intake from Resolve, editorial, and production audio
2. `TranslationModel` as the canonical normalized model
3. `DeliveryPackage` as planned and prepared delivery for Nuendo handoff

## Workflow Shape

`Resolve/editorial intake -> canonical normalized translation model -> planned and packaged Nuendo delivery`

## Current Status

- Current phase: `Phase 3J` complete
- Next phase: `Phase 3K`
- Current real transport path: `filesystem-transport-adapter` only
- Current persistence model: browser-local review-state deltas only
- Current writer state: no native Nuendo writer

## Product Contract

- `SourceBundle` is intake only.
- `TranslationModel` is the canonical normalized layer.
- `ReviewState` is an operator delta overlay, not a second canonical model.
- `DeliveryPackage` is planning only.
- Execution prep, staging, handoff, external packaging, adapter dry runs,
  runner contracts, transport, receipt compatibility, and executor
  compatibility stay as separate downstream boundaries.
- Direction is modeled explicitly with `stage` and `origin`.
- File format alone never implies inbound vs outbound direction.
- Importer precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- AAF is a structured intake source with direct in-repo parsing first and
  compatibility fallback second.
- Imported fixture data is primary when available; deterministic mock data is
  fallback only when the fixture library is absent.

## Implemented Boundaries

- Intake parsing in `importer.ts`
- Delivery planning in `exporter.ts`
- Execution prep in `delivery-execution.ts`
- Staging in `delivery-staging.ts`
- Handoff contracts in `delivery-handoff.ts`
- External execution packaging in `external-execution-package.ts`
- Writer-adapter dry runs in `writer-adapters.ts`
- Writer-runner contracts in `writer-runner.ts`
- Transport and audit in `writer-run-transport.ts`
- Transport-adapter packaging in `writer-run-transport-adapters.ts`
- Receipt compatibility, normalization, and matching in
  `receipt-schema-registry.ts`, `receipt-normalization.ts`, and
  `receipt-compatibility.ts`
- Receipt ingestion in `writer-run-receipt-ingestion.ts`
- Executor/package compatibility validation in
  `executor-profile-registry.ts`, `executor-package-validation.ts`, and
  `executor-compatibility.ts`

These boundaries must stay separate.

## Current Capabilities

- Real intake fixture scanning from `fixtures/intake/*`
- Structured parsing for FCPXML/XML, AAF, metadata CSV, marker CSV,
  `manifest.json`, and simple EDL
- Canonical hydration and reconciliation
- Operator mapping editors for track, marker, metadata, and field recorder
  review
- Validation summaries merged from intake completeness, reconciliation, and
  delivery blockers
- Browser-local persisted review-state deltas and reconform review decisions
- Deterministic delivery planning
- Deterministic generation of safe manifest, README, CSV, and EDL payloads
- Deterministic staged delivery bundle materialization
- Deterministic deferred-writer contracts and handoff manifests
- Deterministic external execution packages with checksums and indexes
- Deterministic adapter dry runs, runner requests/responses/receipts,
  transport packaging, filesystem dispatch bundles, receipt-ingestion audit
  updates, and executor compatibility reports

## Primary Users

- Post coordinators preparing turnovers
- Assistant editors validating Resolve export packages
- Dialogue and effects editors reviewing field recorder readiness
- ReConform operators reviewing revision deltas and saved decisions

## Current Non-Goals

- No native Nuendo project or session writing
- No backend, queue, auth, billing, database, or marketing site
- No fake server API that pretends transport or execution exists

## Known Limitations

- Some AAF layouts still require compatibility fallback payloads.
- BWF/WAV and MOV/MP4 are classified but not deeply parsed.
- Deferred binary outputs remain contracts, not generated binaries.
- Receipt compatibility is currently limited to the defined filesystem-oriented
  profiles plus a future-placeholder profile.
- Executor compatibility is currently limited to canonical filesystem,
  compatibility filesystem, and future-placeholder executor profiles.
- Writer adapters and runners are still reference/no-op or placeholder
  implementations.
- Additional transport adapters remain intentionally deferred until a real
  external executor requires a second deterministic profile.

## Near-Term Roadmap

- `Phase 3K`: add executor/profile variants or additional transport adapters
  only when a real external executor requires them and the current boundaries
  can stay intact
- Continue reducing AAF compatibility fallback only when new real containers
  justify more parser coverage
- Keep native Nuendo writing deferred until external execution
  interoperability is stable

## UX Direction

- Dark, serious post-production desktop aesthetic
- Dense but readable information layout
- Deterministic first render with SSR-safe defaults
- Strong operator terminology, not marketing language

## Acceptance For The Current Repo State

- Intake, canonical, review-state, and delivery layers are explicit in code
  and docs.
- Real fixture imports are primary when available.
- Deterministic mock fallback remains available only when the fixture library
  is absent.
- Delivery planning, execution prep, staging, handoff, packaging, adapter dry
  runs, runner contracts, transport packaging, receipt ingestion, and
  executor compatibility are all documented as separate boundaries.
- No wording implies that a native Nuendo writer already exists.
