# Conform Bridge

Conform Bridge is a desktop-first internal operator app for Resolve to Nuendo translation workflows.

Current workflow model:

`Resolve/editorial intake -> canonical normalized translation model -> planned Nuendo delivery package`

This repo is frontend-first. It includes real intake analysis, broader direct in-repo AAF parsing across supported graph and decoded-OLE fixture layouts, browser-local persisted operator review state, real delivery planning, delivery execution prep for safe text/JSON/CSV artifacts, staged delivery bundle materialization for those safe artifacts, hardened deferred-writer handoff contracts for binary outputs, deterministic external execution package export on top of staged and handoff outputs, formal writer-adapter interfaces with dry-run validation on top of those packaged contracts, and deterministic writer-runner requests, responses, and receipts on top of adapter dry runs, but it does not write Nuendo files yet.

Current phase:
- `Phase 3F` completed: writer-runner contracts now consume packaged external execution output plus adapter dry runs, generate deterministic runnable-vs-blocked requests, and emit normalized no-op responses and receipts while native writer execution still stays deferred.

Next planned phase:
- `Phase 3G`: formalize external runner transport and execution audit flow on top of writer-runner requests and receipts, still without implementing native Nuendo/session writing yet.

## Phase History

### Phase 1
Scaffold only.

Implemented:
- Next.js App Router shell with desktop-first operator routes
- typed intake, canonical, and delivery domain model
- reusable Tailwind and shadcn/ui-style component primitives
- dark operator-facing shell and route placeholders
- mock-data fallback path for SSR-safe first render

Not implemented:
- real intake parsing
- real delivery planning
- real export writing

### Phase 2A
Real intake folder scanning and first-pass intake analysis.

Implemented:
- Real intake folder scanning and classification
- Real parsing for metadata CSV, marker CSV, `manifest.json`, and simple EDL extraction
- Canonical hydration from structured intake data where available
- Analysis reports and preservation findings from real fixture folders

### Phase 2B
Real delivery planning boundary.

Implemented:
- Delivery package creation moved out of `importer.ts`
- `exporter.ts` generates deterministic `DeliveryPackage` and `DeliveryArtifact[]`
- imported fixture data now flows through importer first, then exporter

### Phase 2C
FCPXML/XML becomes the primary timeline source of truth.

Implemented:
- Real FCPXML/XML parsing for timeline, track, clip, and marker hydration
- Primary timeline hydration from FCPXML/XML when present
- EDL fallback when FCPXML/XML is absent
- Reconciliation issues when metadata CSV or marker CSV disagree with the primary timeline exchange

### Phase 2D
AAF ingestion and reconciliation.

Implemented:
- Structured AAF parsing for composition name, track list, clip list, markers, source names, timing, fades, and offline indications
- AAF primary hydration when FCPXML/XML is absent
- AAF enrichment and reconciliation when FCPXML/XML is present
- AAF mismatch reporting for track count, clip count, clip timing, source file names, reel/tape metadata, marker coverage, and missing media
- Additional AAF-backed intake fixtures and parser tests

### Phase 2E
Richer AAF-derived ingest beyond the first section/text-dump fixtures.

Implemented:
- richer AAF-derived fixture parsing for composition, track slot, media reference, clip event, and marker structures
- preserved mob-name context when it differs from the resolved source file name
- improved missing-media and offline-reference handling in AAF-primary imports
- stronger speed and fade extraction when inferable from AAF-derived inputs
- additional missing-media fixture coverage and integration tests

### Phase 2F
Binary/container-aware AAF extraction.

Implemented:
- a real `.aaf` file adapter boundary that detects OLE/container-style AAF files
- stable `.aaf.adapter` payload support that normalizes extracted AAF data into the existing parser contract
- importer integration that uses real `.aaf` files as structured intake sources without changing the canonical or delivery contracts
- fixture coverage for binary/container-aware `aaf-only`, `fcpxml + aaf`, and `aaf-with-missing-media` intake paths
- adapter-level tests alongside parser, importer, exporter, and integration tests

### Phase 2G
Direct in-repo AAF container graph parsing.

