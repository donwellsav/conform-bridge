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

- Current phase: `Phase 4A`
- Previous phase: `Phase 3K` complete
- Next phase: `TBD after Phase 4A`
- Current Phase `4A` driver: cross-sample interchange fidelity across
  `r2n-test-1`, `r2n-test-2`, `r2n-test-3`, and `r2n-test-4`
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
  compatibility fallback second, but current real samples must still be
  classified truthfully as authoritative, partial-structural,
  reconciliation-only, or unsupported.
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
- Direct WAV/BWF metadata inspection for sample rate, bit depth, channel
  count, BWF/LIST metadata, and iXML where present
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

## Phase 4A Fixture Matrix

`Phase 4A` uses the real sample matrix
`r2n-test-1 / Timeline 1`, `r2n-test-2 / OMO PROMO FINAL`,
`r2n-test-3 / OMO PROMO CATCHUP 08`, and
`r2n-test-4 / Channel mapping and linked groups`.

The deterministic fixture-matrix snapshot lives at
`fixtures/expectations/sample-matrix.json`.

The fixture strategy is intentionally split:

- Tier 1: committed lightweight editorial turnover files and committed
  expectation snapshots
- Tier 2: local private companions used only for extended regression coverage

That keeps the repo shareable without losing the ability to run deeper local
checks against direct WAV/BWF/iXML metadata and first-pass field-recorder
candidate behavior where justified.

Normal importer, test, lint, and build flows keep Tier 2 out of the working
set unless the private-sample opt-in flags are both enabled explicitly.

Current AAF role semantics:

- `authoritative`: direct AAF hydration is strong enough to win canonical
  authority
- `partial-structural`: AAF contributes reliable structural detail but not
  full authority
- `reconciliation-only`: AAF contributes mismatch or enrichment evidence but
  is not safe for structural authority
- `unsupported`: direct AAF parsing could not extract a usable graph shape for
  canonical hydration

Current real-sample matrix truth:

- All four real baseline samples still classify as `unsupported` for direct
  AAF authoritative hydration.
- The repeated real blocker is the same `ole-compound` container family with
  `unparsed` extraction and `none` direct coverage.
- `r2n-test-4` remains the multichannel guard fixture and preserves truthful
  `poly_8` layout evidence in lightweight mode.

For this sample specifically:

- `XML` currently wins structured-source arbitration over `FCPXML` inside the
  existing `fcpxml/xml` precedence bucket.
- `AAF` remains non-authoritative because direct parsing does not support this
  sample shape yet.
- Direct WAV/BWF/iXML parsing now contributes real metadata, but the current
  sample still needs editorial CSV timing to support only plausible
  field-recorder candidates rather than confident relinks.

For `r2n-test-2` in lightweight mode:

- `XML` stays authoritative over `FCPXML`, but here the deciding signal is
  much broader real track and clip coverage than the shorter editorial view.
- `AAF` remains non-authoritative because direct parsing still does not support
  this sample shape.
- Marker EDL enrichment now preserves Resolve marker lines even when the note
  text is blank.
- Tier 1 intentionally excludes the private `OMO/` source media tree, so
  field-recorder outcomes remain missing-only until the guarded private-media
  pass is enabled explicitly.

For `r2n-test-2` in the guarded private-media pass:

- The private interview WAV rolls preserve stronger BWF/iXML metadata than
  `r2n-test-1`, including scene, take, tape-style roll identity, and recording
  device hints.
- Candidate scoring now stays truthful when the sample exposes zero-padded
  slate or take values and when generic soundtrack WAVs should not be treated
  as field-recorder rolls.
- The result is stronger candidate-only evidence, not a confident
  camera-to-recorder relink, because usable source TC still comes from the
  editorial CSV rather than an explicit WAV timecode string.

For `r2n-test-3` in lightweight mode:

- The sample is an official Blackmagic training editorial baseline, not a
  field-recorder proof sample.
- `XML` stays authoritative over `FCPXML` because it preserves the expected
  start timecode and broader editorial structure.
- `AAF` remains non-authoritative because direct parsing still does not
  support this sample shape.
- Tier 1 is enough for canonical hydration, reconciliation, and delivery
  planning; the local `mp4` and `otioz` companions remain out of scope for
  normal verification.

For `r2n-test-4` in lightweight mode:

- The sample is an official Fairlight multichannel baseline, not a
  field-recorder proof sample.
- `XML` stays authoritative over `FCPXML` because it preserves broader track
  and clip coverage while keeping the same start timecode.
- `AAF` remains non-authoritative because direct parsing still does not
  support this sample shape.
- Lightweight metadata now preserves at least one `poly_8` clip from CSV
  structure, which makes this sample useful for multichannel regression
  coverage without any direct media reads.
- The local `.dra` project bundle, reference video, and `otioz` remain out of
  normal verification and are guarded explicitly.

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
- WAV/BWF parsing is now deeper than simple classification, but explicit
  source timecode still depends on what the container actually exposes.
- The richest `r2n-test-1` production-audio assertions only run when the
  local private sample companions are present and both
  `CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1` and
  `CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1` are set.
- OTIO, OTIOZ, and DRT remain auxiliary reference artifacts only.
- MOV/MP4 remains a classified reference-video input, not a deep media parser.
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

- `Phase 4A`: keep the four-sample acceptance matrix stable while tightening
  AAF truthfulness and cross-sample interchange reporting
- Continue only with narrow AAF passes justified by the repeated unsupported
  `ole-compound` real-sample shape
- Add executor/profile variants or additional transport adapters only when a
  real external executor requires them and the current boundaries can stay
  intact
- Keep native Nuendo writing deferred until external execution
  interoperability is stable

## Local Guardrails

- Treat Tier 2 private sample media as opt-in only during local Phase 4A work.
- Run targeted tests first, then normal repo verification, and only then any
  private-sample regression.
- Normal local verification must not recurse through, copy, or fully read the
  giant private WAV/MP4/OTIOZ companions.
- Direct large-media reads require both
  `CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1` and
  `CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1`.
- Optional scoped private verification can additionally set
  `CONFORM_BRIDGE_PRIVATE_SAMPLE_TARGET=r2n-test-2` so dual-opt-in runs stay
  on one private sample.

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
