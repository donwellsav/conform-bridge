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
The delivery side now has three explicit downstream layers after canonical normalization:
- Delivery planning in `exporter.ts`
- Delivery execution prep in `delivery-execution.ts`
- Delivery staging and handoff contract generation in `delivery-staging.ts` and `delivery-handoff.ts`
- External execution packaging in `external-execution-package.ts`

These layers must stay separate. Planning does not generate files, execution prep only generates safe serializable payloads, staging only materializes staged bundle outputs, handoff only formalizes deferred-writer contracts, and external package export only bundles staged output plus handoff metadata for downstream execution.

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

No Nuendo write path, fake backend processing, or binary file write-back behavior should be implied by the current repo.