Implemented:
- direct in-repo parsing for supported binary `.aaf` fixture shapes
- direct extraction of canonical AAF payloads from OLE/container-aware fixture binaries without a sidecar for the `aaf-only` path
- importer diagnostics when direct parsing does not cover a file and `.adapter` fallback is used
- parser and importer coverage for direct parse, adapter fallback, and missing-media reconciliation paths

### Phase 2H
Expanded direct AAF coverage and reduced compatibility fallback dependence.

Implemented:
- broader direct traversal for composition mobs, mob slots, source mobs, source clips, locators/comments, media descriptors, and transition/effect hints
- richer direct-fixture coverage with a broader real-world-style AAF mob graph
- deeper reconciliation for source clip identity and marker/locator coverage mismatches
- importer and parser coverage for direct parse, fallback diagnostics, locator extraction, and media descriptor extraction

### Phase 2I
Operator mapping editors and validation workflow.

Implemented:
- richer track, marker, metadata, and field recorder mapping editors in the Job Detail workflow
- bulk mapping actions where practical for track, marker, metadata, and field recorder review
- shared validation rules that merge importer reconciliation issues with delivery-planning blockers
- dashboard and jobs summaries for unresolved mapping and validation state
- exporter-driven local delivery preview updates from edited mapping decisions without adding a writer
- mapping, validation, and imported-fixture integration tests

### Phase 2J
Persisted operator review state and reconform-ready saved review.

Implemented:
- browser-local persisted review-state storage keyed by `jobId` plus a stable intake/source signature
- versioned localStorage envelope with corrupt-data fallback and migration-safe defaults
- persisted operator deltas for track, marker, metadata, and field recorder review decisions
- persisted validation acknowledgements, dismissals, and notes layered on top of imported `PreservationIssue` records
- persisted reconform review decisions, per-change notes, and unresolved/acknowledged/risky filters
- dashboard, jobs, and job-detail summaries that now reflect saved operator review progress after hydration
- reset-to-imported-state controls without persisting the imported canonical model itself
- SSR-safe persistence tests, overlay tests, and exporter-preview regression coverage

### Phase 2K
Reduced remaining AAF compatibility fallback dependence.

Implemented:
- broader direct in-repo AAF parsing for supported decoded-OLE layout payloads in addition to the existing embedded graph path
- direct parsing for more non-trivial AAF fixture layouts, including stream-backed mob/slot/component extraction
- richer direct extraction of composition mobs, mob slots, source mobs, source clips, locators/comments, media descriptors, source clip identity, and missing-media hints
- stronger adapter-fallback diagnostics that now preserve payload format, fallback reason, and direct-parse diagnostics when compatibility sidecars are still required
- explicit partial-fallback coverage through a dedicated compatibility fixture while keeping current fixtures on the direct path where possible
- regression coverage proving existing direct fixtures still hydrate the same canonical model and saved review-state flow remains intact

### Phase 3A
Delivery execution prep while keeping planning separate from writing.

Implemented:
- a new execution-prep boundary after `exporter.ts`
- deterministic generation of `manifest.json`, README import instructions, marker CSV, marker EDL, metadata CSV, and field recorder report payloads
- deferred binary execution records for AAF and reference video artifacts instead of fake binary contents
- job-detail and saved-review preview visibility for generated vs deferred execution state
- regression coverage proving saved operator review deltas change execution-prep output without changing the importer/planner/writer split

### Phase 3B
Staged delivery bundle materialization while keeping writer work deferred.

Implemented:
- a new staging boundary after execution prep
- deterministic staged bundle layout for generated payloads and deferred binary descriptors
- staged `manifest.json`, README, marker CSV, marker EDL, metadata CSV, and field recorder report files
- deferred JSON descriptors for AAF and reference video artifacts instead of fake binary contents
- staging summary output with artifact paths, counts, blockers, and review-influence context
- job-detail and saved-review preview visibility for staged bundle structure and deferred records
- regression coverage for deterministic staged layout, disk materialization helper output, and saved-review influence on staged results

### Phase 3C
Deferred writer-input contract hardening.

Implemented:
- a new handoff boundary after staging
- deterministic deferred-writer input contracts for deferred AAF and reference-video artifacts
- writer dependency graphs, source/review signatures, delivery package signatures, and readiness states
- handoff JSON outputs under `handoff/` for deferred writer inputs, handoff manifest, and handoff summary
- job-detail and saved-review preview visibility for deferred writer contracts, readiness, blockers, and handoff summary
- regression coverage for deterministic handoff serialization, dependency resolution, blocked-state generation, and staged-output consistency

