export type JobStatus = "draft" | "queued" | "validating" | "attention" | "ready" | "exported";
export type JobPriority = "low" | "normal" | "high" | "urgent";
export type WorkflowKind = "resolve_to_nuendo";
export type FrameRate = "23.976" | "24" | "25" | "29.97";
export type SampleRate = 48000 | 96000;

export type AssetStage = "intake" | "delivery";
export type AssetOrigin = "resolve" | "editorial" | "production-audio" | "conform-bridge" | "nuendo";
export type FileKind = "aaf" | "fcpxml" | "xml" | "edl" | "csv" | "wav" | "bwf" | "mov" | "mp4" | "json" | "txt" | "otio" | "otioz";
export type FileRole = "timeline_exchange" | "marker_export" | "metadata_export" | "reference_video" | "production_audio" | "intake_manifest" | "delivery_manifest" | "delivery_readme" | "field_recorder_report";
export type IntakeAssetStatus = "present" | "missing" | "placeholder";
export type DeliveryArtifactStatus = "planned" | "blocked" | "placeholder";

export type TemplateCategory = "dialogue" | "full_mix" | "turnovers" | "reconform";
export type TrackGrouping = "by_role" | "by_index" | "flatten";
export type MultichannelMode = "preserve" | "split" | "stereo_fold";
export type BusStrategy = "mirror_source" | "derive_from_template";
export type ClipNameSource = "source_clip" | "timeline_name" | "reel_plus_tc";
export type ReelSource = "source_reel" | "tape" | "clip_metadata";
export type SceneTakeHandling = "preserve" | "scene_only" | "discard";
export type NotesHandling = "merge" | "source_only" | "discard";
export type FieldRecorderKey = "tape" | "reel" | "scene" | "take" | "sound_roll" | "timecode";
export type ChannelAssignment = "poly_preserve" | "mono_expand" | "template_route";
export type FieldRecorderFallback = "skip" | "keep_production_mix" | "mark_unresolved";
export type TargetFormat = "nuendo_bundle_placeholder";
export type PreservationScope = "intake" | "timeline" | "tracks" | "clips" | "markers" | "metadata" | "routing" | "field_recorder" | "delivery" | "reconform";
export type PreservationCategory = "preserved" | "downgraded" | "dropped" | "manual-review";
export type Severity = "critical" | "warning" | "info";
export type SourceRole = "dx" | "fx" | "mx" | "vo" | "printmaster" | "guide";
export type ChannelLayout = "mono" | "stereo" | "lcr" | "5.1" | "poly_4" | "poly_8";
export type MappingAction = "preserve" | "remap" | "merge" | "ignore";
export type TargetType = "audio_track" | "folder" | "group";
export type MetadataField = "clip_name" | "reel" | "scene" | "take" | "notes" | "track_name" | "source_tc";
export type MetadataStatus = "mapped" | "transformed" | "dropped";
export type EventStartMode = "source_absolute" | "timeline_relative";
export type PullMode = "none" | "up" | "down";
export type FieldRecorderOverrideStatus = "linked" | "unresolved" | "ignored";
export type SettingsReportGrouping = "severity" | "scope";
export type MarkerColor = "blue" | "green" | "yellow" | "red" | "purple";
export type MappingScope = "track" | "metadata" | "field_recorder" | "marker" | "delivery";
export type MappingRuleStatus = "locked" | "review" | "issue";
export type FieldRecorderCandidateStatus = "linked" | "candidate" | "missing";
export type DeliveryDestination = "nuendo";
export type ChangeType = "insert" | "delete" | "move" | "trim" | "replace";
export type DeliveryExecutionStatus = "generated" | "deferred" | "unavailable";
export type GeneratedArtifactPayloadKind =
  | "manifest_json"
  | "readme_text"
  | "marker_csv"
  | "marker_edl"
  | "metadata_csv"
  | "field_recorder_report"
  | "reference_video_instruction";
export type ReviewStateVersion = 1;
export type ReviewStateKey = string;
export type ValidationReviewStatus = "unreviewed" | "acknowledged" | "dismissed";
export type ReconformReviewStatus = "unreviewed" | "acknowledged" | "needs-follow-up";
export type DeferredWriterInputVersion = 1;
export type DeliverySourceSignature = string;
export type DeliveryReviewSignature = string;
export type WriterDependencyStatus = "present" | "missing" | "blocked" | "optional";
export type WriterReadinessStatus = "ready-for-writer" | "blocked" | "partial" | "deferred-with-known-gaps";
export type DeferredWriterArtifactKind = "nuendo_ready_aaf" | "reference_video_handoff" | "native_nuendo_session" | "unknown_deferred_artifact";
export type WriterCapability = "aaf_delivery_writer" | "reference_video_handoff" | "native_nuendo_session_writer" | "unsupported_writer_capability";
export type ExternalExecutionPackageVersion = 1;
export type ExternalExecutionStatus = "ready" | "partial" | "blocked";
export type ExternalExecutionEntryLayer = "staged" | "handoff" | "package";
export type ExternalExecutionClassification = "generated" | "deferred-contract" | "package-metadata";
export type ExternalExecutionChecksumAlgorithm = "fnv1a-32";
export type WriterAdapterId = "reference-noop-writer-adapter" | "future-nuendo-aaf-writer" | "future-reference-video-handoff";
export type WriterAdapterVersion = 1;
export type WriterAdapterInputVersion = 1;
export type WriterAdapterCapability = WriterCapability;
export type WriterAdapterReadiness = "ready" | "partial" | "blocked" | "unsupported";
export type WriterAdapterUnsupportedCode =
  | "no_matching_adapter"
  | "capability_not_supported"
  | "adapter_not_implemented"
  | "package_blocked"
  | "artifact_blocked"
  | "dependency_gap";
export type WriterRunnerId = "reference-noop-writer-runner";
export type WriterRunnerVersion = 1;
export type WriterRunnerCapability = WriterCapability;
export type WriterRunnerInputVersion = 1;
export type WriterRunRequestVersion = 1;
export type WriterRunResponseVersion = 1;
export type WriterRunReceiptVersion = 1;
export type WriterRunTransportEnvelopeVersion = 1;
export type WriterRunTransportResponseVersion = 1;
export type WriterRunTransportReceiptVersion = 1;
export type WriterRunDispatchEnvelopeVersion = 1;
export type WriterRunReceiptEnvelopeVersion = 1;
export type WriterRunTransportAdapterVersion = 1;
export type ReceiptCompatibilityVersion = 1;
export type WriterRunnerReadiness = "ready" | "partial" | "blocked" | "unsupported";
export type WriterRunResponseStatus = "simulated-noop" | "partial" | "blocked" | "unsupported";
export type WriterRunRequestId = string;
export type WriterRunTransportId = "reference-noop-transport";
export type WriterRunTransportAdapterId = "reference-noop-transport-adapter" | "filesystem-transport-adapter";
export type WriterRunCorrelationId = string;
export type ReceiptPayloadFingerprint = string;
export type WriterRunBlockedReasonCode =
  | "adapter_not_ready"
  | "runner_not_available"
  | "unsupported_capability"
  | "package_blocked"
  | "artifact_blocked"
  | "dependency_gap";
