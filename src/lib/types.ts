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
