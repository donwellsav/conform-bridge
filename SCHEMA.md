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

## Layer 5: External Execution Package

### ExternalExecutionPackage
Deterministic export bundle that packages staged outputs plus handoff contracts for downstream execution.
- `id`
- `version`
- `jobId`
- `deliveryPackageId`
- `rootFolderName`
- `rootRelativePath`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `status`
- `entries`
- `manifestJson`
- `indexJson`
- `summaryJson`
- `checksumsJson`
- `deferredInputsJson`
- `generatedArtifactIndexJson`
- `summary`

### ExternalExecutionEntry
One packaged file entry inside the external execution bundle.
- `relativePath`
- `fileName`
- `layer`
- `classification`
- `mimeType`
- `payloadKind`
- `content`
- `byteSize`
- `checksum`
- `summary`
- `artifactId`
- `artifactStatus`
- `fileRole`
- `fileKind`
- `writerReadinessStatus`

### ExternalExecutionManifest
Package-level manifest linking staged outputs, handoff files, and package readiness.
- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `packageStatus`
- `stagedRoot`
- `handoffRoot`
- `packageRoot`
- `generatedEntryCount`
- `deferredContractCount`
- `packageMetadataCount`
- `reasons`
- `note`

### ExternalExecutionIndex
Deterministic index of every packaged staged, handoff, and package metadata file.
- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `entries`

### ExternalExecutionChecksum
Deterministic checksum record for one packaged file.
- `relativePath`
- `algorithm`
- `value`
- `byteSize`

### ExternalExecutionDeferredInput
Export-friendly contract record for one deferred writer artifact inside the external package.
- `artifactId`
- `artifactKind`
- `relativePath`
- `plannedOutputPath`
- `readinessStatus`
- `requiredWriterCapability`
- `blockers`
- `dependencyIds`
- `payload`

### ExternalExecutionSummary
Package-level readiness summary for downstream external execution.
- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `packageStatus`
- `stagedEntryCount`
- `handoffEntryCount`
- `packageEntryCount`
- `generatedEntryCount`
- `deferredContractCount`
- `blockedDeferredCount`
- `totalEntryCount`
- `note`
- `reasons`

## Layer 6: Writer Adapter Contracts

### WriterAdapterInput
Normalized adapter-facing contract derived only from the packaged external execution bundle.
- `version`
- `id`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `packageRoot`
- `stagedRoot`
- `handoffRoot`
- `artifactInputs`

### WriterAdapterArtifactInput
Deferred artifact contract normalized for adapter capability matching and dry runs.
- `artifactId`
- `artifactKind`
- `fileName`
- `relativePath`
- `deferredDescriptorPath`
- `plannedOutputPath`
- `requiredWriterCapability`
- `packageStatus`
- `writerReadinessStatus`
- `blockers`
- `dependencyIds`
- `payload`

### WriterAdapter
Capability-based boundary that validates packaged deferred contracts and produces dry-run plans.
- `id`
- `version`
- `label`
- `capabilities`
- `validate(input)`
- `dryRun(input)`

### WriterAdapterValidationResult
Machine-readable readiness and unsupported-reason summary for one adapter against one packaged contract input.
- `adapterId`
- `readiness`
- `diagnostics`
- `supportedArtifactIds`
- `unsupportedReasons`

### WriterAdapterExecutionPlan
Deterministic dry-run plan for a matched adapter without performing binary generation.
- `adapterId`
- `readiness`
- `steps`
- `dependencySummary`
- `note`

### WriterAdapterDryRunResult
Combined validation and dry-run result for one adapter.
- `adapterId`
- `adapterLabel`
- `validation`
- `executionPlan`

### WriterAdapterArtifactMatch
Per-deferred-artifact adapter match summary.
- `artifactId`
- `fileName`
- `artifactKind`
- `requiredCapability`
- `matchedAdapterIds`
- `status`
- `reason`

### WriterAdapterBundle
Aggregate adapter view for one packaged delivery handoff.
- `id`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `input`
- `adapters`
- `artifactMatches`
- `readiness`
- `summary`

## Layer 7: Writer Runner Contracts

### WriterRunnerInput
Normalized runner-facing contract derived from the external execution package plus adapter dry-run output.
- `version`
- `id`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `packageRoot`
- `handoffRoot`
- `adapterBundleId`
- `artifactInputs`

### WriterRunnerArtifactInput
Deferred artifact contract normalized for runner request generation after adapter dry runs.
- `artifactId`
- `fileName`
- `artifactKind`
- `requiredCapability`
- `plannedOutputPath`
- `relativePath`
- `packageStatus`
- `adapterId`
- `adapterReadiness`
- `runnerReadiness`
- `blockerReasons`
- `dependencyIds`
- `payload`

