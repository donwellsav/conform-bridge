# Tasklist

## Current Roadmap Position
- Current phase: `Phase 3D` complete.
- Next phase: `Phase 3E` writer-adapter prep on top of packaged external execution output.
- Ongoing compatibility work: keep shrinking remaining AAF fallback cases when new production samples justify it.

## Phase 1 Scaffold
- [x] Write product, schema, bundle, agent, and task specs.
- [x] Scaffold Next.js App Router with TypeScript, Tailwind CSS, and shadcn/ui-style primitives.
- [x] Add `src/lib/types.ts` and realistic mock workflow data.
- [x] Build dark desktop shell with sidebar and top bar.
- [x] Add Dashboard, New Job, Jobs, Templates, Field Recorder, ReConform, and Settings routes.
- [x] Keep the repo frontend-only with deterministic SSR-safe rendering.

## Phase 2
- [x] Replace placeholder bundle review with real CSV/manifest/EDL intake analysis.
- [x] Replace placeholder output cards with real Nuendo delivery planning.
- [x] Make FCPXML/XML parsing the active intake milestone and primary timeline source when present.
- [x] Add structured AAF parsing as the next intake milestone after FCPXML/XML.
- [x] Deepen AAF ingestion beyond text-dump fixtures into richer composition, mob, and media reference parsing.
- [x] Add binary/container-aware AAF extraction from real files with a stable external AAF-derived adapter fallback.
- [x] Add direct in-repo AAF container graph parsing while keeping adapter fallback as a compatibility path.
- [x] Expand direct AAF container parsing into broader composition mob, slot, source mob, locator, descriptor, and transition traversal while reducing adapter fallback dependence.
- [x] Add richer mapping editors for tracks, markers, metadata, and field recorder candidates.
- [x] Add validation rules that inspect real turnover completeness and delivery blockers.
- [x] Persist operator review deltas locally in the browser without duplicating the imported canonical model.
- [x] Add saved validation acknowledgements and reconform-ready review decisions on top of imported analysis.
- [x] Broaden direct AAF parsing beyond current in-repo graph payload coverage toward more arbitrary real-world OLE/AAF layouts.
- [x] Reduce `.adapter` compatibility fallback dependence for more real-world AAF layouts while keeping compatibility fallback available.
- [x] Prepare delivery execution behind a separate execution-prep boundary after planning.
- [ ] Keep reducing unsupported AAF edge cases only when real containers still require compatibility fallback.

## Phase 3
- [x] Generate safe serializable delivery artifacts from planned outputs: manifest, README, marker CSV, marker EDL, metadata CSV, and field recorder report.
- [x] Keep binary AAF and reference-video outputs deferred behind a future writer boundary.
- [x] Materialize generated execution-prep payloads into a staged delivery folder structure.
- [x] Define stable writer inputs for deferred binary artifacts without implementing native Nuendo session writing yet.
- [x] Define delivery handoff/export contracts for staged bundle output without collapsing planning, execution prep, and writing.
- [x] Package staged output plus handoff contracts for external execution without implementing native Nuendo/session writing.
- [ ] Formalize writer adapter interfaces that consume the current external execution package and deferred writer-input contracts.
- [ ] Implement real Nuendo/session writing only after staged delivery execution is proven stable.