export type WriterRunnerUnsupportedCode = "runner_not_available" | "runner_not_implemented" | "unsupported_capability";
export type WriterRunDispatchStatus =
  | "ready-to-dispatch"
  | "dispatched"
  | "acknowledged"
  | "transport-failed"
  | "runner-blocked"
  | "runner-complete"
  | "receipt-recorded"
  | "cancelled"
  | "receipt-normalized"
  | "receipt-migrated"
  | "receipt-matched"
  | "receipt-imported"
  | "completed"
  | "partial"
  | "failed"
  | "stale"
  | "superseded"
  | "duplicate"
  | "unmatched"
  | "incompatible"
  | "invalid";
export type WriterRunAuditEventType =
  | "envelope-generated"
  | "dispatch-created"
  | "dispatch-acknowledged"
  | "dispatch-blocked"
  | "runner-complete"
  | "receipt-recorded"
  | "receipt-normalized"
  | "receipt-migrated"
  | "receipt-matched"
  | "receipt-imported"
  | "receipt-duplicate"
  | "receipt-stale"
  | "receipt-incompatible"
  | "receipt-unmatched"
  | "receipt-invalid"
  | "dispatch-failed"
  | "completed"
  | "partial"
  | "failed"
  | "transport-failed"
  | "retry-marked"
  | "cancelled"
  | "timed-out"
  | "expired"
  | "superseded";
export type WriterRunTransportFailureCode =
  | "runner_blocked"
  | "unsupported_request"
  | "transport_unavailable"
  | "timeout"
  | "cancelled"
  | "expired"
  | "superseded";
export type WriterRunRetryMode = "not-needed" | "retryable" | "non-retryable" | "retry-deferred";
export type WriterRunCancellationMode = "active" | "cancelled" | "timed-out" | "expired" | "superseded";
export type WriterRunTransportCapability = "reference_noop_dispatch" | "filesystem_dispatch" | "receipt_ingestion";
export type WriterRunTransportAdapterReadiness = "ready" | "partial" | "blocked" | "unsupported";
export type WriterRunTransportAdapterUnsupportedCode =
  | "dispatch_not_supported"
  | "capability_not_supported"
  | "adapter_not_implemented"
  | "missing_endpoint"
  | "artifact_not_dispatchable";
export type WriterRunDispatchResultStatus = "dispatched" | "dispatch-failed" | "blocked";
export type ReceiptNormalizationStatus = "normalized" | "migrated" | "invalid" | "incompatible" | "partially-compatible";
export type ReceiptCompatibilityProfile =
  | "canonical-filesystem-transport-v1"
  | "compatibility-filesystem-receipt-v1"
  | "future-service-transport-placeholder";
export type ReceiptPayloadSource = "canonical-json" | "compatibility-json" | "future-placeholder-json" | "unknown-json";
export type ReceiptSchemaMatchStatus = "matched" | "migrated" | "incompatible" | "unknown-version";
export type ReceiptSignatureMatchResult = "matched" | "drifted" | "stale" | "superseded" | "unmatched";
export type DispatchReceiptCorrelationResult = "matched" | "dispatch-id-fallback" | "artifact-fallback" | "partial-match" | "unmatched";
export type WriterRunReceiptMatchStatus = "matched" | "duplicate" | "stale" | "superseded" | "unmatched" | "partial-match";
export type WriterRunReceiptValidationStatus =
  | "valid"
  | "invalid"
  | "signature-mismatch"
  | "version-mismatch"
  | "incompatible"
  | "partially-compatible";
export type WriterRunReceiptSource = "filesystem-inbound";
export type WriterRunReceiptImportStatus =
  | "receipt-imported"
  | "receipt-migrated"
  | "receipt-duplicate"
  | "receipt-stale"
  | "receipt-superseded"
  | "receipt-unmatched"
  | "receipt-invalid"
  | "receipt-incompatible"
  | "receipt-partial";
export type WriterRunReceiptOutcomeStatus = "completed" | "failed" | "partial";

export interface SourceSnapshot {
  sequenceName: string;
  clipCount: number;
  trackCount: number;
  unresolvedMediaCount: number;
  revisionLabel: string;
}

export interface MappingSnapshot {
  mappedTrackCount: number;
  preservedMetadataCount: number;
  unresolvedCount: number;
  fieldRecorderLinkedCount: number;
}

export interface IntakeAsset {
  id: string;
  bundleId: string;
  stage: "intake";
  origin: AssetOrigin;
  relativePath?: string;
  fileKind: FileKind;
  fileRole: FileRole;
  name: string;
  sizeLabel: string;
  status: IntakeAssetStatus;
  note: string;
  channelCount?: number;
  channelLayout?: ChannelLayout;
  durationTimecode?: string;
  durationFrames?: number;
  sampleRate?: SampleRate;
  isPolyWav?: boolean;
  hasBwf?: boolean;
  hasIXml?: boolean;
}

export interface SourceBundle {
  id: string;
  name: string;
  stage: "intake";
  receivedFrom: AssetOrigin;
  folderPath?: string;
  sequenceName: string;
  pictureLock: boolean;
  fps: FrameRate;
  startTimecode: string;
  startFrame: number;
  durationTimecode: string;
  durationFrames: number;
  trackCount: number;
  clipCount: number;
  markerCount: number;
  sampleRate: SampleRate;
  handlesFrames: number;
  dropFrame: boolean;
  assets: IntakeAsset[];
}

export interface NormalizedTimeline {
  id: string;
  translationModelId: string;
  name: string;
  fps: FrameRate;
  sampleRate: SampleRate;
  dropFrame: boolean;
  startTimecode: string;
  durationTimecode: string;
  startFrame: number;
  durationFrames: number;
  trackIds: string[];
  markerIds: string[];
}

export interface NormalizedTrack {
  id: string;
  timelineId: string;
  name: string;
  role: SourceRole;
  index: number;
  channelLayout: ChannelLayout;
  clipEventIds: string[];
}

export interface ClipEvent {
  id: string;
  timelineId: string;
  trackId: string;
  sourceAssetId: string;
  clipName: string;
  sourceFileName: string;
  reel?: string;
  tape?: string;
  scene?: string;
  take?: string;
  eventDescription: string;
  clipNotes: string;
  recordIn: string;
  recordOut: string;
  sourceIn: string;
  sourceOut: string;
  recordInFrames: number;
  recordOutFrames: number;
  sourceInFrames: number;
  sourceOutFrames: number;
  channelCount: number;
  channelLayout: ChannelLayout;
  isPolyWav: boolean;
  hasBwf: boolean;
  hasIXml: boolean;
  isOffline: boolean;
  isNested: boolean;
  isFlattened: boolean;
  hasSpeedEffect: boolean;
  hasFadeIn: boolean;
  hasFadeOut: boolean;
}

export interface Marker {
  id: string;
  timelineId: string;
  name: string;
  timecode: string;
  frame: number;
  color: MarkerColor;
  note: string;
}

export interface TranslationModel {
  id: string;
  jobId: string;
  sourceBundleId: string;
  workflow: WorkflowKind;
  name: string;
  primaryTimelineId: string;
  normalizedTimelineIds: string[];
  analysisReportId: string;
  deliveryPackageId: string;
}

