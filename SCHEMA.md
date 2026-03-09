# Conform Bridge Schema

## Layer 1: Intake Package

### SourceBundle
Represents the inbound package received from Resolve or picture editorial.
- `id`
- `name`
- `stage` = `intake`
- `receivedFrom`
- `sequenceName`
- `pictureLock`
- `fps`
- `startTimecode`
- `startFrame`
- `durationTimecode`
- `durationFrames`
- `trackCount`
- `clipCount`
- `markerCount`
- `sampleRate`
- `handlesFrames`
- `dropFrame`
- `assets`

### IntakeAsset
Represents one inbound file or production-audio element.
- `id`
- `bundleId`
- `stage` = `intake`
- `origin`
- `fileKind`
- `fileRole`
- `name`
- `sizeLabel`
- `status`
- `note`
- `channelCount`
- `channelLayout`
- `durationTimecode`
- `durationFrames`
- `sampleRate`
- `isPolyWav`
- `hasBwf`
- `hasIXml`

## Layer 2: Canonical Normalized Model

### TranslationModel
Canonical normalized project model produced from intake analysis.
- `id`
- `jobId`
- `sourceBundleId`
- `workflow`
- `name`
- `primaryTimelineId`
- `normalizedTimelineIds`
- `analysisReportId`
- `deliveryPackageId`

### CanonicalProject
Alias of `TranslationModel`. Both names refer to the same canonical layer.

### NormalizedTimeline
Normalized timeline representation used by translation and delivery planning.
- `id`
- `translationModelId`
- `name`
- `fps`
- `sampleRate`
- `dropFrame`
- `startTimecode`
- `durationTimecode`
- `startFrame`
- `durationFrames`
- `trackIds`
- `markerIds`

### NormalizedTrack
Normalized track representation.
- `id`
- `timelineId`
- `name`
- `role`
- `index`
- `channelLayout`
- `clipEventIds`

### ClipEvent
Normalized event with both timecode and frame-domain values.
- `id`
- `timelineId`
- `trackId`
- `sourceAssetId`
- `clipName`
- `sourceFileName`
- `reel`
- `tape`
- `scene`
- `take`
- `eventDescription`
- `clipNotes`
- `recordIn`
- `recordOut`
- `sourceIn`
- `sourceOut`
- `recordInFrames`
- `recordOutFrames`
- `sourceInFrames`
- `sourceOutFrames`
- `channelCount`
- `channelLayout`
- `isPolyWav`
- `hasBwf`
- `hasIXml`
- `isOffline`
- `isNested`
- `isFlattened`
- `hasSpeedEffect`
- `hasFadeIn`
- `hasFadeOut`

### Marker
Normalized marker event.
- `id`
- `timelineId`
- `name`
- `timecode`
- `frame`
- `color`
- `note`

### AnalysisReport
Canonical analysis summary for operator review.
- `id`
- `jobId`
- `translationModelId`
- `updatedOn`
- `totals.trackCount`
- `totals.clipCount`
- `totals.markerCount`
- `totals.offlineAssetCount`
- `highRiskCount`
- `warningCount`
- `blockedCount`
- `intakeCompletenessSummary`
- `deliveryReadinessSummary`
- `groups`

### MappingProfile
Operator-editable review state layered on top of the canonical model.
- `id`
- `jobId`
- `trackMappings`
- `metadataMappings`
- `timecodePolicy`
- `fieldRecorderOverrides`

### FieldRecorderCandidate
Potential production-audio relink target derived from canonical clip metadata and intake coverage.
- `id`
- `jobId`
- `clipEventId`
- `matchKeys`
- `status`
- `candidateAssetName`
- `note`

### MappingRule
Operator-visible mapping decision in the canonical layer.
- `id`
- `jobId`
- `scope`
- `source`
- `target`
- `action`
- `status`
- `note`

### PreservationIssue
Granular preservation result used in the analysis report.
- `id`
- `jobId`
- `category` = `preserved | downgraded | dropped | manual-review`
- `severity`
- `scope`
- `title`
- `description`
- `sourceLocation`
- `impact`
- `targetArtifactId`
- `targetArtifactName`
- `recommendedAction`
- `requiresDecision`
- `affectedItems`

