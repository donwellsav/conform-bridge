# Bundle Spec

## Purpose

Conform Bridge models:

- an intake package from Resolve, editorial, and production audio
- a canonical normalized translation layer
- a delivery package planned for Nuendo handoff
- downstream generated, staged, handoff, package, transport, and receipt
  artifacts derived from that delivery package

Direction must be modeled explicitly. File kind alone never determines inbound
vs outbound direction.

## Direction Contract

- `stage` identifies intake vs delivery
- `origin` identifies who supplied or generated the artifact
- `fileKind` identifies the format
- `fileRole` identifies the purpose

## Intake Package

Modeled by `SourceBundle` and `IntakeAsset`.

Typical intake contents:

- `AAF`
- `FCPXML` or generic `XML`
- `EDL`
- metadata CSV
- marker CSV
- `manifest.json`
- reference video
- production-audio rolls such as `BWF`, `WAV`, or polywav

Typical intake examples:

- `SHOW_203_LOCK.aaf`
- `SHOW_203_LOCK.fcpxml`
- `SHOW_203_AUDIO_PULL.edl`
- `SHOW_203_METADATA.csv`
- `SHOW_203_MARKERS.csv`
- `manifest.json`
- `SHOW_203_REF.mov`
- `ROLL_054A_01.BWF`

Intake status values:

- `present`
- `missing`
- `placeholder`

## Delivery Package

Modeled by `DeliveryPackage` and `DeliveryArtifact`.

Typical planned delivery contents:

- Nuendo-ready AAF
- marker EDL
- marker CSV
- metadata CSV
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- reference video
- field recorder report

Typical delivery examples:

- `SHOW_203_NUENDO_READY.aaf`
- `SHOW_203_MARKERS.edl`
- `SHOW_203_MARKERS.csv`
- `SHOW_203_METADATA.csv`
- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- `SHOW_203_REF.mov`
- `SHOW_203_FIELD_RECORDER_REPORT.csv`

Delivery status values:

- `planned`
- `blocked`
- `placeholder`

## Generated Outputs

Generated safely now:

- `manifest.json`
- `README_NUENDO_IMPORT.txt`
- marker CSV
- marker EDL
- metadata CSV
- field recorder report

These outputs are generated during execution prep and can be staged and
packaged deterministically today.

## Deferred Outputs

Deferred now:

- delivery AAF
- reference video binary handoff
- any future native Nuendo session or project output

Deferred artifacts remain contract-only. The repo does not fake binary payloads.

## Derived Delivery Layers

After planning, delivery artifacts may also appear in these deterministic
forms:

1. execution-prep payloads
2. staged bundle files and deferred descriptors
3. deferred-writer handoff contracts
4. external execution package files
5. writer-adapter dry-run outputs
6. writer-runner requests, responses, and receipts
7. transport envelopes, dispatch records, audit logs, and history
8. filesystem transport dispatch bundles
9. receipt compatibility metadata, normalized receipt envelopes, and
   receipt-ingestion audit/history outputs
10. executor profile resolution, package compatibility reports, and executor
    compatibility summaries

These are derived layers, not replacements for the delivery package model.

## Deterministic Staged Layout

The staged delivery layout is deterministic and currently shaped like:

```text
<sequence-or-job>/
  manifest.json
  README_NUENDO_IMPORT.txt
  markers/
    <sequence>_MARKERS.csv
    <sequence>_MARKERS.edl
  metadata/
    <sequence>_METADATA.csv
  reports/
    <sequence>_FIELD_RECORDER_REPORT.csv
  deferred/
    <sequence>_NUENDO_READY.aaf.deferred.json
    <sequence>_REFERENCE_VIDEO.deferred.json
  staging-summary.json
```

## External Package And Transport Outputs

The external execution package preserves staged and handoff outputs and adds:

- `package/external-execution-manifest.json`
- `package/external-execution-index.json`
- `package/external-execution-summary.json`
- `package/generated-artifact-index.json`
- `package/deferred-writer-inputs.json`
- `package/checksums.json`

Filesystem transport currently emits deterministic outbound dispatch bundles
under:

- `transport/<job>/outbound/<dispatch-id>/...`

Receipt ingestion currently reads deterministic inbound receipt JSON from:

- `transport/<job>/inbound/*.json`

Executor compatibility currently emits deterministic handoff-side reports such
as:

- `handoff/executor-profile-resolution.json`
- `handoff/executor-compatibility-report.json`
- `handoff/executor-compatibility-summary.json`

## Shared File Kinds

These file kinds may appear on either side depending on `stage` and `origin`:

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

These roles may appear on intake or delivery sides:

- `timeline_exchange`
- `marker_export`
- `metadata_export`
- `reference_video`
- `production_audio`
- `field_recorder_report`

## Explicit Manifest / README / Report Rule

- `manifest.json`, delivery README, and delivery field recorder reports are
  outbound by default
- they should not be modeled as intake assets unless `stage` and `origin`
  explicitly justify it
- the current repo keeps them on the delivery side

## Required Facts Surfaced In The UI

- intake package identity and sequence label
- frame rate, sample rate, start timecode, and handles expectation
- canonical track, clip, and marker totals
- intake completeness and delivery readiness summaries
- delivery artifact statuses
- generated vs deferred execution-prep state
- staged bundle paths and deferred descriptors
- handoff readiness, dependency, and blocker detail
- external package status, checksums, and package indexes
- writer-adapter readiness and unsupported reasons
- writer-runner runnable vs blocked state
- transport dispatch and audit state
- transport-adapter and receipt-profile metadata
- receipt normalization, migration, duplicate, stale, superseded, and
  incompatible results

## Current Parser Coverage

Real fixture parsing currently exists for:

- `fcpxml/xml`
- `aaf`
- `edl`
- metadata CSV
- marker CSV
- `manifest.json`

Timeline precedence:

1. `fcpxml/xml`
2. `aaf`
3. `edl`
4. metadata-only fallback

## Known Limitations

- No native Nuendo write path exists yet.
- Browser-local review persistence is single-machine only.
- Some AAF layouts still require compatibility fallback payloads.
- Only the filesystem transport adapter is real.
- Executor compatibility currently targets canonical filesystem,
  compatibility filesystem, and future-placeholder executor profiles.
- No additional transport adapter or profile was added in the current phase
  because the existing filesystem path already preserves the layered contract
  cleanly.
- Receipt compatibility is currently limited to the defined
  filesystem-oriented profiles plus a future-placeholder profile.
- No backend, queue, or service transport exists.

Nothing in the current repo should imply native Nuendo writing, fake backend
processing, or fake binary generation.