export type CanonicalProject = TranslationModel;

export interface TrackPolicy {
  trackGrouping: TrackGrouping;
  multichannelMode: MultichannelMode;
  busStrategy: BusStrategy;
  renamePattern: string;
}

export interface MetadataPolicy {
  clipNameSource: ClipNameSource;
  reelSource: ReelSource;
  sceneTakeHandling: SceneTakeHandling;
  notesHandling: NotesHandling;
}

export interface FieldRecorderPolicy {
  enabled: boolean;
  matchKeys: FieldRecorderKey[];
  channelAssignment: ChannelAssignment;
  fallbackBehavior: FieldRecorderFallback;
}

export interface ExportDefaults {
  targetFormat: TargetFormat;
  includeReferenceVideo: boolean;
  includeHandles: boolean;
  embedNotes: boolean;
  destinationLabel: string;
}

export interface TranslationTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  trackPolicy: TrackPolicy;
  metadataPolicy: MetadataPolicy;
  fieldRecorderPolicy: FieldRecorderPolicy;
  exportDefaults: ExportDefaults;
}

export type OutputPreset = TranslationTemplate;

export interface PreservationIssue {
  id: string;
  jobId: string;
  category: PreservationCategory;
  severity: Severity;
  scope: PreservationScope;
  code: string;
  title: string;
  description: string;
  sourceLocation: string;
  impact: string;
  targetArtifactId?: string;
  targetArtifactName?: string;
  recommendedAction: string;
  requiresDecision: boolean;
  affectedItems: string[];
}

export type PreservationFinding = PreservationIssue;

export interface AnalysisGroup {
  id: string;
  title: string;
  scope: PreservationScope;
  findings: PreservationIssue[];
}

export interface AnalysisTotals {
  trackCount: number;
  clipCount: number;
  markerCount: number;
  offlineAssetCount: number;
}

export interface AnalysisSummary {
  totalFindings: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  operatorDecisionCount: number;
}

export interface AnalysisReport {
  id: string;
  jobId: string;
  translationModelId: string;
  updatedOn: string;
  totals: AnalysisTotals;
  highRiskCount: number;
  warningCount: number;
  blockedCount: number;
  intakeCompletenessSummary: string;
  deliveryReadinessSummary: string;
  summary: AnalysisSummary;
  groups: AnalysisGroup[];
}

export type PreservationReport = AnalysisReport;

export interface MappingRule {
  id: string;
  jobId: string;
  scope: MappingScope;
  source: string;
  target: string;
  action: MappingAction;
  status: MappingRuleStatus;
  note: string;
}

export interface TrackMapping {
  id: string;
  sourceTrack: string;
  sourceRole: SourceRole;
  channelLayout: ChannelLayout;
  targetLane: string;
  targetType: TargetType;
  action: MappingAction;
}

export interface MetadataMapping {
  id: string;
  field: MetadataField;
  sourceValue: string;
  targetValue: string;
  status: MetadataStatus;
}

export interface TimecodePolicy {
  timelineStart: string;
  eventStartMode: EventStartMode;
  pullMode: PullMode;
  dropFrame: boolean;
}

export interface FieldRecorderOverride {
  id: string;
  matchField: FieldRecorderKey;
  sourceValue: string;
  targetValue: string;
  status: FieldRecorderOverrideStatus;
}

export interface FieldRecorderCandidate {
  id: string;
  jobId: string;
  clipEventId: string;
  matchKeys: Partial<Record<FieldRecorderKey, string>>;
  status: FieldRecorderCandidateStatus;
  candidateAssetName: string;
  note: string;
}

export interface MappingProfile {
  id: string;
  jobId: string;
  trackMappings: TrackMapping[];
  metadataMappings: MetadataMapping[];
  timecodePolicy: TimecodePolicy;
  fieldRecorderOverrides: FieldRecorderOverride[];
}

export interface DeliveryArtifact {
  id: string;
  deliveryPackageId: string;
  jobId: string;
  stage: "delivery";
  origin: AssetOrigin;
  fileKind: FileKind;
  fileRole: FileRole;
  fileName: string;
  status: DeliveryArtifactStatus;
  note: string;
}

export interface DeliveryPackage {
  id: string;
  jobId: string;
  stage: "delivery";
  destination: DeliveryDestination;
  outputPresetId: string;
  name: string;
  includeReferenceVideo: boolean;
  includeHandles: boolean;
  deliverySummary: string;
  artifacts: DeliveryArtifact[];
}

export interface DeliveryExecutionArtifactBase {
  artifactId: string;
  deliveryPackageId: string;
  jobId: string;
  fileName: string;
  fileRole: FileRole;
  fileKind: FileKind;
  artifactStatus: DeliveryArtifactStatus;
  executionStatus: DeliveryExecutionStatus;
  summary: string;
}

export interface GeneratedManifestPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "manifest_json";
  mimeType: "application/json";
  content: string;
  json: Record<string, unknown>;
}

export interface GeneratedReadmePayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "readme_text";
  mimeType: "text/plain";
  content: string;
}

export interface GeneratedMarkerCsvPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "marker_csv";
  mimeType: "text/csv";
  content: string;
  rowCount: number;
}

export interface GeneratedMarkerEdlPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "marker_edl";
  mimeType: "text/plain";
  content: string;
  eventCount: number;
}

export interface GeneratedMetadataCsvPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "metadata_csv";
  mimeType: "text/csv";
  content: string;
  rowCount: number;
}

export interface GeneratedFieldRecorderReportPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "field_recorder_report";
  mimeType: "text/csv";
  content: string;
  rowCount: number;
}

export interface GeneratedReferenceVideoInstructionPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "generated";
  payloadKind: "reference_video_instruction";
  mimeType: "text/plain";
  content: string;
}

export interface DeferredBinaryArtifactPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "deferred";
  payloadKind: "deferred_binary";
  nextBoundary: "future_writer" | "source_media_handoff";
  reason: string;
}

export interface UnavailableArtifactPayload extends DeliveryExecutionArtifactBase {
  executionStatus: "unavailable";
  payloadKind: "unavailable";
  reason: string;
}

export type DeliveryExecutionArtifactPayload =
  | GeneratedManifestPayload
  | GeneratedReadmePayload
  | GeneratedMarkerCsvPayload
  | GeneratedMarkerEdlPayload
  | GeneratedMetadataCsvPayload
  | GeneratedFieldRecorderReportPayload
  | GeneratedReferenceVideoInstructionPayload
  | DeferredBinaryArtifactPayload
  | UnavailableArtifactPayload;

export interface DeliveryExecutionPlan {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  preparedArtifacts: DeliveryExecutionArtifactPayload[];
  generatedCount: number;
  deferredCount: number;
  unavailableCount: number;
  summary: string;
}

export interface DeliveryStagingReviewInfluence {
  mode: "imported_base" | "saved_review_overlay";
  hasSavedState: boolean;
  operatorEditedCount: number;
  validationAcknowledgedCount: number;
  validationDismissedCount: number;
  reconformReviewedCount: number;
  openReviewCount: number;
  note: string;
}

