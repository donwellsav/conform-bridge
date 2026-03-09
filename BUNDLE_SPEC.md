# Bundle Spec

## Purpose
Conform Bridge models two distinct packages around one canonical internal layer:
- Intake Package: what arrives from Resolve and editorial.
- Delivery Package: what Conform Bridge plans, stages, and prepares for handoff to Nuendo.

Direction must be represented explicitly. Do not infer inbound versus outbound from file kind alone.

## Direction Contract
- `stage` determines whether an asset belongs to intake or delivery.
- `origin` records who created or supplied the asset.
- `fileKind` describes the format only.
- `fileRole` describes the purpose only.

## Intake Package
Modeled by `SourceBundle` and `IntakeAsset`.

### Intake expectations
A realistic intake package may include:
- `AAF`
- `FCPXML` or generic `XML`
- `EDL`
- `metadata CSV`
- `reference video`
- `production audio` assets such as `BWF`, `WAV`, or polywav rolls

### Intake examples
- `SHOW_203_LOCK.aaf`
- `SHOW_203_LOCK.fcpxml`
- `SHOW_203_AUDIO_PULL.edl`
- `SHOW_203_METADATA.csv`
- `SHOW_203_REF.mov`
- `ROLL_054A_01.BWF`
- `ROLL_054A_LAV.WAV`

### Intake status values
- `present`
- `missing`
- `placeholder`

## Delivery Package
Modeled by `DeliveryPackage` and `DeliveryArtifact`.

### Delivery expectations
A planned Nuendo delivery package may include:
- `Nuendo-ready AAF`
- `marker EDL`
- `marker CSV`
- `metadata CSV`
- `manifest.json`
- `README import instructions`
- `reference video`
- `field recorder matching report`

### Delivery examples
- `SHOW_203_NUENDO_READY.aaf`
- `SHOW_203_MARKERS.edl`
- `SHOW_203_MARKERS.csv`
- `SHOW_203_METADATA.csv`
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- `SHOW_203_REF.mov`
- `SHOW_203_FIELD_RECORDER_REPORT.csv`

### Delivery status values
- `planned`
- `blocked`
- `placeholder`

## Downstream Delivery Layers
The delivery side now has six explicit downstream layers after canonical normalization:
- Delivery planning in `exporter.ts`
- Delivery execution prep in `delivery-execution.ts`
- Delivery staging and handoff contract generation in `delivery-staging.ts` and `delivery-handoff.ts`
- External execution packaging in `external-execution-package.ts`
- Writer-adapter validation and dry-run matching in `writer-adapters.ts`
- Writer-runner request, response, and receipt generation in `writer-runner.ts`
- Writer-run transport and audit generation in `writer-run-transport.ts`
- Writer-run transport adapter packaging in `writer-run-transport-adapters.ts`
- Writer-run receipt ingestion in `writer-run-receipt-ingestion.ts`

These layers must stay separate. Planning does not generate files, execution prep only generates safe serializable payloads, staging only materializes staged bundle outputs, handoff only formalizes deferred-writer contracts, external package export only bundles staged output plus handoff metadata for downstream execution, writer adapters only validate packaged deferred contracts plus dry-run capability matches, writer runners only generate runnable contracts plus deterministic no-op receipts, writer-run transport only packages post-runner output into external dispatch/audit contracts, transport adapters only package deterministic outbound dispatch bundles, and receipt ingestion only imports deterministic inbound receipt JSON back into normalized audit/history state.

## Shared File Kinds
The following file kinds may appear on either side of the workflow depending on `stage` and `origin`:
- `aaf`
- `xml`
- `fcpxml`
- `edl`
- `csv`
- `mov`
- `mp4`
- `json`
- `txt`
- `wav`
- `bwf`
- `otio`
- `otioz`

## Shared Roles That Need Explicit Direction
The following roles may appear as intake or delivery artifacts depending on the workflow context:
- `timeline_exchange`
- `marker_export`
- `metadata_export`
- `reference_video`
- `production_audio`
- `field_recorder_report`

## Explicit Rule About Manifests, Readmes, And Reports
- `manifest.json`, delivery `README`, and delivery `field recorder report` are outbound delivery artifacts by default.
- They must not be modeled as intake assets unless `stage` and `origin` explicitly mark them as inbound for a real workflow reason.
- The current repo keeps them in the delivery package unless a future real workflow explicitly requires inbound handling.

## Required Facts Surfaced In The UI
- Intake package name and sequence name
- Frame rate, sample rate, start timecode, and handles expectation
- Track, clip, and marker totals from the canonical model
- Intake completeness summary
- Delivery readiness summary
- Planned delivery artifact states
- Generated execution-prep payload state
- Staged bundle paths and deferred descriptor records
- Deferred writer-input readiness, dependencies, and blockers
- External package status, checksums, generated-artifact indexes, and packaged entry paths
- Writer-adapter matches, dry-run readiness, and unsupported reasons for deferred artifacts
- Writer-runner requests, responses, receipts, and runnable-versus-blocked deferred artifact state
- Writer-run transport envelopes, dispatch records, correlation ids, retry/cancel state, and audit history
- Transport adapter readiness, outbound dispatch package roots, and generated dispatch payloads
- Receipt-ingestion results, matched-vs-unmatched receipt state, and post-ingestion audit/history summaries

## Current Parser Coverage
The current repo scans real local fixture folders and parses these intake formats:
- `fcpxml/xml`
- `aaf`
- `edl`
- `metadata csv`
- `marker csv`
- `manifest.json`

Timeline precedence is:
1. `fcpxml/xml`
2. `aaf`
3. `edl`
4. metadata-only fallback

## Known Limitations
- No Nuendo write path exists yet.
- Operator review persistence is browser-local only.
- Some AAF layouts still require compatibility fallback payloads.
- Generated text/JSON/CSV artifacts can be staged and written through the staging helper, but binary writer artifacts remain deferred.
- Deferred-writer contracts are formalized, but no writer executes them yet.
- External execution packages can now be written to disk for downstream runners, but native Nuendo writing still does not exist.
- Writer adapters currently validate and dry-run packaged deferred contracts, but only the reference no-op adapter is implemented; future AAF/reference-video adapters remain placeholders.
- Writer runners currently emit deterministic no-op requests, responses, and receipts, but only the reference no-op runner is implemented; no native writer execution exists yet.
- Writer-run transport currently emits deterministic transport envelopes, acknowledgements, and audit history, but still depends on a no-op runner outcome and does not execute native binaries.
- The first real external transport adapter is filesystem-based only; no network/service-backed dispatch adapter exists yet.
- Receipt ingestion is filesystem-based and deterministic; no backend receipt service or async queue exists.

No Nuendo write path, fake backend processing, or binary file write-back behavior should be implied by the current repo.
