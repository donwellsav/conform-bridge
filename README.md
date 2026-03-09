# Conform Bridge

Conform Bridge is a desktop-first internal operator app for Resolve to Nuendo translation workflows.

Current workflow model:

`Resolve/editorial intake -> canonical normalized translation model -> planned Nuendo delivery package`

The repo is beyond scaffold-only. It now includes real intake parsing, deterministic delivery planning, execution-prep payload generation, staged delivery bundles, deferred-writer handoff contracts, external execution package export, writer-adapter dry runs, writer-runner request/response/receipt contracts, filesystem transport dispatch packaging, compatibility-aware receipt ingestion, and executor/package compatibility validation. Native Nuendo writing is still out of scope.

## Current Status

- Current phase: `Phase 3J` complete.
- Next phase: `Phase 3K` sample-driven external executor/profile expansion only when it preserves the current layered contracts.
- Current real transport path: `filesystem-transport-adapter`.
- Current persistence model: browser-local review-state deltas only.

## Workflow And Layer Boundaries

Conform Bridge keeps these layers separate:

1. Intake parsing in `importer.ts`
2. Canonical normalization and analysis
3. Delivery planning in `exporter.ts`
4. Delivery execution prep in `delivery-execution.ts`
5. Delivery staging in `delivery-staging.ts`
6. Delivery handoff contracts in `delivery-handoff.ts`
7. External execution packaging in `external-execution-package.ts`
8. Writer-adapter dry runs in `writer-adapters.ts`
9. Writer-runner request/response/receipt contracts in `writer-runner.ts`
10. Writer-run transport and audit in `writer-run-transport.ts`
11. Transport-adapter packaging in `writer-run-transport-adapters.ts`
12. Receipt compatibility, normalization, and ingestion in `receipt-schema-registry.ts`, `receipt-normalization.ts`, `receipt-compatibility.ts`, and `writer-run-receipt-ingestion.ts`
13. Executor/package compatibility validation in `executor-profile-registry.ts`, `executor-package-validation.ts`, and `executor-compatibility.ts`

Those layers are intentionally separate. Planning does not generate files, execution prep only generates safe text/JSON/CSV payloads, staging only materializes deterministic bundle entries, handoff only defines deferred-writer inputs, package export only bundles staged and handoff outputs, adapters only validate and dry-run, runners only create runnable contracts and simulated receipts, transport only packages dispatch state, and receipt ingestion only normalizes and matches inbound receipts.

## Current Parser Coverage

Structured intake parsing exists for:
- `fcpxml/xml`
- `aaf`
- `edl`
- metadata CSV
- marker CSV
- `manifest.json`

Importer precedence is:
1. `fcpxml/xml`
2. `aaf`
3. `edl`
4. metadata-only fallback

AAF notes:
- direct in-repo parsing now covers the current embedded-graph and broader decoded-OLE fixture layouts
- `.adapter` compatibility fallback still exists for unsupported or partially-covered layouts
- direct parsing is now primary for most bundled AAF fixtures, but not all real-world AAF shapes

Classified but not deeply parsed:
- `bwf` / `wav`
- `mov` / `mp4`

## Current Operator Workflow

The operator-facing shell currently supports:
- track mapping review
- marker review and suppression
- metadata mapping review
- field recorder candidate review and overrides
- validation summaries rebuilt from imported analysis plus current mapping state
- saved validation acknowledgements and dismissals
- saved reconform review decisions and per-change notes
- delivery previews that reflect imported data plus saved review deltas

Persisted operator state is browser-local only. The app stores review deltas keyed by `jobId` plus source signature. It does not persist the imported canonical model into local storage.

## Delivery Outputs In Scope Now

Generated safely now:
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- marker CSV
- marker EDL
- metadata CSV
- field recorder report

Staged now:
- deterministic delivery folder layout
- generated payload files
- deferred JSON descriptors for writer-only binary artifacts
- `staging-summary.json`

Handoff, compatibility, and package outputs now:
- deferred writer-input contracts
- delivery handoff manifests and summaries
- external execution manifests, index files, summaries, deferred input exports, and checksums
- executor profile resolution, compatibility reports, and compatibility summaries
- writer-adapter dry-run outputs
- writer-runner requests, responses, and receipts
- transport envelopes, dispatch records, audit logs, and history
- filesystem dispatch bundles
- receipt compatibility metadata, normalization results, and receipt-ingestion audit/history updates

