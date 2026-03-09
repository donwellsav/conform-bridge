# Conform Bridge

## Summary
Conform Bridge is a desktop-first internal operator application for Resolve to Nuendo translation workflows. The current repo state is beyond scaffold-only: the operator shell is stable, intake parsing is real for the supported fixture formats, delivery planning is real, and Nuendo file writing is still intentionally out of scope.

## Product Goal
Give post-production operators a clear review surface for three explicit workflow layers:
1. Intake package from Resolve and editorial.
2. Canonical normalized translation model inside Conform Bridge.
3. Delivery package planned for Nuendo.

## Workflow Shape
Resolve exports in -> canonical internal model -> Nuendo-ready delivery package out.

## Primary Users
- Post coordinators preparing turnovers.
- Assistant editors validating Resolve export packages.
- Dialogue and effects editors reviewing field recorder readiness.
- ReConform operators checking revision deltas before any real translation logic exists.

## Product Contract For This Phase
- `SourceBundle` is intake only.
- `TranslationModel` is the canonical normalized layer used by the app.
- `DeliveryPackage` is output planning only.
- Direction must be modeled explicitly with stage and origin metadata.
- File format alone must not imply whether an asset is inbound or outbound.
- FCPXML/XML is the preferred primary timeline source when present, followed by AAF, EDL, and metadata-only fallback.
- AAF is a structured intake source with direct in-repo container parsing: real `.aaf` files can now hydrate the canonical model directly or enrich and reconcile against FCPXML/XML, while adapter fallback remains available for compatibility.
- CSV, manifest, marker CSV, and simple EDL parsing remain active enrichment and fallback inputs.
- Operator-facing mapping editors and validation rules sit on top of the imported canonical model without changing the intake -> canonical -> delivery split.
- Saved operator review state is layered as local browser deltas keyed by job plus source signature. The imported canonical model itself is not duplicated into browser storage.
- Delivery execution prep is a separate boundary after planning. It may generate safe JSON, text, and CSV payloads, but it must not write native Nuendo session/project files in this phase.
- Delivery staging is a separate boundary after execution prep. It may materialize generated payloads into a deterministic staged bundle layout and deferred descriptor records, but it must not write native Nuendo session/project files in this phase.
- Delivery handoff is a separate boundary after staging. It may formalize stable writer-input contracts, readiness states, and dependency graphs for deferred artifacts, but it must not write native Nuendo session/project files in this phase.
- External execution packaging is a separate boundary after handoff. It may bundle staged outputs, handoff contracts, checksums, and package metadata for external execution, but it must not write native Nuendo session/project files in this phase.

## Current Non-Goals
- No real Nuendo export writing.
- No auth, billing, database, or marketing site.
- No background jobs, queues, or fake API layer.

## UX Direction
- Dark, serious post-production desktop aesthetic.
- Dense but readable panels, tables, and inspectors.
- Navigation should feel like an internal operator tool, not a consumer SaaS dashboard.
- Routes should render meaningful placeholder content from stable mock data on first paint.

## Routes
- Dashboard
- Jobs
- New Job
- Templates
- Field Recorder
- ReConform
- Settings

