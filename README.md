# Conform Bridge

Conform Bridge is a desktop-first internal operator app for Resolve to Nuendo translation workflows.

Current workflow model:

`Resolve/editorial intake -> canonical normalized translation model -> planned Nuendo delivery package`

This repo is frontend-first. It includes real intake analysis, broader direct in-repo AAF container parsing with adapter fallback, and real delivery planning, but it does not write Nuendo files yet.

Current phase:
- `Phase 2I` completed: richer mapping editors and validation workflow are in place.

Next planned phase:
- `Phase 2J`: persist operator review state and deepen reconform-ready review tools.

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

## Current Status

Implemented now:
- Next.js App Router shell with operator-focused routes
- typed intake, canonical, and delivery domain model
- real intake folder scanning and classification
- real parsing for FCPXML/XML, broader direct in-repo AAF container parsing with adapter fallback, metadata CSV, marker CSV, `manifest.json`, and simple EDL extraction
- Canonical hydration for bundles, timelines, tracks, clips, markers, and analysis
- Primary timeline hydration from FCPXML/XML when present, with AAF enrichment and `aaf -> edl -> metadata` fallback after that
- Deterministic delivery planning in `exporter.ts`
- operator mapping editors for track, marker, metadata, and field recorder review
- shared validation rules that surface unresolved intake, metadata, production-audio, and delivery-blocker conditions
- Fixture-backed tests for importer, exporter, and data flow

Not implemented:
- Real Nuendo export writing
- Full arbitrary-production AAF graph traversal without compatibility fallback
- Persistent save/load for operator mapping decisions beyond the current in-memory review session
- Auth, billing, database, backend, or marketing site

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
- [src/lib/mapping-workflow.ts](./src/lib/mapping-workflow.ts): pure mapping editor state helpers and review counters
- [src/lib/validation.ts](./src/lib/validation.ts): shared validation-rule generation and analysis report rebuilding
- [src/lib/data-source.ts](./src/lib/data-source.ts): composes imported fixture data with exporter planning, or falls back to mock data
- [src/components/mapping-view.tsx](./src/components/mapping-view.tsx): operator-facing mapping editor and delivery preview

## Fixture Intake Folder

The repo includes real fixture turnover folders:

- `fixtures/intake/rvr-203-r3`
- `fixtures/intake/rvr-204-edl-only`
- `fixtures/intake/rvr-205-aaf-only`
- `fixtures/intake/rvr-206-aaf-vs-fcpxml`
- `fixtures/intake/rvr-207-aaf-missing-media`
- `fixtures/intake/rvr-208-aaf-mob-graph`

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
- a binary/container-aware `.aaf` file plus adapter fallback payload as the secondary structured source for enrichment and reconciliation
- metadata CSV
- marker CSV
- `manifest.json`
- reference video placeholder
- production-audio BWF placeholders

`rvr-207-aaf-missing-media` includes:
- a binary/container-aware `.aaf` file plus adapter fallback payload as the primary structured timeline source
- explicit missing-media references inside the AAF-derived payload
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

## Importer / Exporter Boundary

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

`exporter.ts` does not write files yet.

## Supported Intake Parsing In This Phase

Parsed:
- FCPXML / XML timeline structure
- broader direct in-repo AAF container parsing for supported binary fixture shapes
- adapter fallback payload normalization when direct parsing does not cover a file
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
- AAF-referenced media missing from intake
- missing reel / tape / scene / take
- source files referenced by the timeline exchange but missing from intake

## SSR / Rendering Rules

- deterministic SSR-safe rendering
- no browser-only APIs during initial render
- no `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render paths
- client components only where interaction is required

## Planned Next Phases

### Phase 2J
Persist operator review state and deepen reconform-ready review tools.

Targets:
- persist mapping edits and validation acknowledgements without introducing a backend
- keep exporter planning derived from saved operator decisions
- deepen reconform change inspection and review workflows
- tighten validation around resolved vs acknowledged issues

### Phase 2K
Reduce remaining AAF compatibility fallback dependence.

Targets:
- broader real-world OLE/AAF graph traversal
- less dependence on embedded in-repo graph payloads
- more composition mob, slot, source mob, and locator extraction from non-fixture layouts
- better transition and effect coverage

### Phase 3
Delivery execution after planning is stable.

Targets:
- real Nuendo export writer
- manifest and README file generation from exporter outputs
- delivery package serialization

## Next Recommended Work

- persist operator mapping decisions and validation acknowledgements so the richer mapping editor survives beyond the current in-memory review session
- keep exporter planning derived from saved mapping state without introducing a backend or file writer yet
- deepen reconform review once saved mapping state exists
- continue reducing AAF adapter fallback coverage in parallel, but keep importer precedence at `fcpxml/xml -> aaf -> edl -> metadata`