export interface DeliveryDeferredDescriptor {
  schemaVersion: 1;
  artifactId: string;
  jobId: string;
  deliveryPackageId: string;
  fileName: string;
  fileRole: FileRole;
  fileKind: FileKind;
  artifactStatus: DeliveryArtifactStatus;
  executionStatus: "deferred";
  nextBoundary: DeferredBinaryArtifactPayload["nextBoundary"];
  reason: string;
  sourceDependencies: string[];
}

export interface StagedGeneratedArtifactFile {
  kind: "generated_file";
  relativePath: string;
  directory: string;
  fileName: string;
  artifactId: string;
  fileRole: FileRole;
  fileKind: FileKind;
  artifactStatus: DeliveryArtifactStatus;
  payloadKind: GeneratedArtifactPayloadKind;
  mimeType: string;
  content: string;
  summary: string;
}

export interface StagedDeferredArtifactFile {
  kind: "deferred_descriptor";
  relativePath: string;
  directory: string;
  fileName: string;
  artifactId: string;
  fileRole: FileRole;
  fileKind: FileKind;
  artifactStatus: DeliveryArtifactStatus;
  payloadKind: "deferred_descriptor";
  mimeType: "application/json";
  content: string;
  descriptor: DeliveryDeferredDescriptor;
  summary: string;
}

export interface DeliveryStagingSummaryJson {
  schemaVersion: 1;
  jobId: string;
  deliveryPackageId: string;
  rootFolderName: string;
  sourceSignature: string;
  generatedCount: number;
  deferredCount: number;
  unavailableCount: number;
  unresolvedBlockerCount: number;
  generatedFiles: Array<{
    relativePath: string;
    artifactId: string;
    payloadKind: GeneratedArtifactPayloadKind;
    artifactStatus: DeliveryArtifactStatus;
    summary: string;
  }>;
  deferredFiles: Array<{
    relativePath: string;
    artifactId: string;
    fileRole: FileRole;
    fileKind: FileKind;
    artifactStatus: DeliveryArtifactStatus;
    nextBoundary: DeferredBinaryArtifactPayload["nextBoundary"];
    summary: string;
  }>;
  unavailableArtifacts: Array<{
    artifactId: string;
    fileName: string;
    fileRole: FileRole;
    fileKind: FileKind;
    artifactStatus: DeliveryArtifactStatus;
    reason: string;
    summary: string;
  }>;
  reviewInfluence: DeliveryStagingReviewInfluence;
}

export interface StagedSummaryFile {
  kind: "summary_file";
  relativePath: string;
  directory: string;
  fileName: "staging-summary.json";
  payloadKind: "staging_summary";
  mimeType: "application/json";
  content: string;
  json: DeliveryStagingSummaryJson;
  summary: string;
}

export type StagedDeliveryEntry =
  | StagedGeneratedArtifactFile
  | StagedDeferredArtifactFile
  | StagedSummaryFile;

export interface DeliveryStagingBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootFolderName: string;
  rootRelativePath: string;
  entries: StagedDeliveryEntry[];
  unavailableArtifacts: DeliveryStagingSummaryJson["unavailableArtifacts"];
  generatedCount: number;
  deferredCount: number;
  unavailableCount: number;
  unresolvedBlockerCount: number;
  sourceSignature: string;
  reviewInfluence: DeliveryStagingReviewInfluence;
  summaryPath: string;
  summary: string;
}

export interface WriterDependency {
  id: string;
  type: "staged_file" | "intake_asset" | "preservation_issue" | "review_state";
  label: string;
  reference: string;
  status: WriterDependencyStatus;
  required: boolean;
  reason: string;
}

export interface DeferredWriterArtifact {
  artifactId: string;
  deferredDescriptorPath: string;
  artifactKind: DeferredWriterArtifactKind;
  fileName: string;
  fileRole: FileRole;
  fileKind: FileKind;
  artifactStatus: DeliveryArtifactStatus;
  plannedOutputPath: string;
  requiredWriterCapability: WriterCapability;
  readinessStatus: WriterReadinessStatus;
  explanation: string;
  blockers: string[];
  dependencies: WriterDependency[];
  payload: Record<string, unknown>;
}

export interface DeferredWriterInput {
  version: DeferredWriterInputVersion;
  id: string;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  artifacts: DeferredWriterArtifact[];
}

export interface DeliveryHandoffArtifact {
  artifactId: string;
  fileName: string;
  relativePath: string;
  state: "staged" | "deferred-contract" | "blocked";
  summary: string;
}

export interface DeliveryHandoffSummary {
  schemaVersion: 1;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  stagedArtifactCount: number;
  deferredArtifactCount: number;
  blockedArtifactCount: number;
  readyForWriterCount: number;
  partialCount: number;
  deferredWithKnownGapsCount: number;
  readinessStatus: WriterReadinessStatus;
  unresolvedBlockers: string[];
  note: string;
}

export interface DeliveryHandoffManifest {
  schemaVersion: 1;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  stagingRoot: string;
  reviewInfluence: DeliveryStagingReviewInfluence;
  generatedArtifacts: DeliveryHandoffArtifact[];
  deferredArtifacts: DeliveryHandoffArtifact[];
  blockedArtifacts: DeliveryHandoffArtifact[];
}

export interface HandoffGeneratedFile {
  kind: "handoff_file";
  relativePath: string;
  fileName: string;
  mimeType: "application/json";
  payloadKind: "deferred_writer_inputs" | "delivery_handoff_manifest" | "delivery_handoff_summary";
  content: string;
  summary: string;
}

export type DeliveryHandoffEntry = HandoffGeneratedFile;

export interface DeliveryHandoffBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootRelativePath: string;
  entries: DeliveryHandoffEntry[];
  deferredWriterInput: DeferredWriterInput;
  manifest: DeliveryHandoffManifest;
  summaryJson: DeliveryHandoffSummary;
  summary: string;
}

export interface ExternalExecutionChecksum {
  relativePath: string;
  algorithm: ExternalExecutionChecksumAlgorithm;
  value: string;
  byteSize: number;
}

export interface ExternalExecutionDeferredInput {
  artifactId: string;
  artifactKind: DeferredWriterArtifactKind;
  relativePath: string;
  plannedOutputPath: string;
  readinessStatus: WriterReadinessStatus;
  requiredWriterCapability: WriterCapability;
  blockers: string[];
  dependencyIds: string[];
  payload: Record<string, unknown>;
}

export interface ExternalExecutionManifest {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  packageStatus: ExternalExecutionStatus;
  stagedRoot: string;
  handoffRoot: string;
  packageRoot: string;
  generatedEntryCount: number;
  deferredContractCount: number;
  packageMetadataCount: number;
  reasons: string[];
  note: string;
}

export interface ExternalExecutionIndexEntry {
  relativePath: string;
  fileName: string;
  layer: ExternalExecutionEntryLayer;
  classification: ExternalExecutionClassification;
  mimeType: string;
  payloadKind: string;
  artifactId?: string;
  artifactStatus?: DeliveryArtifactStatus;
  writerReadinessStatus?: WriterReadinessStatus;
  byteSize: number;
  checksum: string;
  summary: string;
}

