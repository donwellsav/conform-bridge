# Tasklist

## Current Roadmap Position
- Current phase: `Phase 3J` complete
- Next phase: `Phase 3K` external executor/profile expansion only when it preserves the current layered contracts
- Ongoing parser work: reduce remaining AAF compatibility fallback only when real samples justify broader direct coverage

## Phase 1
- [x] Define product, schema, bundle, task, and agent contracts
- [x] Scaffold Next.js App Router with TypeScript, Tailwind, and reusable UI primitives
- [x] Build the desktop-first operator shell and route set
- [x] Add deterministic mock fallback for SSR-safe first render

## Phase 2
- [x] Implement real intake scanning and CSV/manifest/EDL parsing
- [x] Move delivery planning into `exporter.ts`
- [x] Make FCPXML/XML the primary timeline source when present
- [x] Add structured AAF ingestion and reconciliation
- [x] Deepen AAF parsing beyond text-dump fixtures
- [x] Add binary/container-aware AAF extraction
- [x] Add direct in-repo AAF container graph parsing
- [x] Expand direct AAF parsing across broader mob/slot/source/locator/media-descriptor coverage
- [x] Reduce AAF compatibility fallback dependence while keeping fallback available
- [x] Add operator mapping editors for track, marker, metadata, and field recorder review
- [x] Add validation rules for intake completeness and delivery blockers
- [x] Persist operator review deltas locally in the browser
- [x] Add saved validation acknowledgements and reconform review decisions
- [ ] Continue reducing unsupported AAF edge cases only when real production samples require it

## Phase 3
- [x] Add delivery execution prep for safe serializable artifacts
- [x] Keep binary AAF and reference-video outputs deferred behind a writer boundary
- [x] Materialize staged delivery bundles
- [x] Formalize deferred writer-input handoff contracts
- [x] Export deterministic external execution packages
- [x] Formalize writer-adapter interfaces and dry-run readiness
- [x] Define writer-runner requests, responses, and receipts
- [x] Formalize transport envelopes, dispatch records, audit logs, and history
- [x] Add a real filesystem transport adapter
- [x] Add deterministic receipt ingestion
- [x] Deepen receipt compatibility, normalization, migration, and replay safety
- [x] Harden executor/package compatibility rules without introducing a backend or queue
- [ ] Add optional additional transport adapters or executor profiles only when a real external executor requires them and the current layered contracts remain intact
- [ ] Keep native Nuendo/session writing out of scope until the external execution boundary is proven stable

## Current Focus For Phase 3K
- Keep executor compatibility sample-driven instead of speculative
- Add new executor or transport profiles only when they consume the current normalized package, handoff, runner, and receipt contracts unchanged
- Preserve deterministic package/signature matching across source revisions and saved review-state changes
- Keep filesystem transport as the default real path until another path proves it can stay equally deterministic and testable