### WriterRunRequest
Deterministic runnable, blocked, or unsupported request set for the current deferred artifact bundle.
- `version`
- `id`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `requestSequence`
- `requests`
- `readiness`
- `summary`

### WriterRunArtifactRequest
Per-artifact request derived from one deferred artifact contract plus runner matching.
- `id`
- `artifactId`
- `fileName`
- `artifactKind`
- `requiredCapability`
- `adapterId`
- `runnerId`
- `requestReadiness`
- `plannedOutputPath`
- `relativePath`
- `dependencyIds`
- `blockedReasons`
- `payload`

### WriterRunResponse
Deterministic runner response set produced by the current reference no-op runner.
- `version`
- `id`
- `requestId`
- `runnerId`
- `status`
- `attempts`
- `summary`

### WriterRunReceipt
Normalized receipt summary for one writer-run request/response cycle.
- `version`
- `id`
- `requestId`
- `responseId`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `runnerReadiness`
- `runnerId`
- `sequence`
- `summary`
- `artifacts`

### WriterRunner
Runner boundary that consumes runner inputs and request bundles after adapter dry runs.
- `id`
- `version`
- `label`
- `capabilities`
- `validate(input)`
- `run(request)`

### WriterRunBundle
Aggregate runner view for one packaged delivery handoff.
- `id`
- `jobId`
- `deliveryPackageId`
- `rootRelativePath`
- `input`
- `validation`
- `request`
- `response`
- `receipt`
- `entries`
- `readiness`
- `summary`

## Layer 8: Writer Run Transport And Audit Contracts

### WriterRunTransportEnvelope
Deterministic external transport envelope derived from one writer-run artifact request plus package and signature context.
- `version`
- `id`
- `transportId`
- `correlationId`
- `jobId`
- `deliveryPackageId`
- `externalExecutionPackageId`
- `handoffBundleId`
- `writerRunBundleId`
- `requestId`
- `requestArtifactId`
- `responseId`
- `receiptId`
- `artifactId`
- `fileName`
- `artifactKind`
- `requiredCapability`
- `packageStatus`
- `requestReadiness`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `adapterId`
- `runnerId`
- `plannedOutputPath`
- `relativePath`
- `envelopeStatus`
- `dispatchable`
- `dispatchReason`
- `dependencyIds`
- `blockedReasons`
- `retryState`
- `cancellationState`
- `payload`

### WriterRunDispatchRecord
Deterministic dispatch or blocked-state record for one transport envelope.
- `id`
- `transportId`
- `correlationId`
- `requestId`
- `requestArtifactId`
- `responseId`
- `receiptId`
- `artifactId`
- `fileName`
- `adapterId`
- `runnerId`
- `status`
- `transportSequence`
- `requestReadiness`
- `responseStatus`
- `note`
- `failure`

### WriterRunTransportResponse
Aggregate acknowledgement or blocked-state response for the current transport batch.
- `version`
- `id`
- `transportId`
- `packageId`
- `requestId`
- `runnerResponseId`
- `runnerReceiptId`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `status`
- `dispatchedCount`
- `acknowledgedCount`
- `blockedCount`
- `failedCount`
- `cancelledCount`
- `note`

### WriterRunAuditRecord
Ordered audit event log for the transport lifecycle.
- `id`
- `transportId`
- `packageId`
- `requestId`
- `runnerResponseId`
- `runnerReceiptId`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `events`
- `summary`

### WriterRunAttemptHistory
Per-artifact lifecycle summary across envelope, dispatch, audit, and receipt state.
- `artifactId`
- `fileName`
- `correlationId`
- `transportId`
- `adapterId`
- `runnerId`
- `requestReadiness`
- `responseStatus`
- `dispatchable`
- `currentStatus`
- `statusTrail`
- `retryState`
- `cancellationState`
- `failure`
- `note`

### WriterRunTransportReceipt
Aggregate history summary for the current transport bundle.
- `version`
- `id`
- `transportId`
- `packageId`
- `requestId`
- `runnerResponseId`
- `runnerReceiptId`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `status`
- `dispatchableCount`
- `dispatchedCount`
- `acknowledgedCount`
- `blockedCount`
- `failedCount`
- `cancelledCount`
- `receiptRecordedCount`
- `receiptImportedCount`
- `completedCount`
- `partialCount`
- `staleCount`
- `duplicateCount`
- `unmatchedCount`
- `invalidCount`
- `note`