Deferred behind a future writer:
- Nuendo-ready AAF output
- reference video binary handoff
- any native Nuendo session/project output

## Fixture Library

The repo currently includes these intake fixtures:
- `fixtures/intake/rvr-203-r3`
- `fixtures/intake/rvr-204-edl-only`
- `fixtures/intake/rvr-205-aaf-only`
- `fixtures/intake/rvr-206-aaf-vs-fcpxml`
- `fixtures/intake/rvr-207-aaf-missing-media`
- `fixtures/intake/rvr-208-aaf-mob-graph`
- `fixtures/intake/rvr-209-aaf-partial-fallback`

These fixtures exercise:
- FCPXML-first timeline hydration
- EDL fallback hydration
- direct AAF parsing
- AAF-vs-FCPXML reconciliation
- missing media
- broader mob/slot/media-descriptor coverage
- explicit compatibility fallback diagnostics

Imported fixture data is primary when available. Deterministic mock data is only fallback when the fixture library is absent.

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

## Phase History

### Phase 1
Scaffold-only shell, docs, typed model, routes, and deterministic mock fallback.

### Phase 2A
Real folder scanning plus metadata CSV, marker CSV, `manifest.json`, and simple EDL intake analysis.

### Phase 2B
Delivery planning moved out of importer and into `exporter.ts`.

### Phase 2C
FCPXML/XML became the primary timeline source when present.

### Phase 2D
AAF ingestion and reconciliation landed.

### Phase 2E
AAF-derived ingest became richer for composition, slot, media, fade, and missing-media detail.

### Phase 2F
Binary/container-aware AAF extraction boundary was added.

### Phase 2G
Direct in-repo AAF container graph parsing landed, with fallback retained.

### Phase 2H
Direct AAF coverage expanded across broader mob/slot/locator/media-descriptor layouts.

### Phase 2I
Operator mapping editors and validation workflow became usable.

### Phase 2J
Browser-local persisted review-state deltas and reconform review persistence landed.

### Phase 2K
Remaining AAF fallback dependence was reduced.

### Phase 3A
Delivery execution prep began for safe serializable artifacts.

### Phase 3B
Generated payloads began materializing into staged bundle layouts.

### Phase 3C
Deferred-writer handoff contracts and readiness summaries were formalized.

### Phase 3D
Staged and handoff outputs began exporting as deterministic external execution packages.

### Phase 3E
Writer-adapter interfaces, capability matching, and dry-run validation were formalized.

### Phase 3F
Writer-runner requests, responses, and receipts were formalized.

### Phase 3G
Transport envelopes, dispatch records, audit logs, and history were formalized.

### Phase 3H
Filesystem transport adapter packaging and deterministic receipt ingestion landed.

### Phase 3I
Receipt compatibility profiles, normalization, migration, and stronger matching/replay safety landed.

### Phase 3J
Executor/package compatibility validation landed on top of packaged output, handoff contracts, transport profiles, and receipt expectations. Filesystem transport remains the primary real path, and additional transport profiles were intentionally deferred.

## Known Limitations

- No Nuendo writer exists yet.
- No backend, queue, auth, billing, or database exists.
- Browser-local review persistence is single-machine only.
- Some AAF layouts still require compatibility fallback payloads.
- Receipt compatibility currently covers canonical filesystem receipts, compatibility filesystem receipts, and a future-placeholder profile only.
- Only the filesystem transport adapter is real. Other transport paths remain future work.
- Executor compatibility currently targets canonical and compatibility filesystem executor profiles plus a future placeholder profile.
- No additional transport adapter or transport profile was added in Phase 3J because the current filesystem path already covers the real deterministic boundary cleanly.
- Writer adapters and runners are still reference/no-op or placeholder implementations.
- Binary outputs remain deferred contracts, not generated native files.

## Next Recommended Work

`Phase 3K` should stay sample-driven:
- add executor/profile variants only when a real external executor requires them
- keep filesystem transport as the primary deterministic path unless a new transport path can consume the same normalized contracts cleanly
- continue tightening receipt/profile/version compatibility without introducing a backend or queue
- keep native Nuendo writing deferred until the external execution boundary is proven stable

## Key Root Docs

- `PRODUCT.md`: product contract and current scope
- `SCHEMA.md`: layered model and contract entities
- `BUNDLE_SPEC.md`: intake, delivery, staging, and handoff bundle expectations
- `TASKLIST.md`: roadmap and current phase status
- `AGENTS.md`: contributor/agent rules for working in this repo
