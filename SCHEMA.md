# Conform Bridge Schema

Conform Bridge uses a layered model:

1. intake
2. canonical normalized translation
3. review-state overlay
4. delivery planning
5. execution prep
6. staging
7. handoff
8. external execution package
9. writer-adapter dry runs
10. writer-runner contracts
11. transport and audit
12. transport-adapter packaging
13. receipt compatibility, normalization, and ingestion
14. executor compatibility

The layers are additive. Later layers do not replace earlier ones.

## Layer 1: Intake

### SourceBundle

Inbound package received from Resolve, editorial, or production audio.

- `id`
- `name`
- `stage = intake`
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

Inbound file or production-audio asset.

- `id`
- `bundleId`
- `stage = intake`
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

## Layer 2: Canonical Normalized Translation Model

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

### NormalizedTimeline

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

- `id`
- `timelineId`
- `name`
- `role`
- `index`
- `channelLayout`
- `clipEventIds`

### ClipEvent

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
- `totals`
- `highRiskCount`
- `warningCount`
- `blockedCount`
- `intakeCompletenessSummary`
- `deliveryReadinessSummary`
- `summary`
- `groups`

### MappingProfile

Structured operator mapping state derived from imported defaults plus review
overrides.

- `id`
- `jobId`
- `trackMappings`
- `metadataMappings`
- `timecodePolicy`
- `fieldRecorderOverrides`

### FieldRecorderCandidate

- `id`
- `jobId`
- `clipEventId`
- `matchKeys`
- `status`
- `candidateAssetName`
- `note`

### MappingRule

- `id`
- `jobId`
- `scope`
- `source`
- `target`
- `action`
- `status`
- `note`

### PreservationIssue

Validation, reconciliation, and delivery-readiness finding.

- `id`
- `jobId`
- `category`
- `severity`
- `scope`
- `code`
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

- `id`
- `jobId`
- `changeType`
- `oldTimecode`
- `newTimecode`
- `oldFrame`
- `newFrame`
- `note`

## Layer 3: Review-State Overlay

Review-state is not a second canonical model. It is a persisted delta layer
applied on top of imported canonical data.

### ReviewState

- `version`
- `jobId`
- `sourceSignature`
- `trackOverrides`
- `markerDecisions`
- `metadataOverrides`
- `fieldRecorderDecisions`
- `validationAcknowledgements`
- `reconformDecisions`

### ValidationAcknowledgement

- `issueKey`
- `status`
- `note`

### ReconformReviewDecision

- `changeEventId`
- `status`
- `note`

## Layer 4: Delivery Planning

### DeliveryPackage

Planned outbound package for Nuendo handoff.

- `id`
- `jobId`
- `stage = delivery`
- `destination`
- `outputPresetId`
- `name`
- `includeReferenceVideo`
- `includeHandles`
- `deliverySummary`
- `artifacts`

### DeliveryArtifact

One planned output file.

- `id`
- `deliveryPackageId`
- `jobId`
- `stage = delivery`
- `origin`
- `fileKind`
- `fileRole`
- `fileName`
- `status`
- `note`

## Layer 5: Execution Prep

Execution prep turns planned artifacts into safe serializable payloads when
that is already deterministic.

### DeliveryExecutionPlan

- `id`
- `jobId`
- `deliveryPackageId`
- `preparedArtifacts`
- `generatedCount`
- `deferredCount`
- `unavailableCount`
- `summary`

### Generated Artifact Payloads

Examples:

- `GeneratedManifestPayload`
- `GeneratedReadmePayload`
- `GeneratedMarkerCsvPayload`
- `GeneratedMarkerEdlPayload`
- `GeneratedMetadataCsvPayload`
- `GeneratedFieldRecorderReportPayload`
- `GeneratedReferenceVideoInstructionPayload`

### DeferredBinaryArtifactPayload

Deferred record for binary or writer-only artifacts.

- `artifactId`
- `artifactKind`
- `nextBoundary`
- `reason`

## Layer 6: Staging

### DeliveryStagingBundle

Deterministic staged delivery layout.

- `id`
- `jobId`
- `deliveryPackageId`
- `rootFolderName`
- `rootRelativePath`
- `entries`
- `reviewInfluence`
- `summaryPath`
- `summary`

### DeliveryStagingSummaryJson

- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `rootFolderName`
- `sourceSignature`
- `generatedCount`
- `deferredCount`
- `unavailableCount`
- `unresolvedBlockerCount`
- `reviewInfluence`

## Layer 7: Handoff

### DeferredWriterInput

