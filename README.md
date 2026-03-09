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

- Current phase: `Phase 3J` complete
- Next phase: `Phase 3K`
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

Classified but not deeply parsed:

- `bwf` / `wav`
- `mov` / `mp4`

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
- broader mob, slot, locator, and media-descriptor coverage
- explicit compatibility fallback diagnostics

Imported fixture data is primary when available. Deterministic mock data is
only fallback when the fixture library is absent.

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

`Phase 3K` should stay sample-driven:

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
