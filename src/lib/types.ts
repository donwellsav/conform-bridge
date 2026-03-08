import type { ReactNode } from "react";

export type JobStatus = "draft" | "queued" | "validating" | "attention" | "ready" | "exported";
export type JobPriority = "low" | "normal" | "high" | "urgent";
export type WorkflowKind = "resolve_to_nuendo";
export type FrameRate = "23.976" | "24" | "25" | "29.97";
export type SourceAssetKind =
  | "aaf"
  | "marker_edl"
  | "marker_csv"
  | "metadata_csv"
  | "manifest"
  | "readme"
  | "reference_video"
  | "field_recorder_report";
export type AssetStatus = "present" | "missing" | "placeholder";
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
export type PreservationScope = "tracks" | "clips" | "metadata" | "routing" | "automation" | "field_recorder";
export type Severity = "critical" | "warning" | "info";
export type SourceRole = "dx" | "fx" | "mx" | "vo" | "printmaster" | "guide";
export type ChannelLayout = "mono" | "stereo" | "lcr" | "5.1";
export type MappingAction = "preserve" | "remap" | "merge" | "ignore";
export type TargetType = "audio_track" | "folder" | "group";
export type MetadataField = "clip_name" | "reel" | "scene" | "take" | "notes" | "track_name" | "source_tc";
export type MetadataStatus = "mapped" | "transformed" | "dropped";
export type EventStartMode = "source_absolute" | "timeline_relative";
export type PullMode = "none" | "up" | "down";
export type FieldRecorderOverrideStatus = "linked" | "unresolved" | "ignored";
export type SettingsReportGrouping = "severity" | "scope";
export type MarkerColor = "blue" | "green" | "yellow" | "red" | "purple";
export type MappingScope = "track" | "metadata" | "field_recorder" | "marker";
export type MappingRuleStatus = "locked" | "review" | "issue";
export type FieldRecorderCandidateStatus = "linked" | "candidate" | "missing";
export type ExportArtifactKind = "nuendo_session_plan" | "marker_package" | "metadata_package" | "import_readme" | "field_recorder_report" | "reference_video";
export type ExportArtifactStatus = "planned" | "blocked" | "placeholder";

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

export interface SourceAsset {
  id: string;
  bundleId: string;
  kind: SourceAssetKind;
  name: string;
  sizeLabel: string;
  status: AssetStatus;
  note: string;
}

export type BundleFile = SourceAsset;
export type BundleFileKind = SourceAssetKind;
export type FileStatus = AssetStatus;

export interface Timeline {
  id: string;
  bundleId: string;
  name: string;
  fps: FrameRate;
  startTimecode: string;
  durationTimecode: string;
  trackIds: string[];
  markerIds: string[];
}

export interface Track {
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
  trackId: string;
  sourceAssetId: string;
  clipName: string;
  recordIn: string;
  recordOut: string;
  sourceTimecode: string;
  scene?: string;
  take?: string;
}

export interface Marker {
  id: string;
  timelineId: string;
  name: string;
  timecode: string;
  color: MarkerColor;
  note: string;
}

export interface SourceBundle {
  id: string;
  name: string;
  timelineId?: string;
  sequenceName: string;
  pictureLock: boolean;
  fps: FrameRate;
  startTimecode: string;
  trackCount: number;
  clipCount: number;
  sampleRate: 48000;
  handlesFrames: number;
  dropFrame: boolean;
  sourceFiles: SourceAsset[];
  assets?: SourceAsset[];
}

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

export interface PreservationFinding {
  id: string;
  severity: Severity;
  code: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  requiresDecision: boolean;
  affectedItems: string[];
}

export type PreservationIssue = PreservationFinding;

export interface PreservationGroup {
  id: string;
  title: string;
  scope: PreservationScope;
  findings: PreservationFinding[];
}

export interface PreservationSummary {
  totalFindings: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  operatorDecisionCount: number;
}

export interface PreservationReport {
  id: string;
  jobId: string;
  summary: PreservationSummary;
  groups: PreservationGroup[];
  updatedOn: string;
}

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

export interface ExportArtifact {
  id: string;
  jobId: string;
  kind: ExportArtifactKind;
  fileName: string;
  status: ExportArtifactStatus;
  note: string;
}

export interface TranslationJob {
  id: string;
  jobCode: string;
  title: string;
  status: JobStatus;
  priority: JobPriority;
  workflow: WorkflowKind;
  sourceBundleId: string;
  timelineId?: string;
  templateId?: string;
  outputPresetId?: string;
  exportArtifactIds?: string[];
  createdOn: string;
  updatedOn: string;
  sourceSnapshot: SourceSnapshot;
  mappingSnapshot: MappingSnapshot;
  preservationReportId: string;
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

export interface ReconformEvent {
  id: string;
  turnover: string;
  sequenceName: string;
  changedEvents: number;
  movedEvents: number;
  deletedEvents: number;
  note: string;
}

export interface NavItem {
  title: string;
  href: string;
  subtitle: string;
  icon: ReactNode;
}
