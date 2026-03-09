# Tasklist

## Current Roadmap Position
- Current phase: `Phase 2I` complete.
- Next phase: `Phase 2J` persist operator review state and deepen reconform-ready review tools.
- Following phase: `Phase 2K` continue reducing AAF compatibility fallback dependence.

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
- [ ] Persist operator mapping edits and validation acknowledgements beyond the current in-memory review session.
- [ ] Broaden direct AAF parsing beyond current in-repo graph payload coverage toward more arbitrary real-world OLE/AAF layouts.
- [ ] Deepen reconform-ready review once saved mapping state exists.