export interface ExternalExecutionIndex {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  entries: ExternalExecutionIndexEntry[];
}

export interface ExternalExecutionGeneratedArtifactIndex {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  artifacts: Array<{
    artifactId: string;
    relativePath: string;
    fileRole: FileRole;
    fileKind: FileKind;
    artifactStatus: DeliveryArtifactStatus;
    payloadKind: GeneratedArtifactPayloadKind;
    byteSize: number;
    checksum: string;
    summary: string;
  }>;
}

export interface ExternalExecutionSummary {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  packageStatus: ExternalExecutionStatus;
  stagedEntryCount: number;
  handoffEntryCount: number;
  packageEntryCount: number;
  generatedEntryCount: number;
  deferredContractCount: number;
  blockedDeferredCount: number;
  totalEntryCount: number;
  note: string;
  reasons: string[];
}

export interface ExternalExecutionChecksums {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  algorithm: ExternalExecutionChecksumAlgorithm;
  entries: ExternalExecutionChecksum[];
}

export interface ExternalExecutionDeferredInputsDocument {
  schemaVersion: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  deliveryPackageSignature: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  inputs: ExternalExecutionDeferredInput[];
}

export interface ExternalExecutionEntry {
  kind: "external_execution_entry";
  relativePath: string;
  fileName: string;
  layer: ExternalExecutionEntryLayer;
  classification: ExternalExecutionClassification;
  mimeType: string;
  payloadKind: string;
  content: string;
  byteSize: number;
  checksum: ExternalExecutionChecksum;
  summary: string;
  artifactId?: string;
  artifactStatus?: DeliveryArtifactStatus;
  fileRole?: FileRole;
  fileKind?: FileKind;
  writerReadinessStatus?: WriterReadinessStatus;
}

export interface ExternalExecutionPackage {
  id: string;
  version: ExternalExecutionPackageVersion;
  jobId: string;
  deliveryPackageId: string;
  rootFolderName: string;
  rootRelativePath: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  status: ExternalExecutionStatus;
  entries: ExternalExecutionEntry[];
  manifestJson: ExternalExecutionManifest;
  indexJson: ExternalExecutionIndex;
  summaryJson: ExternalExecutionSummary;
  checksumsJson: ExternalExecutionChecksums;
  deferredInputsJson: ExternalExecutionDeferredInputsDocument;
  generatedArtifactIndexJson: ExternalExecutionGeneratedArtifactIndex;
  summary: string;
}

export interface WriterAdapterArtifactInput {
  artifactId: string;
  artifactKind: DeferredWriterArtifactKind;
  fileName: string;
  relativePath: string;
  deferredDescriptorPath: string;
  plannedOutputPath: string;
  requiredWriterCapability: WriterCapability;
  packageStatus: ExternalExecutionStatus;
  writerReadinessStatus: WriterReadinessStatus;
  blockers: string[];
  dependencyIds: string[];
  payload: Record<string, unknown>;
}

export interface WriterAdapterInput {
  version: WriterAdapterInputVersion;
  id: string;
  jobId: string;
  deliveryPackageId: string;
  packageStatus: ExternalExecutionStatus;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  packageRoot: string;
  stagedRoot: string;
  handoffRoot: string;
  artifactInputs: WriterAdapterArtifactInput[];
}

export interface WriterAdapterUnsupportedReason {
  code: WriterAdapterUnsupportedCode;
  artifactId?: string;
  capability?: WriterCapability;
  message: string;
}

export interface WriterAdapterValidationResult {
  adapterId: WriterAdapterId;
  readiness: WriterAdapterReadiness;
  diagnostics: string[];
  supportedArtifactIds: string[];
  unsupportedReasons: WriterAdapterUnsupportedReason[];
}

export interface WriterAdapterExecutionStep {
  artifactId: string;
  fileName: string;
  plannedOutputPath: string;
  requiredCapability: WriterCapability;
  readiness: WriterAdapterReadiness;
  summary: string;
  blockers: string[];
}

export interface WriterAdapterExecutionPlan {
  adapterId: WriterAdapterId;
  readiness: WriterAdapterReadiness;
  steps: WriterAdapterExecutionStep[];
  dependencySummary: {
    totalArtifacts: number;
    readyCount: number;
    partialCount: number;
    blockedCount: number;
    unsupportedCount: number;
  };
  note: string;
}

export interface WriterAdapterDryRunResult {
  adapterId: WriterAdapterId;
  adapterLabel: string;
  validation: WriterAdapterValidationResult;
  executionPlan: WriterAdapterExecutionPlan;
}

export interface WriterAdapter {
  id: WriterAdapterId;
  version: WriterAdapterVersion;
  label: string;
  capabilities: WriterAdapterCapability[];
  validate(input: WriterAdapterInput): WriterAdapterValidationResult;
  dryRun(input: WriterAdapterInput): WriterAdapterDryRunResult;
}

export interface WriterAdapterArtifactMatch {
  artifactId: string;
  fileName: string;
  artifactKind: DeferredWriterArtifactKind;
  requiredCapability: WriterCapability;
  matchedAdapterIds: WriterAdapterId[];
  status: WriterAdapterReadiness;
  reason: string;
}

export interface WriterAdapterResult {
  id: WriterAdapterId;
  version: WriterAdapterVersion;
  label: string;
  capabilities: WriterAdapterCapability[];
  validation: WriterAdapterValidationResult;
  dryRun: WriterAdapterDryRunResult;
}

export interface WriterAdapterBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  packageStatus: ExternalExecutionStatus;
  input: WriterAdapterInput;
  adapters: WriterAdapterResult[];
  artifactMatches: WriterAdapterArtifactMatch[];
  readiness: WriterAdapterReadiness;
  summary: string;
}

export interface WriterRunBlockedReason {
  code: WriterRunBlockedReasonCode;
  artifactId?: string;
  message: string;
}

export interface WriterRunnerUnsupportedReason {
  code: WriterRunnerUnsupportedCode;
  artifactId?: string;
  capability?: WriterRunnerCapability;
  message: string;
}

export interface WriterRunnerArtifactInput {
  artifactId: string;
  fileName: string;
  artifactKind: DeferredWriterArtifactKind;
  requiredCapability: WriterRunnerCapability;
  plannedOutputPath: string;
  relativePath: string;
  packageStatus: ExternalExecutionStatus;
  adapterId?: WriterAdapterId;
  adapterReadiness: WriterAdapterReadiness;
  runnerReadiness: WriterRunnerReadiness;
  blockerReasons: WriterRunBlockedReason[];
  dependencyIds: string[];
  payload: Record<string, unknown>;
}

export interface WriterRunnerInput {
  version: WriterRunnerInputVersion;
  id: string;
  jobId: string;
  deliveryPackageId: string;
  packageStatus: ExternalExecutionStatus;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  packageRoot: string;
  handoffRoot: string;
  adapterBundleId: string;
  artifactInputs: WriterRunnerArtifactInput[];
}

