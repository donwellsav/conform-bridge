# Conform Bridge

Conform Bridge is a desktop-first internal operator application for
Resolve-to-Nuendo translation workflows.

Current workflow:

`Resolve/editorial intake -> canonical normalized translation model -> planned and packaged Nuendo delivery`

The repo is well past scaffold-only status. It now includes real intake
parsing, deterministic delivery planning, execution prep, staging, handoff
contracts, external execution packaging, writer-adapter dry runs,
writer-runner contracts, filesystem transport packaging, receipt
compatibility and ingestion, and executor/package compatibility validation.
Native Nuendo writing is still intentionally out of scope.

## Current Status

- Current phase: `Phase 4A`
- Previous phase: `Phase 3K` complete
- Next phase: `TBD after Phase 4A`
- Current Phase `4A` driver: four-fixture cross-sample acceptance in
  `fixtures/expectations/sample-matrix.json`
- Current real transport path: `filesystem-transport-adapter` only
- Current persistence model: browser-local review-state deltas only
- Current real writer path: none

## Implemented Boundaries

Conform Bridge keeps these boundaries separate:

1. Intake parsing in `importer.ts`
2. Canonical normalization and analysis
3. Delivery planning in `exporter.ts`
4. Execution prep in `delivery-execution.ts`
5. Staging in `delivery-staging.ts`
6. Handoff contracts in `delivery-handoff.ts`
7. External execution packaging in `external-execution-package.ts`
8. Writer-adapter dry runs in `writer-adapters.ts`
9. Writer-runner request/response/receipt contracts in `writer-runner.ts`
10. Transport and audit in `writer-run-transport.ts`
11. Transport-adapter packaging in `writer-run-transport-adapters.ts`
12. Receipt compatibility, normalization, and ingestion in
    `receipt-schema-registry.ts`, `receipt-normalization.ts`,
    `receipt-compatibility.ts`, and `writer-run-receipt-ingestion.ts`
13. Executor/profile compatibility validation in
    `executor-profile-registry.ts`, `executor-package-validation.ts`, and
    `executor-compatibility.ts`

Those layers are intentional. Planning does not write files. Execution prep
only generates safe text, JSON, CSV, and EDL payloads. Staging only
materializes deterministic bundle entries. Handoff only defines deferred
writer inputs. Package export only packages staged and handoff outputs.
Adapters only validate and dry-run. Runners only create runnable contracts and
simulated receipts. Transport only packages dispatch state. Receipt ingestion
only normalizes and matches inbound receipts.

## Current Parser Coverage

Structured intake parsing exists for:

- `fcpxml/xml`
- `aaf`
- `edl`
- metadata CSV
- marker CSV
- `manifest.json`
- direct WAV/BWF metadata inspection for format, BWF/LIST, and iXML fields

Importer precedence is:

1. `fcpxml/xml`
2. `aaf`
3. `edl`
4. metadata-only fallback

AAF notes:

- Direct in-repo parsing covers the current embedded-graph and decoded-OLE
  fixture layouts.
- `.adapter` compatibility fallback still exists for unsupported or partially
  covered layouts.
- Direct parsing is primary for most bundled AAF fixtures, but not for all
  real-world AAF shapes.
- Across the four current real baseline fixtures, direct AAF hydration is
  still unsupported. Those AAFs are tracked truthfully as
  `unsupported`, not promoted to authoritative coverage.

Auxiliary or partially parsed:

- `wav` / `bwf`: direct metadata inspection exists, but explicit source
  timecode is only trusted when the container exposes it clearly
- `mov` / `mp4`: classified as reference video, not deeply parsed
- `otio` / `otioz` / `drt`: preserved as auxiliary reference artifacts only

## Operator Workflow

The current operator shell supports:

- track mapping review
- marker review and suppression
- metadata mapping review
- field recorder candidate review and overrides
- validation summaries rebuilt from imported analysis plus saved review deltas
- saved validation acknowledgements and dismissals
- saved reconform review decisions and per-change notes
- delivery previews that reflect imported data plus saved review deltas

Review-state persistence is browser-local only. The app stores operator deltas
keyed by `jobId` plus source signature. It does not persist the imported
canonical model into browser storage.

## Delivery Outputs In Scope Now

Generated safely now:

- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- marker CSV
- marker EDL
- metadata CSV
- field recorder report

Materialized now:

- deterministic staged delivery folder layout
- generated payload files
- deferred JSON descriptors for writer-only binary artifacts
- `staging-summary.json`

Packaged and audited now:

- deferred writer-input contracts
- delivery handoff manifests and summaries
- external execution manifests, indexes, summaries, deferred input exports,
  and checksums
- executor profile resolution, compatibility reports, and compatibility
  summaries
- writer-adapter dry-run outputs
- writer-runner requests, responses, and receipts
- transport envelopes, dispatch records, audit logs, and history
- filesystem dispatch bundles
- receipt compatibility metadata, normalization results, and receipt-ingestion
  audit/history updates

Deferred behind a future writer:

- Nuendo-ready AAF output
- reference video binary handoff
- any native Nuendo session or project output

## Fixture Library

The repo currently includes these intake fixtures:

- `fixtures/intake/r2n-test-1`
- `fixtures/intake/r2n-test-2`
- `fixtures/intake/r2n-test-3`
- `fixtures/intake/r2n-test-4`
- `fixtures/intake/rvr-203-r3`
- `fixtures/intake/rvr-204-edl-only`
- `fixtures/intake/rvr-205-aaf-only`
- `fixtures/intake/rvr-206-aaf-vs-fcpxml`
- `fixtures/intake/rvr-207-aaf-missing-media`
- `fixtures/intake/rvr-208-aaf-mob-graph`
- `fixtures/intake/rvr-209-aaf-partial-fallback`

These fixtures exercise:

- a real Resolve sample with XML-primary timeline hydration and direct WAV
  metadata enrichment
- a second real Resolve sample with XML-primary lightweight hydration,
  XML-vs-FCPXML disagreement, and marker-EDL enrichment
- an official Blackmagic training editorial baseline with XML-primary
  lightweight hydration and no private field-recorder scope
- an official Blackmagic Fairlight multichannel baseline with XML-primary
  lightweight hydration and guarded `.dra` source-media exclusion
- FCPXML-first timeline hydration
- EDL fallback hydration
- direct AAF parsing
- AAF-vs-FCPXML reconciliation
- missing media
- broader mob, slot, locator, and media-descriptor coverage
- explicit compatibility fallback diagnostics

Imported fixture data is primary when available. Deterministic mock data is
only fallback when the fixture library is absent.

### `r2n-test-1` Fixture Strategy

`r2n-test-1` now uses a two-tier fixture model:

- Tier 1: committed lightweight editorial turnover files plus committed
  expectations under `fixtures/expectations/r2n-test-1`
- Tier 2: local private companions, currently the large WAV files, reference
  MP4, and `otioz`

Tier 1 is enough for normal importer, delivery-planning, execution-prep,
staging, package-export, and contract-layer verification. Tier 2 stays local
by default so the repo remains lightweight and shareable while still allowing
deeper local regression coverage for production-audio metadata and the first
real field-recorder pass.

Normal importer, test, lint, and build flows now keep Tier 2 out of the
working set unless both private-sample opt-in flags are enabled explicitly.

### What `r2n-test-1` Proves Now

- XML-vs-FCPXML arbitration is now deterministic inside the current
  `fcpxml/xml` priority bucket.
- For this sample, `XML` stays authoritative because it agrees with the
  strongest secondary timing reference and preserves richer track and clip
  coverage than `FCPXML`.
- Direct WAV/BWF/iXML inspection is now deeper than simple classification and
  can preserve sample rate, bit depth, channel count, BWF/LIST metadata, iXML
  fields, and recording-device hints.
- Field-recorder results are now scored truthfully:
  confident match, plausible candidate, insufficient metadata, and no match
  remain distinct states with explicit reasons.

### What `r2n-test-1` Still Does Not Prove

- Arbitrary real-world AAF support is not complete. `Timeline 1.aaf` remains
  unsupported as a direct authoritative source in this sample.
- WAV metadata alone is still not enough for a confident field-recorder relink
  on `r2n-test-1`; editorial CSV timing is still part of the evidence.
- OTIO, OTIOZ, and DRT are still auxiliary reference artifacts only.
- No native Nuendo writer exists, and binary delivery remains deferred behind
  the writer boundary.

### What `r2n-test-2` Proves In Lightweight Mode

- `XML` again stays authoritative over `FCPXML`, but for a different reason:
  richer real track and clip coverage wins even though the secondary metadata
  timing reference points at the shorter `00:00:07:04` editorial view.