Stable contract set for deferred writer-only artifacts.

- `version`
- `id`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `artifacts`

### DeferredWriterArtifact

- `artifactId`
- `artifactKind`
- `fileName`
- `plannedOutputPath`
- `requiredWriterCapability`
- `readinessStatus`
- `explanation`
- `blockers`
- `dependencies`
- `payload`

### WriterDependency

- `id`
- `type`
- `label`
- `reference`
- `status`
- `required`
- `reason`

### DeliveryHandoffManifest

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

- `schemaVersion`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `readinessStatus`
- `unresolvedBlockers`
- `note`

## Layer 8: External Execution Package

### ExternalExecutionPackage

Deterministic export bundle that packages staged output plus handoff contracts.

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

- `relativePath`
- `fileName`
- `layer`
- `classification`
- `mimeType`
- `payloadKind`
- `content`
- `byteSize`
- `checksum`
- `artifactId`
- `artifactStatus`
- `fileRole`
- `fileKind`
- `writerReadinessStatus`

### ExternalExecutionManifest

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

## Layer 9: Writer-Adapter Dry Runs

### WriterAdapterInput

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

### WriterAdapterBundle

Aggregate adapter match and dry-run view.

- `id`
- `jobId`
- `deliveryPackageId`
- `packageStatus`
- `input`
- `adapters`
- `artifactMatches`
- `readiness`
- `summary`

## Layer 10: Writer-Runner Contracts

### WriterRunnerInput

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

### WriterRunRequest

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

### WriterRunResponse

- `version`
- `id`
- `requestId`
- `runnerId`
- `status`
- `attempts`
- `summary`

### WriterRunReceipt

- `version`
- `id`
- `requestId`
- `responseId`
- `jobId`
- `deliveryPackageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `summary`
- `artifacts`

### WriterRunBundle

- `id`
- `jobId`
- `deliveryPackageId`
- `input`
- `request`
- `response`
- `receipt`
- `readiness`
- `summary`

## Layer 11: Transport And Audit

### WriterRunTransportEnvelope

- `version`
- `id`
- `transportId`
- `correlationId`
- `jobId`
- `deliveryPackageId`
- `externalExecutionPackageId`
- `requestId`
- `artifactId`
- `packageStatus`
- `requestReadiness`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `dispatchable`
- `dispatchReason`
- `retryState`
- `cancellationState`
- `payload`

### WriterRunDispatchRecord

- `id`
- `transportId`
- `correlationId`
- `requestId`
- `artifactId`
- `status`
- `transportSequence`
- `requestReadiness`
- `responseStatus`
- `note`
- `failure`

### WriterRunAuditRecord

- `id`
- `transportId`
- `packageId`
- `requestId`
- `runnerResponseId`
- `runnerReceiptId`
- `events`
- `summary`

### WriterRunAttemptHistory

- `artifactId`
- `correlationId`
- `transportId`
- `currentStatus`
- `statusTrail`
- `retryState`
- `cancellationState`
- `failure`
- `note`

### WriterRunTransportBundle

- `id`
- `jobId`
- `deliveryPackageId`
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
- `status`
- `summary`

## Layer 12: Transport-Adapter Packaging

### WriterRunTransportAdapter

Adapter that packages outbound dispatch payloads for an external execution
environment.

- `id`
- `version`
- `label`
- `capabilities`
- `endpoint`
- `receiptCompatibilityProfiles`
- `validate(bundle)`

### WriterRunDispatchEnvelope

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
- `artifactId`
- `dispatchStatus`
- `dispatchable`
- `expectedReceiptProfile`
- `acceptedReceiptProfiles`
- `expectedReceiptVersion`
- `payload`
- `files`

### WriterRunDispatchResult

- `id`
- `adapterId`
- `dispatchId`
- `correlationId`
- `artifactId`
- `status`
- `endpoint`
- `relativeOutboundRoot`
- `expectedReceiptProfile`
- `filePaths`

### WriterRunTransportAdapterBundle

- `id`
- `jobId`
- `deliveryPackageId`
- `packageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `executorProfileId`
- `executorReadiness`
- `adapters`
- `activeAdapterId`
- `declaredReceiptProfiles`
- `dispatchEnvelopes`
- `dispatchResults`
- `readiness`
- `summary`

## Layer 13: Receipt Compatibility, Normalization, And Ingestion

### ReceiptSchemaDescriptor

Declared compatibility profile for inbound receipts.

- `profile`
- `currentVersion`
- `supportedVersions`
- `requiredFields`
- `optionalFields`
- `payloadSource`
- `normalizationRule`
- `unsupportedReason`