### Phase 3D
External execution package export on top of staged output and handoff contracts.

Implemented:
- a new external execution package boundary after staging and handoff
- deterministic package layout that mirrors staged outputs under `staged/`, keeps handoff files under `handoff/`, and adds export metadata under `package/`
- deterministic package manifests, package index, package summary, generated-artifact index, deferred-writer input export, and checksums
- package readiness evaluation with `ready`, `partial`, and `blocked` states
- package previews in job detail and saved-review overlay flows
- Node-only package write helper for deterministic disk materialization without implementing any Nuendo writer
- regression coverage for package manifests, checksums, readiness, saved-review influence, and disk output consistency

### Phase 3E
Writer-adapter interfaces on top of packaged external execution output.

Implemented:
- a new writer-adapter boundary after external execution packaging
- normalized adapter input contracts derived only from packaged staged output, handoff contracts, deferred writer inputs, package readiness, and source/review signatures
- a default adapter registry with a reference no-op adapter plus future AAF/reference-video placeholder adapters
- deterministic adapter readiness validation, capability matching, unsupported-reason reporting, and dry-run execution plans
- job-detail and saved-review preview visibility for adapter matches, dry-run summaries, and blocked/unsupported reasons
- regression coverage for adapter input normalization, registry matching, readiness, dry runs, unsupported cases, and saved-review influence

### Phase 3F
Writer-runner contracts on top of writer-adapter dry runs.

Implemented:
- a new writer-runner boundary after writer adapters
- normalized runner input contracts derived only from the external execution package plus adapter dry-run output
- deterministic writer-run requests for runnable, blocked, and unsupported deferred artifacts
- deterministic no-op runner responses and receipts with source/review signatures, dependency state, and adapter/runner linkage
- `handoff/writer-run-requests.json`, `handoff/writer-run-responses.json`, and `handoff/writer-run-receipts.json`
- a reference no-op runner that proves the runnable contract without writing native binaries
- job-detail and saved-review preview visibility for runnable vs blocked artifacts, runner matches, and receipt output
- regression coverage for request generation, blocked classification, unsupported cases, receipt generation, and saved-review influence

## Current Status

Implemented now:
- Next.js App Router shell with operator-focused routes
- typed intake, canonical, and delivery domain model
- real intake folder scanning and classification
- real parsing for FCPXML/XML, broader direct in-repo AAF container parsing with adapter fallback, metadata CSV, marker CSV, `manifest.json`, and simple EDL extraction
- direct AAF parsing for embedded graph payloads, broader decoded-OLE layout payloads, locators/comments, media descriptors, and transition/effect hints where inferable
- Canonical hydration for bundles, timelines, tracks, clips, markers, and analysis
- Primary timeline hydration from FCPXML/XML when present, with AAF enrichment and `aaf -> edl -> metadata` fallback after that
- Deterministic delivery planning in `exporter.ts`
- Deterministic delivery execution prep for safe JSON, text, and CSV artifacts in `delivery-execution.ts`
- Deterministic staged delivery bundle materialization in `delivery-staging.ts`
- Deterministic deferred-writer input and handoff contract generation in `delivery-handoff.ts`
- Deterministic external execution packaging in `external-execution-package.ts`
- Deterministic writer-adapter input normalization, capability matching, and dry-run validation in `writer-adapters.ts`
- Deterministic writer-runner input normalization, runnable request generation, no-op response generation, and receipt generation in `writer-runner.ts`
- operator mapping editors for track, marker, metadata, and field recorder review
- shared validation rules that surface unresolved intake, metadata, production-audio, and delivery-blocker conditions
- browser-local persisted review deltas for mappings, validation acknowledgements, and reconform review decisions
- reconform review with saved per-change status, notes, filters, and summary counts
- Fixture-backed tests for importer, exporter, and data flow
- generated execution payload previews in the job-detail and saved-review workflow
- staged delivery bundle previews for imported and saved-review states
- deferred writer-input and handoff previews for imported and saved-review states
- writer-adapter previews for packaged deferred contracts, dry-run readiness, and unsupported reasons
- writer-runner previews for runnable requests, no-op responses, blocked artifacts, and execution receipts
- measurably reduced adapter dependence in the current fixture library: direct parsing now covers `rvr-205`, `rvr-206`, `rvr-207`, and `rvr-208`, while `rvr-209` remains the explicit compatibility-fallback case