### WriterRunTransportBundle
Aggregate transport and audit view for one packaged delivery handoff.
- `id`
- `jobId`
- `deliveryPackageId`
- `rootRelativePath`
- `transportId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `envelopes`
- `dispatchRecords`
- `transportResponse`
- `transportReceipt`
- `auditRecord`
- `history`
- `entries`
- `status`
- `summary`

## Layer 9: Transport Adapter And Receipt-Ingestion Contracts

### WriterRunTransportAdapter
Post-transport boundary that packages deterministic outbound dispatch payloads for external execution.
- `id`
- `version`
- `label`
- `capabilities`
- `endpoint`
- `validate(bundle)`

### WriterRunTransportAdapterValidationResult
Adapter readiness and unsupported-reason summary for one transport bundle.
- `adapterId`
- `readiness`
- `diagnostics`
- `supportedArtifactIds`
- `unsupportedReasons`

### WriterRunDispatchEnvelope
Deterministic outbound dispatch package contract for one transport envelope.
- `version`
- `id`
- `adapterId`
- `transportId`
- `dispatchId`
- `correlationId`
- `jobId`
- `deliveryPackageId`
- `packageId`
- `requestId`
- `requestArtifactId`
- `responseId`
- `receiptId`
- `artifactId`
- `fileName`
- `requestReadiness`
- `dispatchStatus`
- `dispatchable`
- `dispatchReason`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `endpoint`
- `outboundRoot`
- `relativeOutboundRoot`
- `dependencyIds`
- `blockedReasons`
- `payload`
- `files`

### WriterRunDispatchResult
Deterministic dispatch outcome for one outbound adapter package.
- `id`
- `adapterId`
- `dispatchId`
- `correlationId`
- `artifactId`
- `fileName`
- `status`
- `endpoint`
- `outboundRoot`
- `relativeOutboundRoot`
- `filePaths`
- `note`

### WriterRunTransportAdapterBundle
Aggregate adapter view for outbound dispatch packaging.
- `id`
- `jobId`
- `deliveryPackageId`
- `rootRelativePath`
- `packageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `adapters`
- `activeAdapterId`
- `dispatchEnvelopes`
- `dispatchResults`
- `readiness`
- `entries`
- `summary`

### WriterRunReceiptEnvelope
Normalized inbound receipt contract imported from an external transport folder.
- `version`
- `id`
- `adapterId`
- `transportId`
- `dispatchId`
- `correlationId`
- `packageId`
- `requestId`
- `artifactId`
- `fileName`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `source`
- `receiptSequence`
- `status`
- `note`
- `payload`

### WriterRunReceiptIngestionResult
Validation and match result for one imported inbound receipt file.
- `id`
- `sourceFileName`
- `sourcePath`
- `importStatus`
- `matchStatus`
- `validationStatus`
- `dispatchStatus`
- `correlationId`
- `dispatchId`
- `artifactId`
- `note`
- `errors`

### WriterRunReceiptIngestionBundle
Aggregate post-dispatch receipt-import view that updates audit/history deterministically.
- `id`
- `jobId`
- `deliveryPackageId`
- `rootRelativePath`
- `packageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `receipts`
- `results`
- `auditRecord`
- `history`
- `transportReceipt`
- `status`
- `entries`
- `summary`

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
- One `DeliveryHandoffManifest` may be packaged into one `ExternalExecutionPackage` together with staged outputs and package metadata.
- One `ExternalExecutionPackage` may produce one `WriterAdapterInput` document and one `WriterAdapterBundle` for adapter matching and dry-run validation.
- One `WriterAdapterBundle` contains many `WriterAdapterDryRunResult` records and many `WriterAdapterArtifactMatch` records.
- One `WriterAdapterBundle` may produce one `WriterRunnerInput`, one `WriterRunRequest`, one `WriterRunResponse`, and one `WriterRunReceipt` in the downstream runner layer.
- One `WriterRunBundle` may produce many `WriterRunTransportEnvelope` records, many `WriterRunDispatchRecord` records, one `WriterRunTransportResponse`, one `WriterRunAuditRecord`, many `WriterRunAttemptHistory` records, and one `WriterRunTransportReceipt` in the downstream transport/audit layer.
- One `WriterRunTransportBundle` may be consumed by one or more `WriterRunTransportAdapter` records and one `WriterRunTransportAdapterBundle` in the downstream adapter-packaging layer.
- One `WriterRunTransportAdapterBundle` may consume many inbound `WriterRunReceiptEnvelope` records and produce one `WriterRunReceiptIngestionBundle` in the downstream receipt-ingestion layer.
- One `TranslationJob` may contain many `ConformChangeEvent` records.

## Current Repo Rules
- IDs are fixed string literals.
- Dates are fixed strings.
- The repo prefers real fixture imports and falls back to deterministic mock data only when the fixture library is absent.
- Canonical timeline precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- Operator mapping editors persist browser-local review deltas keyed by job plus source signature.
- Types must support real intake analysis, canonical review, delivery planning, execution prep, staging, handoff, external execution packaging, writer-adapter dry runs, writer-runner requests/responses/receipts, writer-run transport/audit contracts, transport-adapter packaging, and receipt-ingestion contracts without implying that a Nuendo writer already exists.