### ReceiptNormalizationResult

Normalization or migration result before dispatch matching.

- `id`
- `sourceFileName`
- `sourcePath`
- `status`
- `compatibilityProfile`
- `schemaMatch`
- `payloadSource`
- `payloadFingerprint`
- `envelope`
- `warnings`
- `problems`
- `note`

### WriterRunReceiptEnvelope

Canonical inbound receipt envelope after normalization.

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
- `compatibilityProfile`
- `payloadSource`
- `payloadFingerprint`
- `receiptSequence`
- `status`
- `note`
- `payload`

### WriterRunReceiptIngestionResult

Compatibility-aware validation and match result for one receipt import.

- `id`
- `sourceFileName`
- `sourcePath`
- `executorProfileId`
- `expectedReceiptProfile`
- `normalizationStatus`
- `compatibilityProfile`
- `payloadSource`
- `payloadFingerprint`
- `importStatus`
- `matchStatus`
- `validationStatus`
- `signatureMatch`
- `correlationMatch`
- `dispatchStatus`
- `correlationId`
- `dispatchId`
- `artifactId`
- `note`
- `warnings`
- `errors`

### WriterRunReceiptIngestionBundle

- `id`
- `jobId`
- `deliveryPackageId`
- `packageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `executorProfileId`
- `expectedReceiptProfile`
- `acceptedReceiptProfiles`
- `normalizationResults`
- `compatibilityProfiles`
- `receipts`
- `results`
- `auditRecord`
- `history`
- `transportReceipt`
- `status`
- `summary`

## Layer 14: Executor Compatibility

### ExecutorCompatibilityProfile

Executor-facing compatibility contract describing which packaged outputs,
transport profiles, receipt profiles, and deferred artifact kinds are
acceptable.

- `id`
- `version`
- `label`
- `description`
- `capabilityMatrix`
- `unsupportedReasons`

### ExecutorProfileResolution

Deterministic selection of executor profile, transport profile, and receipt
expectations for one package.

- `id`
- `packageId`
- `selectedProfileId`
- `selectedTransportProfile`
- `expectedReceiptProfile`
- `acceptedReceiptProfiles`
- `packageVersion`
- `handoffVersion`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `note`

### ExecutorPackageCompatibilityResult

Package-level compatibility result for a selected executor profile.

- `id`
- `packageId`
- `jobId`
- `deliveryPackageId`
- `profileId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `readiness`
- `issues`
- `unsupportedReasons`
- `artifactResults`
- `summary`

### ExecutorCompatibilityIssue

Compatibility finding covering package, handoff, transport, receipt, artifact,
or signature mismatches.

- `id`
- `code`
- `severity`
- `scope`
- `artifactId`
- `relativePath`
- `expected`
- `actual`
- `message`
- `followUp`
- `blocking`

### ExecutorCompatibilityBundle

Aggregate executor compatibility view emitted into handoff outputs.

- `id`
- `jobId`
- `deliveryPackageId`
- `rootRelativePath`
- `packageId`
- `sourceSignature`
- `reviewSignature`
- `deliveryPackageSignature`
- `profile`
- `profileResolution`
- `result`
- `entries`
- `status`
- `summary`

## Orchestration Entity

### TranslationJob

Operator-facing record that ties the full workflow together.

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
- `fileKind` describes format only.
- `fileRole` describes purpose only.
- The same `fileKind` or `fileRole` may appear on intake or delivery sides
  when `stage` and `origin` differ.

## Core Relationships

- One `TranslationJob` references one `SourceBundle`, one `TranslationModel`,
  one `AnalysisReport`, and one `DeliveryPackage`.
- One `TranslationModel` contains one or more `NormalizedTimeline` records.
- Review-state overlays persist decisions against source signatures without
  duplicating imported canonical data.
- One `DeliveryPackage` may produce one execution plan, one staging bundle,
  one handoff bundle, one external execution package, one executor
  compatibility bundle, one adapter bundle, one runner bundle, one transport
  bundle, one transport-adapter bundle, and one receipt-ingestion bundle.

## Current Repo Rules

- IDs and seeded dates are deterministic in fixtures and fallback data.
- Real fixture imports are primary; deterministic mock data is only fallback
  when the fixture library is absent.
- Canonical timeline precedence is `fcpxml/xml -> aaf -> edl -> metadata-only`.
- Browser-local persistence is review-delta-only.
- Types must support the real implemented non-writer layers without implying
  that a native Nuendo writer already exists.