## Known Limitations

- No Nuendo writer exists yet.
- Operator review persistence is browser-local only; no backend or shared multi-user state exists.
- Full arbitrary-production AAF graph traversal without compatibility fallback is not complete yet.
- `.adapter` fallback is still required for unsupported or only-partially-parsed AAF layouts, even though the current fixture library depends on it less than before.
- Binary AAF, MOV/MP4, and any native Nuendo session/project outputs remain deferred behind a future writer boundary.
- Generated staging is serializable and can be written to disk through the staging helper, but native writer output is still not implemented.
- Deferred writer inputs are formalized, but no writer executes them yet.
- Writer adapters validate packaged deferred contracts, but only the reference no-op adapter is implemented; future AAF/reference-video adapters remain placeholders.
- Writer runners normalize runnable requests and emit no-op receipts, but only the reference no-op runner is implemented; no real native writer execution exists yet.
- BWF/WAV and MOV/MP4 assets are classified but not deeply parsed.
- Auth, billing, database, backend, and marketing site remain out of scope.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style component primitives

## Product Shape

The app is explicitly split into 3 layers:

1. Intake package
   - inbound Resolve, editorial, and production-audio materials
2. Canonical translation model
   - normalized internal representation used by the operator UI
3. Delivery package
   - planned Nuendo-ready artifacts generated by the exporter boundary

Direction is modeled explicitly with stage and origin metadata. File kind alone does not imply whether a file is inbound or outbound.

## Routes

- Dashboard
- Jobs
- New Job
- Templates
- Field Recorder
- ReConform
- Settings

## Key Files