- The lightweight sample is broad enough to preserve a 10-track / 47-clip /
  5-marker canonical timeline without touching any private media.
- Resolve marker EDL lines with blank note text are now parsed correctly, so
  lightweight marker enrichment does not silently drop those marker entries.
- `OMO PROMO FINAL.aaf` remains truthfully unsupported for direct authoritative
  parsing on this sample.
- Tier 1 still contains no production-audio assets, so field-recorder results
  stay at missing-only in lightweight mode. Stronger field-recorder evidence
  still requires the guarded private-media pass.

### What `r2n-test-2` Proves With Private Media Enabled

- The guarded private pass now preserves five real local WAV assets with
  sample rate, bit depth, channel count, BWF presence, iXML presence,
  recording-device hints, and editorial-CSV source timecode ranges.
- Interview-camera clips now reach stronger candidate-only scores because the
  sample exposes usable overlap plus zero-padded take agreement, but those
  candidates still remain below confident relink because the WAV containers do
  not expose explicit source timecode strings.
- Generic soundtrack audio is no longer treated as a field-recorder roll, so
  sample-2 no longer produces false-positive candidates such as logo or SFX
  clips relinking to `ONE MIN SOUNDTRACK.wav`.
- `r2n-test-2` therefore proves truthful candidate/no-match behavior with
  stronger private-media evidence than `r2n-test-1`, but still does not prove
  a confident camera-to-recorder relink.

### What `r2n-test-3` Proves In Lightweight Mode

- `r2n-test-3` is now an official editorial baseline fixture derived from the
  Blackmagic Design DaVinci Resolve 20 Beginner's Guide lesson material.
- `XML` stays authoritative over `FCPXML` because it preserves the expected
  `01:00:00:00` start timecode and much broader track and clip coverage.
- `AAF` remains truthfully unsupported for direct authoritative hydration on
  this sample.
- The lightweight sample preserves editorial structure, metadata CSV timing,
  and delivery-planning behavior without any production-audio claims.
- `r2n-test-3` is editorial baseline only. It does not prove field-recorder
  behavior and does not require a private-media pass.

### What `r2n-test-4` Proves In Lightweight Mode

- `r2n-test-4` is now an official Fairlight multichannel baseline fixture
  derived from the Blackmagic Design Fairlight Audio Guide lesson material.
- `XML` stays authoritative over `FCPXML` because it preserves one additional
  track and three additional clip events while still agreeing on start
  timecode.
- `AAF` remains truthfully unsupported for direct authoritative hydration on
  this sample.
- The lightweight metadata now preserves at least one `poly_8` clip
  (`C4_02.mov`), so multichannel layout is no longer collapsed to `stereo`
  when only CSV structure is available.
- The local `.dra` source-media bundle, reference `mp4`, and `otioz` stay out
  of normal verification, and this sample makes no field-recorder or
  production-audio relink claims.

## Phase 4A Fixture Matrix

The repo now treats the four real fixtures as a deterministic acceptance
matrix recorded in `fixtures/expectations/sample-matrix.json`.

- `r2n-test-1`: real custom turnover baseline with guarded private-media
  evidence
- `r2n-test-2`: real breadth sample with stronger guarded private-media
  candidate evidence
- `r2n-test-3`: official Blackmagic editorial baseline
- `r2n-test-4`: official Blackmagic Fairlight multichannel baseline

Current matrix truths:

- `XML` is authoritative on all four real samples.
- `FCPXML` remains secondary on all four real samples.
- Real-sample `AAF` currently means `unsupported` for direct authoritative
  hydration on all four fixtures.
- `OTIO`, `OTIOZ`, and `DRT` remain auxiliary reference artifacts only.
- `r2n-test-4` is the multichannel guard fixture and preserves `poly_8`
  structure in lightweight mode.

## Running Locally

Install:

```bash
npm install
```

Run development:

```bash
npm run dev
```

Verify:

```bash
npm test
npm run lint
npm run build
```

Recommended local workflow when private sample companions may be present:

1. targeted tests for the file or parser you are changing
2. normal repo verification: `npm test`, `npm run lint`, `npm run build`
3. private-sample regression only when you explicitly need the large local
   companions

Extended local sample regression, only when the private `r2n-test-1` assets
are present and large-media access is explicitly enabled:

```powershell
$env:CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE='1'
$env:CONFORM_BRIDGE_ALLOW_LARGE_MEDIA='1'
npm test
```

To scope a guarded private run to one real sample only:

```powershell
$env:CONFORM_BRIDGE_PRIVATE_SAMPLE_TARGET='r2n-test-2'
```

Guardrails for local Codex and normal developer runs:

- normal verification does not parse or copy Tier 2 private WAV, MP4, or OTIOZ
  companions even when they are present on disk
- direct WAV metadata parsing now uses bounded I/O instead of reading the full
  media file into memory
- any direct large-media read requires both
  `CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1` and
  `CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1`

## Phase History

### Phase 1

Scaffolded the shell, routes, typed model, root docs, and deterministic mock
fallback.

### Phase 2

- `2A`: real folder scanning plus metadata CSV, marker CSV, `manifest.json`,
  and simple EDL intake analysis
- `2B`: delivery planning moved out of importer and into `exporter.ts`
- `2C`: FCPXML/XML became the primary timeline source when present
- `2D`: AAF ingestion and reconciliation landed
- `2E`: AAF-derived ingest became richer for composition, slot, media, fade,
  and missing-media detail
- `2F`: binary/container-aware AAF extraction boundary was added
- `2G`: direct in-repo AAF container graph parsing landed with fallback
  retained
- `2H`: direct AAF coverage expanded across broader mob, slot, locator, and
  media-descriptor layouts
- `2I`: operator mapping editors and validation workflow became usable
- `2J`: browser-local persisted review-state deltas and reconform review
  persistence landed
- `2K`: remaining AAF fallback dependence was reduced

### Phase 3

- `3A`: delivery execution prep began for safe serializable artifacts
- `3B`: generated payloads began materializing into staged bundle layouts
- `3C`: deferred-writer handoff contracts and readiness summaries were
  formalized
- `3D`: staged and handoff outputs began exporting as deterministic external
  execution packages
- `3E`: writer-adapter interfaces, capability matching, and dry-run validation
  were formalized
- `3F`: writer-runner requests, responses, and receipts were formalized
- `3G`: transport envelopes, dispatch records, audit logs, and history were
  formalized
- `3H`: filesystem transport adapter packaging and deterministic receipt
  ingestion landed
- `3I`: receipt compatibility profiles, normalization, migration, and stronger
  matching/replay safety landed
- `3J`: executor/package compatibility validation landed on top of packaged
  output, handoff contracts, transport profiles, and receipt expectations

## Known Limitations

- No native Nuendo writer exists yet.
- No backend, queue, auth, billing, or database exists.
- Browser-local review persistence is single-machine only.
- Some AAF layouts still require compatibility fallback payloads.
- The `r2n-test-1` WAV files provide useful BWF/LIST/iXML metadata, but not a
  trustworthy explicit source timecode string from the container alone.
- OTIO, OTIOZ, and DRT are still auxiliary reference artifacts only.
- Receipt compatibility currently covers canonical filesystem receipts,
  compatibility filesystem receipts, and a future-placeholder profile only.
- Only the filesystem transport adapter is real. Other transport paths remain
  future work.
- Executor compatibility currently targets canonical filesystem,
  compatibility filesystem, and future-placeholder executor profiles.
- Writer adapters and runners are still reference/no-op or placeholder
  implementations.
- Binary outputs remain deferred contracts, not generated native files.

## Next Recommended Work

`Phase 4A` should stay narrow and fixture-driven:

- use the four-sample matrix to keep XML-vs-FCPXML arbitration,
  multichannel preservation, and reconciliation reporting stable
- continue only with narrow AAF passes justified by the repeated unsupported
  real-sample OLE-compound shape
- add executor or transport variants only when a real external executor
  requires them
- keep filesystem transport as the primary deterministic path unless a new
  transport path can consume the same normalized contracts cleanly
- continue tightening receipt/profile/version compatibility without
  introducing a backend or queue
- keep native Nuendo writing deferred until the external execution boundary is
  proven stable

## Key Root Docs

- `PRODUCT.md`: product contract and current scope
- `SCHEMA.md`: layered model and contract entities
- `BUNDLE_SPEC.md`: intake, delivery, staging, handoff, and package
  expectations
- `TASKLIST.md`: roadmap and current phase status
- `AGENTS.md`: contributor and agent rules for working in this repo
