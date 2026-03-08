# Conform Bridge Schema

## Core Entities

### TranslationJob
Operator-facing record for one Resolve to Nuendo translation attempt.
- `id`
- `jobCode`
- `title`
- `status`
- `priority`
- `sourceBundleId`
- `timelineId`
- `outputPresetId`
- `createdOn`
- `updatedOn`
- `notes`

### SourceBundle
Logical intake package from picture editorial.
- `id`
- `name`
- `timelineId`
- `pictureLock`
- `fps`
- `startTimecode`
- `sampleRate`
- `handlesFrames`
- `dropFrame`
- `assets`

### SourceAsset
Discrete asset inside a bundle.
- `id`
- `bundleId`
- `kind`
- `name`
- `status`
- `sizeLabel`
- `note`

### Timeline
Imported Resolve timeline summary.
- `id`
- `bundleId`
- `name`
- `fps`
- `startTimecode`
- `durationTimecode`
- `trackIds`
- `markerIds`

### Track
Timeline track summary.
- `id`
- `timelineId`
- `name`
- `role`
- `index`
- `channelLayout`
- `clipEventIds`

### ClipEvent
Timeline event summary.
- `id`
- `trackId`
- `sourceAssetId`
- `clipName`
- `recordIn`
- `recordOut`
- `sourceTimecode`
- `scene`
- `take`

### Marker
Resolve marker metadata.
- `id`
- `timelineId`
- `name`
- `timecode`
- `color`
- `note`

### FieldRecorderCandidate
Potential production audio relink target.
- `id`
- `jobId`
- `clipEventId`
- `matchKeys`
- `status`
- `candidateAssetName`
- `note`

### MappingRule
Rule or decision that maps source structure to Nuendo structure.
- `id`
- `jobId`
- `scope`
- `source`
- `target`
- `action`
- `status`
- `note`

### PreservationIssue
Operator-visible preservation risk or informational note.
- `id`
- `jobId`
- `severity`
- `scope`
- `title`
- `description`
- `impact`
- `recommendation`

### OutputPreset
Reusable template for how a Nuendo-ready bundle should be shaped.
- `id`
- `name`
- `category`
- `description`
- `destinationLabel`
- `includeReferenceVideo`
- `includeHandles`
- `fieldRecorderEnabled`

### ExportArtifact
Planned output artifact for a translation job.
- `id`
- `jobId`
- `kind`
- `fileName`
- `status`
- `note`

## Relationships
- One `TranslationJob` references one `SourceBundle`, one `Timeline`, and one `OutputPreset`.
- One `SourceBundle` contains many `SourceAsset` records.
- One `Timeline` contains many `Track` and `Marker` records.
- One `Track` contains many `ClipEvent` records.
- One `TranslationJob` contains many `MappingRule`, `FieldRecorderCandidate`, `PreservationIssue`, and `ExportArtifact` records.

## Phase 1 Rules
- IDs are fixed string literals.
- Dates are fixed strings.
- Counts are precomputed in mock data.
- Types must support UI inspection without any real parser or writer implementation.