export interface WriterRunArtifactRequest {
  id: string;
  artifactId: string;
  fileName: string;
  artifactKind: DeferredWriterArtifactKind;
  requiredCapability: WriterRunnerCapability;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  requestReadiness: WriterRunnerReadiness;
  plannedOutputPath: string;
  relativePath: string;
  dependencyIds: string[];
  blockedReasons: WriterRunBlockedReason[];
  payload: Record<string, unknown>;
}

export interface WriterRunRequest {
  version: WriterRunRequestVersion;
  id: WriterRunRequestId;
  jobId: string;
  deliveryPackageId: string;
  packageStatus: ExternalExecutionStatus;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  requestSequence: number;
  requests: WriterRunArtifactRequest[];
  readiness: WriterRunnerReadiness;
  summary: string;
}

export interface WriterRunAttempt {
  artifactId: string;
  requestArtifactId: string;
  attemptSequence: number;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  requestReadiness: WriterRunnerReadiness;
  responseStatus: WriterRunResponseStatus;
  simulated: boolean;
  note: string;
  blockedReasons: WriterRunBlockedReason[];
}

export interface WriterRunResponse {
  version: WriterRunResponseVersion;
  id: string;
  requestId: WriterRunRequestId;
  runnerId: WriterRunnerId;
  status: WriterRunResponseStatus;
  attempts: WriterRunAttempt[];
  summary: string;
}

export interface WriterRunReceiptArtifact {
  artifactId: string;
  fileName: string;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  requestReadiness: WriterRunnerReadiness;
  responseStatus: WriterRunResponseStatus;
  outcome: "simulated-noop" | "partial" | "blocked" | "unsupported";
  note: string;
  blockedReasons: WriterRunBlockedReason[];
}

export interface WriterRunReceiptSummary {
  totalArtifacts: number;
  runnableCount: number;
  simulatedCount: number;
  partialCount: number;
  blockedCount: number;
  unsupportedCount: number;
  note: string;
}

export interface WriterRunReceipt {
  version: WriterRunReceiptVersion;
  id: string;
  requestId: WriterRunRequestId;
  responseId: string;
  jobId: string;
  deliveryPackageId: string;
  packageStatus: ExternalExecutionStatus;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  runnerReadiness: WriterRunnerReadiness;
  runnerId: WriterRunnerId;
  sequence: number;
  summary: WriterRunReceiptSummary;
  artifacts: WriterRunReceiptArtifact[];
}

export interface WriterRunnerValidationResult {
  runnerId: WriterRunnerId;
  readiness: WriterRunnerReadiness;
  diagnostics: string[];
  runnableArtifactIds: string[];
  unsupportedReasons: WriterRunnerUnsupportedReason[];
}

export interface WriterRunner {
  id: WriterRunnerId;
  version: WriterRunnerVersion;
  label: string;
  capabilities: WriterRunnerCapability[];
  validate(input: WriterRunnerInput): WriterRunnerValidationResult;
  run(request: WriterRunRequest): WriterRunResponse;
}

export interface WriterRunEntry {
  kind: "writer_run_entry";
  relativePath: string;
  fileName: "writer-run-requests.json" | "writer-run-responses.json" | "writer-run-receipts.json";
  payloadKind: "writer_run_requests" | "writer_run_responses" | "writer_run_receipts";
  mimeType: "application/json";
  content: string;
  summary: string;
}

export interface WriterRunBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootRelativePath: string;
  input: WriterRunnerInput;
  validation: WriterRunnerValidationResult;
  request: WriterRunRequest;
  response: WriterRunResponse;
  receipt: WriterRunReceipt;
  entries: WriterRunEntry[];
  readiness: WriterRunnerReadiness;
  summary: string;
}

export interface WriterRunTransportFailure {
  code: WriterRunTransportFailureCode;
  artifactId?: string;
  message: string;
  retryable: boolean;
}

export interface WriterRunRetryState {
  mode: WriterRunRetryMode;
  attemptCount: number;
  maxAttempts: number;
  note: string;
}

export interface WriterRunCancellationState {
  mode: WriterRunCancellationMode;
  reason: string;
  supersededBySourceSignature?: DeliverySourceSignature;
  supersededByReviewSignature?: DeliveryReviewSignature;
}

export interface WriterRunTransportEnvelope {
  version: WriterRunTransportEnvelopeVersion;
  id: string;
  transportId: WriterRunTransportId;
  correlationId: WriterRunCorrelationId;
  jobId: string;
  deliveryPackageId: string;
  externalExecutionPackageId: string;
  handoffBundleId: string;
  writerRunBundleId: string;
  requestId: WriterRunRequestId;
  requestArtifactId: string;
  responseId: string;
  receiptId: string;
  artifactId: string;
  fileName: string;
  artifactKind: DeferredWriterArtifactKind;
  requiredCapability: WriterRunnerCapability;
  packageStatus: ExternalExecutionStatus;
  requestReadiness: WriterRunnerReadiness;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  plannedOutputPath: string;
  relativePath: string;
  envelopeStatus: WriterRunDispatchStatus;
  dispatchable: boolean;
  dispatchReason: string;
  dependencyIds: string[];
  blockedReasons: WriterRunBlockedReason[];
  retryState: WriterRunRetryState;
  cancellationState: WriterRunCancellationState;
  payload: Record<string, unknown>;
}

export interface WriterRunDispatchRecord {
  id: string;
  transportId: WriterRunTransportId;
  correlationId: WriterRunCorrelationId;
  requestId: WriterRunRequestId;
  requestArtifactId: string;
  responseId: string;
  receiptId: string;
  artifactId: string;
  fileName: string;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  status: WriterRunDispatchStatus;
  transportSequence: number;
  requestReadiness: WriterRunnerReadiness;
  responseStatus: WriterRunResponseStatus;
  note: string;
  failure?: WriterRunTransportFailure;
}

export interface WriterRunTransportResponse {
  version: WriterRunTransportResponseVersion;
  id: string;
  transportId: WriterRunTransportId;
  packageId: string;
  requestId: WriterRunRequestId;
  runnerResponseId: string;
  runnerReceiptId: string;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  status: WriterRunDispatchStatus;
  dispatchedCount: number;
  acknowledgedCount: number;
  blockedCount: number;
  failedCount: number;
  cancelledCount: number;
  note: string;
}

export interface WriterRunAuditEvent {
  id: string;
  correlationId: WriterRunCorrelationId;
  artifactId?: string;
  sequence: number;
  eventType: WriterRunAuditEventType;
  status: WriterRunDispatchStatus;
  requestId: WriterRunRequestId;
  responseId: string;
  receiptId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  note: string;
  failure?: WriterRunTransportFailure;
}

export interface WriterRunAuditRecord {
  id: string;
  transportId: WriterRunTransportId;
  packageId: string;
  requestId: WriterRunRequestId;
  runnerResponseId: string;
  runnerReceiptId: string;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  events: WriterRunAuditEvent[];
  summary: string;
}

export interface WriterRunAttemptHistory {
  artifactId: string;
  fileName: string;
  correlationId: WriterRunCorrelationId;
  transportId: WriterRunTransportId;
  adapterId?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  requestReadiness: WriterRunnerReadiness;
  responseStatus: WriterRunResponseStatus;
  dispatchable: boolean;
  currentStatus: WriterRunDispatchStatus;
  statusTrail: WriterRunDispatchStatus[];
  retryState: WriterRunRetryState;
  cancellationState: WriterRunCancellationState;
  failure?: WriterRunTransportFailure;
  note: string;
}