- [PRODUCT.md](./PRODUCT.md): product contract
- [SCHEMA.md](./SCHEMA.md): domain schema
- [BUNDLE_SPEC.md](./BUNDLE_SPEC.md): intake vs delivery package rules
- [AGENTS.md](./AGENTS.md): repo guardrails
- [TASKLIST.md](./TASKLIST.md): phased work tracking
- [src/lib/types.ts](./src/lib/types.ts): shared domain types
- [src/lib/parsers/fcpxml.ts](./src/lib/parsers/fcpxml.ts): FCPXML/XML parser for timeline, track, clip, and marker hydration
- [src/lib/parsers/aaf.ts](./src/lib/parsers/aaf.ts): richer AAF-derived parser for canonical hydration and reconciliation
- [src/lib/parsers/aaf-container.ts](./src/lib/parsers/aaf-container.ts): broader direct in-repo AAF container graph extraction for supported binary fixture shapes
- [src/lib/adapters/aaf-file.ts](./src/lib/adapters/aaf-file.ts): AAF file boundary that prefers direct parsing and falls back to `.adapter` compatibility payloads
- [src/lib/services/importer.ts](./src/lib/services/importer.ts): intake scanning, source preference, parsing, reconciliation, hydration, analysis
- [src/lib/services/exporter.ts](./src/lib/services/exporter.ts): delivery planning only
- [src/lib/services/delivery-execution.ts](./src/lib/services/delivery-execution.ts): execution prep for safe serializable delivery artifacts while binary outputs remain deferred
- [src/lib/services/delivery-staging.ts](./src/lib/services/delivery-staging.ts): deterministic staged delivery bundle materialization for generated payloads plus deferred binary descriptors
- [src/lib/services/delivery-staging-write.ts](./src/lib/services/delivery-staging-write.ts): Node-only helper that writes staged bundle entries to disk for execution tests and later handoff work
- [src/lib/services/delivery-handoff.ts](./src/lib/services/delivery-handoff.ts): deterministic deferred-writer input contracts, handoff manifests, and readiness summaries for deferred artifacts
- [src/lib/services/external-execution-package.ts](./src/lib/services/external-execution-package.ts): deterministic external execution package export that bundles staged output, handoff contracts, package manifests, indexes, and checksums
- [src/lib/services/external-execution-package-write.ts](./src/lib/services/external-execution-package-write.ts): Node-only helper that writes the external execution package to disk without attempting native Nuendo writing
- [src/lib/services/writer-adapters.ts](./src/lib/services/writer-adapters.ts): normalized writer-adapter input contracts plus aggregate registry evaluation and dry-run summary generation
- [src/lib/services/writer-adapter-registry.ts](./src/lib/services/writer-adapter-registry.ts): default writer-adapter registry with reference/no-op validation and future writer placeholders
- [src/lib/services/writer-runner.ts](./src/lib/services/writer-runner.ts): normalized writer-runner input contracts plus deterministic request, response, and receipt generation after adapter dry runs
- [src/lib/services/writer-runner-registry.ts](./src/lib/services/writer-runner-registry.ts): default writer-runner registry with the reference no-op runner
- [src/lib/mapping-workflow.ts](./src/lib/mapping-workflow.ts): pure mapping editor state helpers and review counters
- [src/lib/review-state.ts](./src/lib/review-state.ts): pure review overlay, delta application, and review-summary helpers
- [src/lib/local-review-state.ts](./src/lib/local-review-state.ts): SSR-safe browser-local persisted review-state store with versioning
- [src/lib/validation.ts](./src/lib/validation.ts): shared validation-rule generation and analysis report rebuilding
- [src/lib/data-source.ts](./src/lib/data-source.ts): composes imported fixture data with exporter planning, or falls back to mock data
- [src/components/mapping-view.tsx](./src/components/mapping-view.tsx): operator-facing mapping editor and delivery preview
- [src/components/delivery-execution-preview.tsx](./src/components/delivery-execution-preview.tsx): generated-vs-deferred execution-prep artifact preview
- [src/components/delivery-staging-preview.tsx](./src/components/delivery-staging-preview.tsx): staged bundle tree, content preview, and deferred record preview
- [src/components/delivery-handoff-preview.tsx](./src/components/delivery-handoff-preview.tsx): deferred writer-input readiness, dependency, and handoff JSON preview
- [src/components/external-execution-package-preview.tsx](./src/components/external-execution-package-preview.tsx): external package status, checksums, package metadata, and packaged staged/handoff file preview
- [src/components/writer-adapter-preview.tsx](./src/components/writer-adapter-preview.tsx): writer-adapter matches, dry-run readiness, unsupported reasons, and placeholder adapter visibility
- [src/components/writer-runner-preview.tsx](./src/components/writer-runner-preview.tsx): writer-runner readiness, runnable request, no-op response, blocked artifact, and receipt preview
- [src/components/reconform-review.tsx](./src/components/reconform-review.tsx): saved reconform review workflow with notes and filters

## Fixture Intake Folder

The repo includes real fixture turnover folders:

- `fixtures/intake/rvr-203-r3`
- `fixtures/intake/rvr-204-edl-only`
- `fixtures/intake/rvr-205-aaf-only`
- `fixtures/intake/rvr-206-aaf-vs-fcpxml`
- `fixtures/intake/rvr-207-aaf-missing-media`
- `fixtures/intake/rvr-208-aaf-mob-graph`
- `fixtures/intake/rvr-209-aaf-partial-fallback`

`rvr-203-r3` includes:
- Resolve AAF
- Resolve FCPXML as the primary timeline exchange
- editorial EDL
- metadata CSV
- marker CSV
- `manifest.json`
- reference video placeholder
- production-audio BWF/WAV placeholders

One production roll is intentionally missing so analysis, reconciliation, and delivery blocking can be exercised.

`rvr-204-edl-only` includes:
- editorial EDL as the primary fallback timeline source
- metadata CSV for enrichment
- `manifest.json`
- reference video placeholder
- production-audio BWF placeholder

`rvr-205-aaf-only` includes:
- a binary/container-aware `.aaf` file that now parses directly in-repo without an adapter sidecar
- metadata CSV for enrichment
- `manifest.json`
- reference video placeholder
- production-audio BWF placeholders

`rvr-206-aaf-vs-fcpxml` includes:
- FCPXML as the primary structured timeline source
- a broader decoded-OLE-style `.aaf` file that now parses directly as the secondary structured source for enrichment and reconciliation
- a retained adapter sidecar kept only as a compatibility reference path
- metadata CSV
- marker CSV
- `manifest.json`
- reference video placeholder
- production-audio BWF placeholders