## Current Deliverables
- Root spec files that define the layered workflow contract.
- Next.js App Router shell with TypeScript, Tailwind, and shadcn/ui-style reusable primitives.
- Shared `src/lib/types.ts` domain model with intake, canonical, and delivery entities.
- Real intake fixture scanning from `fixtures/intake/*`.
- Structured intake parsing for manifest JSON, metadata CSV, marker CSV, simple EDL, FCPXML/XML, and direct in-repo AAF container parsing with adapter fallback compatibility.
- Canonical analysis and reconciliation output through `src/lib/services/importer.ts`.
- Delivery artifact planning through `src/lib/services/exporter.ts`.
- Delivery execution prep through `src/lib/services/delivery-execution.ts` for artifacts that can already be generated safely.
- Delivery staging through `src/lib/services/delivery-staging.ts` for deterministic staged bundle layout and deferred descriptor materialization.
- Delivery handoff through `src/lib/services/delivery-handoff.ts` for deterministic deferred-writer contracts and handoff manifests.
- External execution packaging through `src/lib/services/external-execution-package.ts` for deterministic package export, indexing, and checksum generation on top of staged and handoff outputs.
- Operator mapping editors for track, marker, metadata, and field recorder review.
- Validation rules that merge intake completeness, reconciliation, and delivery-blocker findings into `PreservationIssue` records.
- Browser-local persistence for operator review deltas, validation acknowledgements, and reconform review decisions.
- Reconform-ready review with saved per-change acknowledgement state, notes, filters, and summary counts.
- Execution-prep previews that distinguish generated payloads from deferred binary artifacts.
- Staged bundle previews that show generated files, deferred descriptors, and staging summary output.
- Handoff previews that show deferred writer contracts, readiness, dependencies, and unresolved blockers.
- Imported-data-first routes with deterministic mock fallback only when no fixture library exists.

## Current AAF State
- Real `.aaf` files are detected through a binary/container-aware adapter boundary.
- Direct in-repo AAF container parsing now exists for supported fixture shapes.
- Stable AAF-derived adapter payloads remain available as a compatibility fallback when direct extraction does not cover a file.
- Legacy text-dump AAF fixtures remain supported as a fallback path for narrow tests and fixture maintenance.
- Nuendo project writing still does not exist.
- AAF and reference video outputs remain deferred binary artifacts, not generated files.

## Current Status
- `Phase 3D` is complete.
- Intake, canonical, and delivery layers are explicit in docs, types, routes, and tests.
- Operator-facing mapping and validation review is available on the Job Detail route.
- Operator review progress now persists locally in the browser as deltas over imported data.
- Delivery planning remains planning-only and does not write files.
- Delivery execution prep now generates deterministic manifest, README, marker CSV, marker EDL, metadata CSV, and field recorder report payloads from planned artifacts.
- Delivery staging now materializes those generated payloads into a deterministic staged bundle structure with deferred JSON descriptors for writer-only binary artifacts.
- Delivery handoff now formalizes deferred-writer inputs, delivery/review signatures, dependency graphs, and readiness status for deferred binary artifacts.
- External execution packaging now bundles staged outputs plus handoff contracts into a deterministic export package with checksums, package manifests, generated-artifact indexes, and package-level readiness status.
- Direct AAF parsing now covers the current embedded-graph and broader decoded-OLE fixture layouts first, while `.adapter` fallback remains a narrower compatibility path.

## Known Limitations
- No Nuendo writer exists yet.
- Operator review persistence is browser-local only; no backend or shared multi-user state exists.
- Some AAF layouts still require compatibility fallback payloads when the in-repo parser only partially covers the container graph.
- BWF/WAV and MOV/MP4 assets are classified, but not deeply parsed.
- Binary delivery artifacts still stop at deferred staged descriptors in this phase.
- Native Nuendo writer execution remains out of scope even though deferred writer inputs are now formalized.
- Native Nuendo writer execution remains out of scope even though external execution packages are now formalized.

## Next Recommended Work
- `Phase 3E`: formalize writer adapter interfaces that consume packaged external execution output and deferred writer inputs.
- Continue broadening direct AAF coverage only where new production samples still require compatibility fallback.
- Keep exporter planning and any future writer boundary strictly separate.

## Rendering Rules
- Initial render must be deterministic and SSR-safe.
- No browser-only APIs during initial render.
- No `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render paths.
- No page-wide client-only workaround patterns.
- Use client components only where interaction is required.

## Acceptance For This Task
- Repo builds cleanly and the current operator shell remains intact.
- Intake, canonical, and delivery layers are explicit in docs, types, and data composition.
- Real intake fixtures and parsers feed the canonical model without pretending that Nuendo export writing already exists.
- Mapping editors and validation rules accurately describe the current implementation state.
