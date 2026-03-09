# Bundle Spec

## Purpose
Conform Bridge models two distinct packages around one canonical internal layer:
- Intake Package: what arrives from Resolve and editorial.
- Delivery Package: what Conform Bridge plans to hand off for Nuendo.

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

## Current Constraint
Intake packages are real local fixture folders scanned from disk, and the importer now performs real parsing for manifest JSON, metadata CSV, marker CSV, simple EDL, FCPXML/XML, and richer AAF-derived fixtures.

Delivery packages remain planning-only. No Nuendo write path, fake backend processing, or file write-back behavior should be implied by the current repo.