export interface WriterRunTransportReceipt {
  version: WriterRunTransportReceiptVersion;
  id: string;
  transportId: WriterRunTransportId;
  packageId: string;
  requestId: WriterRunRequestId;
  runnerResponseId: string;
  runnerReceiptId: string;
  jobId: string;
  deliveryPackageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  status: WriterRunDispatchStatus;
  dispatchableCount: number;
  dispatchedCount: number;
  acknowledgedCount: number;
  blockedCount: number;
  failedCount: number;
  cancelledCount: number;
  receiptRecordedCount: number;
  receiptNormalizedCount: number;
  receiptMigratedCount: number;
  receiptImportedCount: number;
  completedCount: number;
  partialCount: number;
  staleCount: number;
  supersededCount: number;
  duplicateCount: number;
  unmatchedCount: number;
  incompatibleCount: number;
  partialCompatibilityCount: number;
  invalidCount: number;
  note: string;
}

export interface WriterRunTransportEntry {
  kind: "writer_run_transport_entry";
  relativePath: string;
  fileName:
    | "writer-run-transport-envelopes.json"
    | "writer-run-dispatch-records.json"
    | "writer-run-audit-log.json"
    | "writer-run-history.json";
  payloadKind:
    | "writer_run_transport_envelopes"
    | "writer_run_dispatch_records"
    | "writer_run_audit_log"
    | "writer_run_history";
  mimeType: "application/json";
  content: string;
  summary: string;
}

export interface WriterRunTransportBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootRelativePath: string;
  transportId: WriterRunTransportId;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  envelopes: WriterRunTransportEnvelope[];
  dispatchRecords: WriterRunDispatchRecord[];
  transportResponse: WriterRunTransportResponse;
  transportReceipt: WriterRunTransportReceipt;
  auditRecord: WriterRunAuditRecord;
  history: WriterRunAttemptHistory[];
  entries: WriterRunTransportEntry[];
  status: WriterRunDispatchStatus;
  summary: string;
}

export interface WriterRunTransportEndpoint {
  kind: "filesystem";
  label: string;
  rootPath: string;
  outboundPath: string;
  inboundPath: string;
}

export interface ReceiptSchemaDescriptor {
  profile: ReceiptCompatibilityProfile;
  currentVersion: ReceiptCompatibilityVersion;
  supportedVersions: number[];
  requiredFields: string[];
  optionalFields: string[];
  payloadSource: ReceiptPayloadSource;
  normalizationRule: "canonical" | "compatibility" | "future-placeholder";
  unsupportedReason?: string;
}

export interface ReceiptSchemaMatchResult {
  profile: ReceiptCompatibilityProfile;
  status: ReceiptSchemaMatchStatus;
  detectedVersion?: number;
  note: string;
}

export interface ReceiptImportProblem {
  code:
    | "invalid_json"
    | "missing_required_field"
    | "unsupported_profile"
    | "unsupported_version"
    | "normalization_failure"
    | "signature_mismatch"
    | "dispatch_mismatch";
  message: string;
}

export interface ReceiptImportWarning {
  code:
    | "migrated_version"
    | "optional_field_missing"
    | "future_profile_partial"
    | "artifact_fallback_match"
    | "dispatch_id_fallback_match"
    | "signature_drift";
  message: string;
}

export interface ReceiptNormalizationResult {
  id: string;
  sourceFileName: string;
  sourcePath?: string;
  status: ReceiptNormalizationStatus;
  compatibilityProfile: ReceiptCompatibilityProfile;
  schemaMatch: ReceiptSchemaMatchResult;
  payloadSource: ReceiptPayloadSource;
  payloadFingerprint: ReceiptPayloadFingerprint;
  envelope?: WriterRunReceiptEnvelope;
  warnings: ReceiptImportWarning[];
  problems: ReceiptImportProblem[];
  note: string;
}

export interface WriterRunTransportAdapterUnsupportedReason {
  code: WriterRunTransportAdapterUnsupportedCode;
  artifactId?: string;
  capability?: WriterRunTransportCapability;
  message: string;
}

export interface WriterRunTransportAdapterValidationResult {
  adapterId: WriterRunTransportAdapterId;
  readiness: WriterRunTransportAdapterReadiness;
  diagnostics: string[];
  supportedArtifactIds: string[];
  unsupportedReasons: WriterRunTransportAdapterUnsupportedReason[];
}

export interface WriterRunDispatchFile {
  relativePath: string;
  fileName: string;
  mimeType: string;
  content: string;
  summary: string;
}

export interface WriterRunDispatchEnvelope {
  version: WriterRunDispatchEnvelopeVersion;
  id: string;
  adapterId: WriterRunTransportAdapterId;
  transportId: WriterRunTransportId;
  dispatchId: string;
  correlationId: WriterRunCorrelationId;
  jobId: string;
  deliveryPackageId: string;
  packageId: string;
  requestId: WriterRunRequestId;
  requestArtifactId: string;
  responseId: string;
  receiptId: string;
  artifactId: string;
  fileName: string;
  requestReadiness: WriterRunnerReadiness;
  dispatchStatus: WriterRunDispatchResultStatus;
  dispatchable: boolean;
  dispatchReason: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  adapterIdUsed?: WriterAdapterId;
  runnerId?: WriterRunnerId;
  endpoint: WriterRunTransportEndpoint;
  outboundRoot: string;
  relativeOutboundRoot: string;
  expectedReceiptProfile: ReceiptCompatibilityProfile;
  acceptedReceiptProfiles: ReceiptCompatibilityProfile[];
  expectedReceiptVersion: ReceiptCompatibilityVersion;
  dependencyIds: string[];
  blockedReasons: WriterRunBlockedReason[];
  payload: Record<string, unknown>;
  files: WriterRunDispatchFile[];
}

export interface WriterRunDispatchResult {
  id: string;
  adapterId: WriterRunTransportAdapterId;
  dispatchId: string;
  correlationId: WriterRunCorrelationId;
  artifactId: string;
  fileName: string;
  status: WriterRunDispatchResultStatus;
  endpoint: WriterRunTransportEndpoint;
  outboundRoot: string;
  relativeOutboundRoot: string;
  expectedReceiptProfile: ReceiptCompatibilityProfile;
  filePaths: string[];
  note: string;
}

export interface WriterRunTransportAdapter {
  id: WriterRunTransportAdapterId;
  version: WriterRunTransportAdapterVersion;
  label: string;
  capabilities: WriterRunTransportCapability[];
  endpoint: WriterRunTransportEndpoint;
  receiptCompatibilityProfiles: ReceiptCompatibilityProfile[];
  validate(bundle: WriterRunTransportBundle): WriterRunTransportAdapterValidationResult;
}