`rvr-207-aaf-missing-media` includes:
- a broader decoded-OLE-style `.aaf` file that now parses directly as the primary structured timeline source
- explicit missing-media references plus heavier locator coverage inside the direct AAF payload
- a retained adapter sidecar kept only as a compatibility reference path
- metadata CSV
- `manifest.json`
- reference video placeholder
- one present production-audio roll and one intentionally missing roll

`rvr-208-aaf-mob-graph` includes:
- a broader real-world-style direct `.aaf` graph fixture with composition mobs, slots, source mobs, locators, comments, media descriptors, and transition hints
- metadata CSV for enrichment
- `manifest.json`
- reference video placeholder
- production-audio BWF placeholders that match the direct media descriptors

`rvr-209-aaf-partial-fallback` includes:
- a direct-parse-first `.aaf` container that is intentionally only partially covered by the in-repo parser
- a retained `.adapter` sidecar that keeps canonical hydration working for this unsupported layout class
- metadata CSV, `manifest.json`, reference video placeholder, and a production-audio roll placeholder
- importer diagnostics that explain why compatibility fallback was still required

## Running Locally

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Run checks:

```bash
npm test
npm run lint
npm run build
```

## Importer / Exporter / Execution / Staging / Handoff Boundary

`importer.ts` is responsible for:
- scanning intake folders
- classifying inbound files
- selecting the preferred primary timeline source in this order:
  - `fcpxml/xml`
  - `aaf`
  - `edl`
  - metadata-only fallback
- parsing supported intake formats
- hydrating the canonical model
- enriching canonical events from AAF, metadata, marker CSV, EDL, and manifest data
- generating reconciliation issues when secondary sources disagree with the primary timeline source
- generating intake analysis and preservation findings

`exporter.ts` is responsible for:
- planning delivery artifacts from canonical state
- assigning deterministic artifact statuses
- building the delivery package model

`delivery-execution.ts` is responsible for:
- turning planned artifacts into safe serializable payloads where that is already deterministic
- generating `manifest.json`, README, marker CSV, marker EDL, metadata CSV, and field recorder report payloads
- recording deferred binary execution items for AAF and reference video outputs without faking binary contents

`delivery-staging.ts` is responsible for:
- turning execution-prep payloads into a deterministic staged bundle layout
- materializing generated payloads into staged file entries
- materializing deferred binary artifacts into explicit `.deferred.json` descriptors
- generating `staging-summary.json` with counts, paths, blockers, and review-influence context

`delivery-handoff.ts` is responsible for:
- turning staged deferred artifacts into stable writer-input contracts
- generating `handoff/deferred-writer-inputs.json`, `delivery-handoff-manifest.json`, and `delivery-handoff-summary.json`
- classifying deferred artifacts as `ready-for-writer`, `blocked`, `partial`, or `deferred-with-known-gaps`

`writer-adapters.ts` is responsible for:
- normalizing a stable adapter input contract from the packaged external execution bundle
- matching deferred artifacts to registered adapter capabilities
- validating adapter readiness and machine-readable unsupported reasons
- generating deterministic dry-run execution plans without writing any binary output

`writer-runner.ts` is responsible for:
- normalizing a stable runner input contract from the external execution package plus adapter dry-run output
- generating deterministic writer-run requests for runnable, blocked, and unsupported deferred artifacts
- producing deterministic no-op responses and execution receipts through the reference runner without writing any binary output
- keeping runner concerns separate from adapter dry runs, handoff contracts, staging, and package export

Neither `exporter.ts`, `delivery-execution.ts`, `delivery-staging.ts`, `delivery-handoff.ts`, `external-execution-package.ts`, `writer-adapters.ts`, nor `writer-runner.ts` writes native Nuendo files yet.

## Current Parser Coverage

Parsed:
- FCPXML / XML timeline structure
- direct AAF parsing for embedded graph payloads and broader decoded-OLE layout payloads
- direct extraction of composition mobs, mob slots, source mobs, source clips, locators/comments, media descriptors, and transition/effect hints for the supported fixture classes
- adapter fallback payload normalization when direct parsing still cannot hydrate a file
- metadata CSV
- marker CSV
- `manifest.json`
- simple EDL event and marker extraction

Classified but not deeply parsed:
- BWF / WAV
- MOV / MP4