### ReConformChange
Minimal canonical change-event record for revision workflows.
- `id`
- `jobId`
- `changeType` = `insert | delete | move | trim | replace`
- `oldTimecode`
- `newTimecode`
- `oldFrame`
- `newFrame`
- `note`

### ConformChangeEvent
Alias of `ReConformChange`.

## Layer 3: Delivery Package

### DeliveryPackage
Represents the planned outbound package for Nuendo.
- `id`
- `jobId`
- `stage` = `delivery`
- `destination`
- `outputPresetId`
- `name`
- `includeReferenceVideo`
- `includeHandles`
- `deliverySummary`
- `artifacts`

### DeliveryArtifact
Represents one planned output file.
- `id`
- `deliveryPackageId`
- `jobId`
- `stage` = `delivery`
- `origin`
- `fileKind`
- `fileRole`
- `fileName`
- `status`
- `note`

## Layer 4: Delivery Handoff Contracts

### DeferredWriterInput
Stable machine-readable contract set for deferred writer-only artifacts.
- `version`
- `id`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `artifacts`

### DeferredWriterArtifact
Deferred artifact contract with readiness and dependency detail.
- `artifactId`
- `deferredDescriptorPath`
- `artifactKind`
- `fileName`
- `fileRole`
- `fileKind`
- `artifactStatus`
- `plannedOutputPath`
- `requiredWriterCapability`
- `readinessStatus`
- `explanation`
- `blockers`
- `dependencies`
- `payload`

### WriterDependency
Explicit prerequisite or blocker for a deferred writer artifact.
- `id`
- `type`
- `label`
- `reference`
- `status`
- `required`
- `reason`

### DeliveryHandoffManifest
Structured summary that links staged outputs to deferred-writer contracts.
- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `stagingRoot`
- `reviewInfluence`
- `generatedArtifacts`
- `deferredArtifacts`
- `blockedArtifacts`

### DeliveryHandoffSummary
Aggregate readiness summary for the current handoff state.
- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `stagedArtifactCount`
- `deferredArtifactCount`
- `blockedArtifactCount`
- `readyForWriterCount`
- `partialCount`
- `deferredWithKnownGapsCount`
- `readinessStatus`
- `unresolvedBlockers`
- `note`

## Orchestration Entity

### TranslationJob
Operator-facing record that ties the three layers together.
- `id`
- `jobCode`
- `title`
- `status`
- `priority`
- `workflow`
- `sourceBundleId`
- `translationModelId`
- `deliveryPackageId`
- `templateId`
- `outputPresetId`
- `analysisReportId`
- `createdOn`
- `updatedOn`
- `notes`

## Direction Rules
- File direction is determined by `stage` and `origin`.
- `fileKind` describes the concrete format only.
- `fileRole` describes the artifact purpose only.
- The same `fileKind` may appear in intake or delivery.
- The same `fileRole` may appear in intake or delivery.

## Relationships
- One `TranslationJob` references one `SourceBundle`, one `TranslationModel`, one `AnalysisReport`, and one `DeliveryPackage`.
- One `SourceBundle` contains many `IntakeAsset` records.
- One `TranslationModel` contains one or more `NormalizedTimeline` records.
- One `NormalizedTimeline` contains many `NormalizedTrack`, `ClipEvent`, and `Marker` records.
- One `TranslationJob` contains one `MappingProfile` and may contain many `MappingRule` and `FieldRecorderCandidate` records.
- One `AnalysisReport` contains many `PreservationIssue` records grouped for operator review.
- One `DeliveryPackage` contains many `DeliveryArtifact` records.
- One `DeliveryPackage` may produce one `DeliveryExecutionPlan`, one `DeliveryStagingBundle`, and one `DeliveryHandoffManifest` in downstream non-writer layers.
- One `DeliveryHandoffManifest` references one `DeferredWriterInput` document containing many `DeferredWriterArtifact` contracts.
- One `TranslationJob` may contain many `ConformChangeEvent` records.

## Current Repo Rules
- IDs are fixed string literals.
- Dates are fixed strings.
- The repo prefers real fixture imports and falls back to deterministic mock data only when the fixture library is absent.
- Canonical timeline precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- Operator mapping editors persist browser-local review deltas keyed by job plus source signature.
- Types must support real intake analysis, canonical review, delivery planning, execution prep, staging, and deferred writer contracts without implying that a Nuendo writer already exists.