export interface WriterRunTransportAdapterResult {
  id: WriterRunTransportAdapterId;
  version: WriterRunTransportAdapterVersion;
  label: string;
  capabilities: WriterRunTransportCapability[];
  endpoint: WriterRunTransportEndpoint;
  receiptCompatibilityProfiles: ReceiptCompatibilityProfile[];
  validation: WriterRunTransportAdapterValidationResult;
}

export interface WriterRunTransportAdapterEntry {
  kind: "writer_run_transport_adapter_entry" | "writer_run_dispatch_file_entry";
  relativePath: string;
  fileName: string;
  payloadKind:
    | "writer_run_transport_adapters"
    | "writer_run_dispatch_envelopes"
    | "writer_run_dispatch_results"
    | "writer_run_dispatch_payload"
    | "writer_run_dispatch_receipt_profile";
  mimeType: "application/json";
  content: string;
  summary: string;
}

export interface WriterRunTransportAdapterBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootRelativePath: string;
  packageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  adapters: WriterRunTransportAdapterResult[];
  activeAdapterId: WriterRunTransportAdapterId;
  declaredReceiptProfiles: ReceiptSchemaDescriptor[];
  dispatchEnvelopes: WriterRunDispatchEnvelope[];
  dispatchResults: WriterRunDispatchResult[];
  readiness: WriterRunTransportAdapterReadiness;
  entries: WriterRunTransportAdapterEntry[];
  summary: string;
}

export interface WriterRunReceiptSourceFile {
  id: string;
  jobId: string;
  fileName: string;
  absolutePath?: string;
  source: WriterRunReceiptSource;
  content: string;
}

export interface WriterRunReceiptEnvelope {
  version: WriterRunReceiptEnvelopeVersion;
  id: string;
  adapterId: WriterRunTransportAdapterId;
  transportId: WriterRunTransportId;
  dispatchId: string;
  correlationId: WriterRunCorrelationId;
  packageId: string;
  requestId: WriterRunRequestId;
  artifactId: string;
  fileName: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  source: WriterRunReceiptSource;
  compatibilityProfile: ReceiptCompatibilityProfile;
  payloadSource: ReceiptPayloadSource;
  payloadFingerprint: ReceiptPayloadFingerprint;
  receiptSequence: number;
  status: WriterRunReceiptOutcomeStatus;
  note: string;
  payload: Record<string, unknown>;
}

export interface WriterRunReceiptIngestionResult {
  id: string;
  sourceFileName: string;
  sourcePath?: string;
  normalizationStatus: ReceiptNormalizationStatus;
  compatibilityProfile: ReceiptCompatibilityProfile;
  payloadSource: ReceiptPayloadSource;
  payloadFingerprint: ReceiptPayloadFingerprint;
  importStatus: WriterRunReceiptImportStatus;
  matchStatus: WriterRunReceiptMatchStatus;
  validationStatus: WriterRunReceiptValidationStatus;
  signatureMatch: ReceiptSignatureMatchResult;
  correlationMatch: DispatchReceiptCorrelationResult;
  dispatchStatus: WriterRunDispatchStatus;
  correlationId?: WriterRunCorrelationId;
  dispatchId?: string;
  artifactId?: string;
  note: string;
  warnings: string[];
  errors: string[];
}

export interface WriterRunReceiptIngestionEntry {
  kind: "writer_run_receipt_ingestion_entry";
  relativePath: string;
  fileName:
    | "writer-run-receipt-normalization.json"
    | "writer-run-receipt-compatibility-profiles.json"
    | "writer-run-receipt-envelopes.json"
    | "writer-run-receipt-import-results.json"
    | "writer-run-receipt-audit-log.json"
    | "writer-run-receipt-history.json";
  payloadKind:
    | "writer_run_receipt_normalization"
    | "writer_run_receipt_compatibility_profiles"
    | "writer_run_receipt_envelopes"
    | "writer_run_receipt_import_results"
    | "writer_run_receipt_audit_log"
    | "writer_run_receipt_history";
  mimeType: "application/json";
  content: string;
  summary: string;
}

export interface WriterRunReceiptIngestionBundle {
  id: string;
  jobId: string;
  deliveryPackageId: string;
  rootRelativePath: string;
  packageId: string;
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
  deliveryPackageSignature: string;
  normalizationResults: ReceiptNormalizationResult[];
  compatibilityProfiles: ReceiptSchemaDescriptor[];
  receipts: WriterRunReceiptEnvelope[];
  results: WriterRunReceiptIngestionResult[];
  auditRecord: WriterRunAuditRecord;
  history: WriterRunAttemptHistory[];
  transportReceipt: WriterRunTransportReceipt;
  status: WriterRunDispatchStatus;
  entries: WriterRunReceiptIngestionEntry[];
  summary: string;
}

export interface TranslationJob {
  id: string;
  jobCode: string;
  title: string;
  status: JobStatus;
  priority: JobPriority;
  workflow: WorkflowKind;
  sourceBundleId: string;
  translationModelId: string;
  deliveryPackageId: string;
  templateId?: string;
  outputPresetId?: string;
  analysisReportId: string;
  createdOn: string;
  updatedOn: string;
  sourceSnapshot: SourceSnapshot;
  mappingSnapshot: MappingSnapshot;
  notes: string;
}

export interface AppSettings {
  defaultTemplateId: string;
  showDenseTables: boolean;
  defaultHandlesFrames: number;
  defaultReferenceVideo: boolean;
  defaultReportGrouping: SettingsReportGrouping;
  localPersistenceEnabled: boolean;
}

export interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  tone: "neutral" | "accent" | "warning" | "danger";
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
}

export interface ConformChangeEvent {
  id: string;
  jobId: string;
  changeType: ChangeType;
  oldTimecode: string;
  newTimecode: string;
  oldFrame: number;
  newFrame: number;
  note: string;
}

export interface TrackMappingOverride {
  mappingId: string;
  targetLane?: string;
  targetType?: TargetType;
  action?: MappingAction;
}

export interface MetadataMappingOverride {
  mappingId: string;
  targetValue?: string;
  status?: MetadataStatus;
}

export interface MarkerReviewDecision {
  markerId: string;
  action: MappingAction;
  note: string;
}

export interface FieldRecorderReviewDecision {
  candidateId: string;
  status: FieldRecorderOverrideStatus;
  note: string;
}

export interface ValidationAcknowledgement {
  issueKey: string;
  status: ValidationReviewStatus;
  note: string;
}

export interface ReconformReviewDecision {
  changeEventId: string;
  status: ReconformReviewStatus;
  note: string;
}

export interface ReviewState {
  version: ReviewStateVersion;
  key: ReviewStateKey;
  jobId: string;
  sourceSignature: string;
  trackOverrides: TrackMappingOverride[];
  metadataOverrides: MetadataMappingOverride[];
  markerDecisions: MarkerReviewDecision[];
  fieldRecorderDecisions: FieldRecorderReviewDecision[];
  validationAcknowledgements: ValidationAcknowledgement[];
  reconformDecisions: ReconformReviewDecision[];
}

export type ReConformChange = ConformChangeEvent;
export type ReconformEvent = ConformChangeEvent;

export type SourceAsset = IntakeAsset;
export type Timeline = NormalizedTimeline;
export type Track = NormalizedTrack;
export type ExportArtifact = DeliveryArtifact;