Primary source of truth:
- FCPXML / XML when present
- AAF when FCPXML / XML is absent
- EDL when neither FCPXML / XML nor AAF is available
- metadata-only hydration only when no timeline exchange is available

Reconciliation currently flags:
- track count mismatch
- clip timecode mismatch
- marker count mismatch
- `AAF_ADAPTER_FALLBACK` when compatibility sidecars were required
- `AAF_SOURCE_CLIP_MISMATCH` when AAF source clip identity differs from the primary timeline source
- AAF-vs-primary track count mismatch
- AAF-vs-primary clip count mismatch
- AAF-vs-primary clip timing mismatch
- AAF-vs-primary source file mismatch
- AAF-vs-primary reel/tape mismatch
- AAF-vs-primary marker coverage mismatch
- AAF direct-parse fallback-required diagnostics when compatibility sidecars were still needed
- AAF-referenced media missing from intake
- missing reel / tape / scene / take
- source files referenced by the timeline exchange but missing from intake

## Current Delivery Execution, Staging, And Handoff Coverage

Generated now:
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- marker CSV
- marker EDL
- metadata CSV
- field recorder report

Staged now:
- root delivery folder named from the canonical sequence/timeline label
- generated files under root, `markers/`, `metadata/`, and `reports/`
- deferred JSON descriptors under `deferred/`
- `staging-summary.json`

Handoff now:
- `handoff/deferred-writer-inputs.json`
- `handoff/delivery-handoff-manifest.json`
- `handoff/delivery-handoff-summary.json`
- deterministic source signature, review signature, delivery package signature, dependency graph, and writer-readiness state for each deferred artifact

External package export now:
- `package/external-execution-manifest.json`
- `package/external-execution-index.json`
- `package/external-execution-summary.json`
- `package/generated-artifact-index.json`
- `package/deferred-writer-inputs.json`
- `package/checksums.json`
- mirrored staged outputs under `staged/`
- preserved handoff outputs under `handoff/`

Writer adapters now:
- `reference-noop-writer-adapter` validates packaged deferred contracts and produces a deterministic dry-run plan without writing files
- `future-nuendo-aaf-writer` advertises `aaf_delivery_writer` capability as a placeholder with explicit unsupported reasons
- `future-reference-video-handoff` advertises `reference_video_handoff` capability as a placeholder with explicit unsupported reasons

Writer runners now:
- `handoff/writer-run-requests.json`
- `handoff/writer-run-responses.json`
- `handoff/writer-run-receipts.json`
- a `reference-noop-writer-runner` that consumes runnable deferred artifacts after adapter dry runs and emits deterministic simulated receipts without writing native binaries
- runnable, blocked, partial, and unsupported runner-state visibility in job detail and saved-review overlay flows

Deferred:
- Nuendo-ready AAF
- reference video handoff
- any native Nuendo session/project output

## Operator Review Workflow

Current operator tooling includes:
- track mapping review
- marker review and suppression
- metadata mapping review
- field recorder candidate review and overrides
- validation summaries rebuilt from current mapping and delivery-planning state
- saved validation acknowledgements and dismissals layered over imported findings
- saved reconform review state with per-change acknowledgement and follow-up notes
- dashboard and jobs summaries rebuilt from imported data plus saved operator deltas after hydration

## SSR / Rendering Rules

- deterministic SSR-safe rendering
- no browser-only APIs during initial render
- no `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render paths
- client components only where interaction is required

## Planned Next Phases

### Phase 3G
External runner transport and execution audit flow on top of writer-runner contracts.

Targets:
- define how external runner processes consume writer-run requests and return normalized receipt/history updates without reading arbitrary app state
- keep package export, handoff, staging, execution prep, adapter dry runs, writer-runner contracts, and any future writer execution as separate layers
- keep native Nuendo session writing deferred until the runner transport and audit boundary is stable

## Next Recommended Work

- formalize external runner transport and audit contracts that consume the current writer-run requests, responses, and receipts
- add deterministic runner history and receipt update handling without letting writer concerns leak back into planning, staging, or package export
- keep AAF, reference video, and any future Nuendo session output behind a separate writer boundary
- continue reducing AAF compatibility fallback only when new real containers require it
- keep planning, execution prep, staging, handoff, packaging, adapter dry runs, writer-runner contracts, and future writing as separate layers
