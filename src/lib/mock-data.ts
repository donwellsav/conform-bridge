import type {
  ActivityItem,
  AppSettings,
  ClipEvent,
  DashboardMetric,
  ExportArtifact,
  FieldRecorderCandidate,
  MappingProfile,
  MappingRule,
  Marker,
  OutputPreset,
  PreservationIssue,
  PreservationReport,
  ReconformEvent,
  SourceAsset,
  SourceBundle,
  Timeline,
  Track,
  TranslationJob,
  TranslationTemplate,
} from "@/lib/types";

export const templates: TranslationTemplate[] = [
  {
    id: "tpl-dialogue-premix",
    name: "Dialogue Premix Turnover",
    category: "dialogue",
    description: "Preserve dialogue roles, split production poly assets, and prepare field recorder metadata for Nuendo editorial.",
    trackPolicy: {
      trackGrouping: "by_role",
      multichannelMode: "split",
      busStrategy: "derive_from_template",
      renamePattern: "DX_{role}_{index}",
    },
    metadataPolicy: {
      clipNameSource: "source_clip",
      reelSource: "source_reel",
      sceneTakeHandling: "preserve",
      notesHandling: "merge",
    },
    fieldRecorderPolicy: {
      enabled: true,
      matchKeys: ["sound_roll", "scene", "take", "timecode"],
      channelAssignment: "mono_expand",
      fallbackBehavior: "mark_unresolved",
    },
    exportDefaults: {
      targetFormat: "nuendo_bundle_placeholder",
      includeReferenceVideo: true,
      includeHandles: true,
      embedNotes: true,
      destinationLabel: "Nuendo Dialogue Prep",
    },
  },
  {
    id: "tpl-fullmix-turnover",
    name: "Full Mix Turnover",
    category: "full_mix",
    description: "Preserve role grouping for dialogue, FX, and music while mirroring source routing where available.",
    trackPolicy: {
      trackGrouping: "by_role",
      multichannelMode: "preserve",
      busStrategy: "mirror_source",
      renamePattern: "{role}_{track}",
    },
    metadataPolicy: {
      clipNameSource: "timeline_name",
      reelSource: "tape",
      sceneTakeHandling: "scene_only",
      notesHandling: "source_only",
    },
    fieldRecorderPolicy: {
      enabled: true,
      matchKeys: ["reel", "scene", "take", "timecode"],
      channelAssignment: "poly_preserve",
      fallbackBehavior: "keep_production_mix",
    },
    exportDefaults: {
      targetFormat: "nuendo_bundle_placeholder",
      includeReferenceVideo: true,
      includeHandles: true,
      embedNotes: false,
      destinationLabel: "Nuendo Full Mix",
    },
  },
  {
    id: "tpl-reconform-revision",
    name: "Revision ReConform",
    category: "reconform",
    description: "Bias for event delta review, preserved IDs, and operator sign-off on moved material.",
    trackPolicy: {
      trackGrouping: "by_index",
      multichannelMode: "preserve",
      busStrategy: "mirror_source",
      renamePattern: "REV_{index}_{role}",
    },
    metadataPolicy: {
      clipNameSource: "reel_plus_tc",
      reelSource: "clip_metadata",
      sceneTakeHandling: "preserve",
      notesHandling: "merge",
    },
    fieldRecorderPolicy: {
      enabled: false,
      matchKeys: ["reel", "timecode"],
      channelAssignment: "template_route",
      fallbackBehavior: "skip",
    },
    exportDefaults: {
      targetFormat: "nuendo_bundle_placeholder",
      includeReferenceVideo: false,
      includeHandles: false,
      embedNotes: true,
      destinationLabel: "Nuendo Revision Pass",
    },
  },
];

export const outputPresets: OutputPreset[] = templates;

const rvrAssets: SourceAsset[] = [
  { id: "asset-rvr-aaf", bundleId: "bundle-rvr-203-r3", kind: "aaf", name: "RVR_203_R3_LOCK.aaf", sizeLabel: "4.2 MB", status: "present", note: "Primary Resolve turnover AAF." },
  { id: "asset-rvr-edl", bundleId: "bundle-rvr-203-r3", kind: "marker_edl", name: "RVR_203_MARKERS.edl", sizeLabel: "118 KB", status: "present", note: "Marker EDL for editorial notes and spotting." },
  { id: "asset-rvr-marker-csv", bundleId: "bundle-rvr-203-r3", kind: "marker_csv", name: "RVR_203_MARKERS.csv", sizeLabel: "72 KB", status: "present", note: "Marker CSV export from Resolve." },
  { id: "asset-rvr-meta", bundleId: "bundle-rvr-203-r3", kind: "metadata_csv", name: "RVR_203_METADATA.csv", sizeLabel: "126 KB", status: "present", note: "Scene, take, reel, and clip metadata extract." },
  { id: "asset-rvr-manifest", bundleId: "bundle-rvr-203-r3", kind: "manifest", name: "manifest.json", sizeLabel: "9 KB", status: "present", note: "Editorial handoff manifest placeholder." },
  { id: "asset-rvr-readme", bundleId: "bundle-rvr-203-r3", kind: "readme", name: "README_NUENDO_IMPORT.txt", sizeLabel: "5 KB", status: "present", note: "Operator instructions for Nuendo intake." },
  { id: "asset-rvr-ref", bundleId: "bundle-rvr-203-r3", kind: "reference_video", name: "RVR_203_R3_REF.mov", sizeLabel: "1.8 GB", status: "present", note: "Reference picture with burn-in." },
  { id: "asset-rvr-field", bundleId: "bundle-rvr-203-r3", kind: "field_recorder_report", name: "RVR_203_FIELD_RECORDER_REPORT.csv", sizeLabel: "44 KB", status: "present", note: "Field recorder matching placeholder report." },
];

const hbrAssets: SourceAsset[] = [
  { id: "asset-hbr-aaf", bundleId: "bundle-hbr-110-r2", kind: "aaf", name: "HBR_110_LOCK_REV_B.aaf", sizeLabel: "2.8 MB", status: "present", note: "Primary Resolve turnover AAF." },
  { id: "asset-hbr-edl", bundleId: "bundle-hbr-110-r2", kind: "marker_edl", name: "HBR_110_MARKERS.edl", sizeLabel: "82 KB", status: "present", note: "Marker EDL with editorial notes." },
  { id: "asset-hbr-marker-csv", bundleId: "bundle-hbr-110-r2", kind: "marker_csv", name: "HBR_110_MARKERS.csv", sizeLabel: "51 KB", status: "present", note: "Resolve marker CSV export." },
  { id: "asset-hbr-meta", bundleId: "bundle-hbr-110-r2", kind: "metadata_csv", name: "HBR_110_METADATA.csv", sizeLabel: "94 KB", status: "present", note: "Metadata CSV with reel and track labels." },
  { id: "asset-hbr-manifest", bundleId: "bundle-hbr-110-r2", kind: "manifest", name: "manifest.json", sizeLabel: "8 KB", status: "present", note: "Editorial manifest placeholder." },
  { id: "asset-hbr-readme", bundleId: "bundle-hbr-110-r2", kind: "readme", name: "README_NUENDO_IMPORT.txt", sizeLabel: "4 KB", status: "present", note: "Import instructions from picture editorial." },
  { id: "asset-hbr-ref", bundleId: "bundle-hbr-110-r2", kind: "reference_video", name: "HBR_110_REF_v08.mov", sizeLabel: "1.2 GB", status: "present", note: "Reference picture with temp mix burn-in." },
  { id: "asset-hbr-field", bundleId: "bundle-hbr-110-r2", kind: "field_recorder_report", name: "HBR_110_FIELD_RECORDER_REPORT.csv", sizeLabel: "29 KB", status: "missing", note: "Expected field recorder report is not bundled yet." },
];

const orbAssets: SourceAsset[] = [
  { id: "asset-orb-aaf", bundleId: "bundle-orb-305-r1", kind: "aaf", name: "ORB_305_LOCK_PREDUB.aaf", sizeLabel: "5.7 MB", status: "present", note: "Primary Resolve turnover AAF." },
  { id: "asset-orb-edl", bundleId: "bundle-orb-305-r1", kind: "marker_edl", name: "ORB_305_MARKERS.edl", sizeLabel: "136 KB", status: "present", note: "Marker EDL for predub spotting." },
  { id: "asset-orb-marker-csv", bundleId: "bundle-orb-305-r1", kind: "marker_csv", name: "ORB_305_MARKERS.csv", sizeLabel: "88 KB", status: "present", note: "Resolve marker CSV export." },
  { id: "asset-orb-meta", bundleId: "bundle-orb-305-r1", kind: "metadata_csv", name: "ORB_305_METADATA.csv", sizeLabel: "144 KB", status: "present", note: "Track and clip metadata export." },
  { id: "asset-orb-manifest", bundleId: "bundle-orb-305-r1", kind: "manifest", name: "manifest.json", sizeLabel: "11 KB", status: "present", note: "Bundle manifest placeholder." },
  { id: "asset-orb-readme", bundleId: "bundle-orb-305-r1", kind: "readme", name: "README_NUENDO_IMPORT.txt", sizeLabel: "6 KB", status: "present", note: "Predub operator intake instructions." },
  { id: "asset-orb-ref", bundleId: "bundle-orb-305-r1", kind: "reference_video", name: "ORB_305_PREDUB_REF.mov", sizeLabel: "2.1 GB", status: "placeholder", note: "Reference picture placeholder pending online publish." },
  { id: "asset-orb-field", bundleId: "bundle-orb-305-r1", kind: "field_recorder_report", name: "ORB_305_FIELD_RECORDER_REPORT.csv", sizeLabel: "61 KB", status: "present", note: "Field recorder candidate report placeholder." },
];

export const sourceBundles: SourceBundle[] = [
  {
    id: "bundle-rvr-203-r3",
    name: "RVR_203_R3_LOCK_TURNOVER",
    timelineId: "timeline-rvr-203-r3",
    sequenceName: "RVR_203_REEL_3_LOCK",
    pictureLock: true,
    fps: "23.976",
    startTimecode: "01:00:00:00",
    trackCount: 42,
    clipCount: 316,
    sampleRate: 48000,
    handlesFrames: 12,
    dropFrame: false,
    sourceFiles: rvrAssets,
    assets: rvrAssets,
  },
  {
    id: "bundle-hbr-110-r2",
    name: "HBR_110_R2_TEMP_MIX",
    timelineId: "timeline-hbr-110-r2",
    sequenceName: "HBR_110_LOCK_REV_B",
    pictureLock: false,
    fps: "24",
    startTimecode: "10:00:00:00",
    trackCount: 28,
    clipCount: 204,
    sampleRate: 48000,
    handlesFrames: 8,
    dropFrame: false,
    sourceFiles: hbrAssets,
    assets: hbrAssets,
  },
  {
    id: "bundle-orb-305-r1",
    name: "ORB_305_PREDUB_DELIVERY",
    timelineId: "timeline-orb-305-r1",
    sequenceName: "ORB_305_LOCK_PREDUB",
    pictureLock: true,
    fps: "25",
    startTimecode: "09:58:30:00",
    trackCount: 56,
    clipCount: 412,
    sampleRate: 48000,
    handlesFrames: 16,
    dropFrame: false,
    sourceFiles: orbAssets,
    assets: orbAssets,
  },
];

export const sourceAssets = [...rvrAssets, ...hbrAssets, ...orbAssets];
export const timelines: Timeline[] = [
  {
    id: "timeline-rvr-203-r3",
    bundleId: "bundle-rvr-203-r3",
    name: "RVR_203_REEL_3_LOCK",
    fps: "23.976",
    startTimecode: "01:00:00:00",
    durationTimecode: "00:48:12:06",
    trackIds: ["track-rvr-dx-1", "track-rvr-dx-2", "track-rvr-fx-1", "track-rvr-guide-1"],
    markerIds: ["marker-rvr-1", "marker-rvr-2"],
  },
  {
    id: "timeline-hbr-110-r2",
    bundleId: "bundle-hbr-110-r2",
    name: "HBR_110_LOCK_REV_B",
    fps: "24",
    startTimecode: "10:00:00:00",
    durationTimecode: "00:42:08:00",
    trackIds: ["track-hbr-dx-1", "track-hbr-vo-1", "track-hbr-fx-1"],
    markerIds: ["marker-hbr-1", "marker-hbr-2"],
  },
  {
    id: "timeline-orb-305-r1",
    bundleId: "bundle-orb-305-r1",
    name: "ORB_305_LOCK_PREDUB",
    fps: "25",
    startTimecode: "09:58:30:00",
    durationTimecode: "00:53:19:12",
    trackIds: ["track-orb-dx-1", "track-orb-fx-1", "track-orb-mx-1"],
    markerIds: ["marker-orb-1", "marker-orb-2"],
  },
];

export const tracks: Track[] = [
  { id: "track-rvr-dx-1", timelineId: "timeline-rvr-203-r3", name: "DX Boom 1", role: "dx", index: 1, channelLayout: "mono", clipEventIds: ["clip-rvr-1", "clip-rvr-2"] },
  { id: "track-rvr-dx-2", timelineId: "timeline-rvr-203-r3", name: "DX Lav 1", role: "dx", index: 2, channelLayout: "mono", clipEventIds: ["clip-rvr-3"] },
  { id: "track-rvr-fx-1", timelineId: "timeline-rvr-203-r3", name: "FX Stereo Stem", role: "fx", index: 15, channelLayout: "stereo", clipEventIds: ["clip-rvr-4"] },
  { id: "track-rvr-guide-1", timelineId: "timeline-rvr-203-r3", name: "ADR Temp", role: "guide", index: 33, channelLayout: "mono", clipEventIds: ["clip-rvr-5"] },
  { id: "track-hbr-dx-1", timelineId: "timeline-hbr-110-r2", name: "DX 1", role: "dx", index: 1, channelLayout: "mono", clipEventIds: ["clip-hbr-1"] },
  { id: "track-hbr-vo-1", timelineId: "timeline-hbr-110-r2", name: "VO 1", role: "vo", index: 8, channelLayout: "mono", clipEventIds: ["clip-hbr-2"] },
  { id: "track-hbr-fx-1", timelineId: "timeline-hbr-110-r2", name: "FX Stem", role: "fx", index: 12, channelLayout: "stereo", clipEventIds: ["clip-hbr-3"] },
  { id: "track-orb-dx-1", timelineId: "timeline-orb-305-r1", name: "DX MAIN", role: "dx", index: 1, channelLayout: "mono", clipEventIds: ["clip-orb-1"] },
  { id: "track-orb-fx-1", timelineId: "timeline-orb-305-r1", name: "FX 5.1", role: "fx", index: 21, channelLayout: "5.1", clipEventIds: ["clip-orb-2"] },
  { id: "track-orb-mx-1", timelineId: "timeline-orb-305-r1", name: "MX Stem", role: "mx", index: 34, channelLayout: "stereo", clipEventIds: ["clip-orb-3"] },
];

export const clipEvents: ClipEvent[] = [
  { id: "clip-rvr-1", trackId: "track-rvr-dx-1", sourceAssetId: "asset-rvr-aaf", clipName: "A203C015_230101", recordIn: "01:04:11:08", recordOut: "01:04:15:12", sourceTimecode: "08:14:11:08", scene: "15A", take: "3" },
  { id: "clip-rvr-2", trackId: "track-rvr-dx-1", sourceAssetId: "asset-rvr-aaf", clipName: "A203C015_230104", recordIn: "01:04:16:01", recordOut: "01:04:18:14", sourceTimecode: "08:14:16:01", scene: "15A", take: "4" },
  { id: "clip-rvr-3", trackId: "track-rvr-dx-2", sourceAssetId: "asset-rvr-aaf", clipName: "A203C015_230105", recordIn: "01:04:18:16", recordOut: "01:04:20:08", sourceTimecode: "08:14:18:16", scene: "15A", take: "4" },
  { id: "clip-rvr-4", trackId: "track-rvr-fx-1", sourceAssetId: "asset-rvr-aaf", clipName: "FX_KITCHEN_PASS", recordIn: "01:04:10:00", recordOut: "01:04:22:00", sourceTimecode: "01:04:10:00" },
  { id: "clip-rvr-5", trackId: "track-rvr-guide-1", sourceAssetId: "asset-rvr-aaf", clipName: "ADR_TEMP_GUIDE", recordIn: "01:04:11:08", recordOut: "01:04:15:12", sourceTimecode: "01:04:11:08" },
  { id: "clip-hbr-1", trackId: "track-hbr-dx-1", sourceAssetId: "asset-hbr-aaf", clipName: "H110_08B_0042", recordIn: "10:14:29:02", recordOut: "10:14:33:22", sourceTimecode: "04:14:29:02", scene: "8B", take: "2" },
  { id: "clip-hbr-2", trackId: "track-hbr-vo-1", sourceAssetId: "asset-hbr-aaf", clipName: "H110_VO_01", recordIn: "10:24:18:10", recordOut: "10:24:21:12", sourceTimecode: "10:24:18:10" },
  { id: "clip-hbr-3", trackId: "track-hbr-fx-1", sourceAssetId: "asset-hbr-aaf", clipName: "H110_FX_STEM", recordIn: "10:14:20:00", recordOut: "10:14:39:00", sourceTimecode: "10:14:20:00" },
  { id: "clip-orb-1", trackId: "track-orb-dx-1", sourceAssetId: "asset-orb-aaf", clipName: "ORB305_21C_112", recordIn: "10:08:44:12", recordOut: "10:08:48:20", sourceTimecode: "10:08:44:12", scene: "21C", take: "1" },
  { id: "clip-orb-2", trackId: "track-orb-fx-1", sourceAssetId: "asset-orb-aaf", clipName: "ORB305_FX_51", recordIn: "10:08:40:00", recordOut: "10:08:52:00", sourceTimecode: "10:08:40:00" },
  { id: "clip-orb-3", trackId: "track-orb-mx-1", sourceAssetId: "asset-orb-aaf", clipName: "ORB305_MX_STEM", recordIn: "10:08:40:00", recordOut: "10:08:52:00", sourceTimecode: "10:08:40:00" },
];

export const markers: Marker[] = [
  { id: "marker-rvr-1", timelineId: "timeline-rvr-203-r3", name: "Kitchen pickup", timecode: "01:04:11:08", color: "yellow", note: "Guide vocals still active in this passage." },
  { id: "marker-rvr-2", timelineId: "timeline-rvr-203-r3", name: "Printmaster check", timecode: "01:38:24:10", color: "red", note: "Combined printmaster requires operator lane decision." },
  { id: "marker-hbr-1", timelineId: "timeline-hbr-110-r2", name: "VO split", timecode: "10:24:18:10", color: "purple", note: "VO lane should remain separate from DX." },
  { id: "marker-hbr-2", timelineId: "timeline-hbr-110-r2", name: "Missing report", timecode: "10:14:29:02", color: "red", note: "Field recorder report asset is missing from the bundle." },
  { id: "marker-orb-1", timelineId: "timeline-orb-305-r1", name: "Predub start", timecode: "10:08:40:00", color: "green", note: "Predub delivery tracks align with full mix preset." },
  { id: "marker-orb-2", timelineId: "timeline-orb-305-r1", name: "Reference video placeholder", timecode: "10:08:44:12", color: "blue", note: "Online reference movie pending." },
];

export const jobs: TranslationJob[] = [
  {
    id: "job-rvr-203",
    jobCode: "JB-2407",
    title: "Riverside Episode 203 Dialogue Prep",
    status: "attention",
    priority: "high",
    workflow: "resolve_to_nuendo",
    sourceBundleId: "bundle-rvr-203-r3",
    timelineId: "timeline-rvr-203-r3",
    templateId: "tpl-dialogue-premix",
    outputPresetId: "tpl-dialogue-premix",
    exportArtifactIds: ["artifact-rvr-plan", "artifact-rvr-markers", "artifact-rvr-readme"],
    createdOn: "2026-02-21",
    updatedOn: "2026-03-07",
    sourceSnapshot: {
      sequenceName: "RVR_203_REEL_3_LOCK",
      clipCount: 316,
      trackCount: 42,
      unresolvedMediaCount: 2,
      revisionLabel: "R3 lock",
    },
    mappingSnapshot: {
      mappedTrackCount: 38,
      preservedMetadataCount: 6,
      unresolvedCount: 3,
      fieldRecorderLinkedCount: 84,
    },
    preservationReportId: "report-rvr-203",
    notes: "ADR guide lanes and printmaster grouping still need operator review before the bundle-out placeholder is considered clean.",
  },
  {
    id: "job-hbr-110",
    jobCode: "JB-2410",
    title: "Harbor 110 Temp Mix Prep",
    status: "validating",
    priority: "normal",
    workflow: "resolve_to_nuendo",
    sourceBundleId: "bundle-hbr-110-r2",
    timelineId: "timeline-hbr-110-r2",
    templateId: "tpl-fullmix-turnover",
    outputPresetId: "tpl-fullmix-turnover",
    exportArtifactIds: ["artifact-hbr-plan", "artifact-hbr-metadata", "artifact-hbr-field"],
    createdOn: "2026-02-26",
    updatedOn: "2026-03-06",
    sourceSnapshot: {
      sequenceName: "HBR_110_LOCK_REV_B",
      clipCount: 204,
      trackCount: 28,
      unresolvedMediaCount: 1,
      revisionLabel: "Rev B",
    },
    mappingSnapshot: {
      mappedTrackCount: 24,
      preservedMetadataCount: 5,
      unresolvedCount: 1,
      fieldRecorderLinkedCount: 28,
    },
    preservationReportId: "report-hbr-110",
    notes: "Bundle is structurally usable, but the field recorder report placeholder is missing and VO should stay isolated from DX.",
  },
  {
    id: "job-orb-305",
    jobCode: "JB-2413",
    title: "Orbit 305 Predub Turnover",
    status: "ready",
    priority: "urgent",
    workflow: "resolve_to_nuendo",
    sourceBundleId: "bundle-orb-305-r1",
    timelineId: "timeline-orb-305-r1",
    templateId: "tpl-fullmix-turnover",
    outputPresetId: "tpl-fullmix-turnover",
    exportArtifactIds: ["artifact-orb-plan", "artifact-orb-reference", "artifact-orb-readme"],
    createdOn: "2026-03-01",
    updatedOn: "2026-03-08",
    sourceSnapshot: {
      sequenceName: "ORB_305_LOCK_PREDUB",
      clipCount: 412,
      trackCount: 56,
      unresolvedMediaCount: 0,
      revisionLabel: "Predub delivery",
    },
    mappingSnapshot: {
      mappedTrackCount: 56,
      preservedMetadataCount: 7,
      unresolvedCount: 0,
      fieldRecorderLinkedCount: 112,
    },
    preservationReportId: "report-orb-305",
    notes: "Structurally ready for a Nuendo-ready bundle placeholder; only the reference video stays marked as placeholder.",
  },
];

export const exportArtifacts: ExportArtifact[] = [
  { id: "artifact-rvr-plan", jobId: "job-rvr-203", kind: "nuendo_session_plan", fileName: "JB-2407_RVR_203_nuendo_session_plan.txt", status: "planned", note: "Placeholder session plan, not a real Nuendo file." },
  { id: "artifact-rvr-markers", jobId: "job-rvr-203", kind: "marker_package", fileName: "JB-2407_RVR_203_marker_package.csv", status: "planned", note: "Marker handoff package placeholder." },
  { id: "artifact-rvr-readme", jobId: "job-rvr-203", kind: "import_readme", fileName: "JB-2407_README_NUENDO_IMPORT.txt", status: "planned", note: "Import guidance for operator review." },
  { id: "artifact-hbr-plan", jobId: "job-hbr-110", kind: "nuendo_session_plan", fileName: "JB-2410_HBR_110_nuendo_session_plan.txt", status: "planned", note: "Placeholder session plan only." },
  { id: "artifact-hbr-metadata", jobId: "job-hbr-110", kind: "metadata_package", fileName: "JB-2410_HBR_110_metadata_package.csv", status: "planned", note: "Metadata export placeholder." },
  { id: "artifact-hbr-field", jobId: "job-hbr-110", kind: "field_recorder_report", fileName: "JB-2410_HBR_110_field_recorder_review.csv", status: "blocked", note: "Blocked until missing bundle report is reconciled." },
  { id: "artifact-orb-plan", jobId: "job-orb-305", kind: "nuendo_session_plan", fileName: "JB-2413_ORB_305_nuendo_session_plan.txt", status: "planned", note: "Ready placeholder for operator sign-off." },
  { id: "artifact-orb-reference", jobId: "job-orb-305", kind: "reference_video", fileName: "JB-2413_ORB_305_reference_video.mov", status: "placeholder", note: "Online reference video pending publish." },
  { id: "artifact-orb-readme", jobId: "job-orb-305", kind: "import_readme", fileName: "JB-2413_README_NUENDO_IMPORT.txt", status: "planned", note: "Operator handoff instructions." },
];
export const preservationReports: PreservationReport[] = [
  {
    id: "report-rvr-203",
    jobId: "job-rvr-203",
    updatedOn: "2026-03-07",
    summary: {
      totalFindings: 6,
      criticalCount: 1,
      warningCount: 3,
      infoCount: 2,
      operatorDecisionCount: 2,
    },
    groups: [
      {
        id: "group-rvr-routing",
        title: "Routing Preservation",
        scope: "routing",
        findings: [
          {
            id: "finding-rvr-printmaster",
            severity: "critical",
            code: "ROUTING_PRINTMASTER_DROP",
            title: "Printmaster stems do not map cleanly to preset buses",
            description: "Resolve routing exposes combined printmaster stems without discrete DX/FX/MX split metadata.",
            impact: "The Nuendo-ready placeholder cannot show a final bus split without manual operator review.",
            recommendation: "Assign a temporary printmaster group and flag it for phase 2 translation logic.",
            requiresDecision: true,
            affectedItems: ["PM_ST_L", "PM_ST_R"],
          },
          {
            id: "finding-rvr-guide",
            severity: "warning",
            code: "GUIDE_TRACKS_PRESENT",
            title: "Guide vocals are still active in the turnover",
            description: "Guide lanes were exported active and will remain visible in the scaffolded mapping view.",
            impact: "Dialogue editorial may receive tracks that should eventually be auto-suppressed.",
            recommendation: "Keep guide lanes in a review-only folder for now.",
            requiresDecision: true,
            affectedItems: ["GUIDE_1", "GUIDE_2"],
          },
        ],
      },
      {
        id: "group-rvr-field",
        title: "Field Recorder Linking",
        scope: "field_recorder",
        findings: [
          {
            id: "finding-rvr-roll",
            severity: "warning",
            code: "SOUND_ROLL_GAPS",
            title: "Two clips are missing matching sound roll metadata",
            description: "Scene and take values exist, but sound roll values are blank for two production events.",
            impact: "Automatic relink would leave those events unresolved.",
            recommendation: "Keep them visible as candidates until real matching exists in phase 2.",
            requiresDecision: false,
            affectedItems: ["A203C015_230101", "A203C015_230104"],
          },
          {
            id: "finding-rvr-scene",
            severity: "info",
            code: "SCENE_TAKE_PRESERVED",
            title: "Scene and take values preserve cleanly",
            description: "Dialogue events retain stable scene and take values in the metadata placeholder flow.",
            impact: "Field recorder candidate matching remains credible in the scaffold.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["DX production events"],
          },
        ],
      },
      {
        id: "group-rvr-metadata",
        title: "Metadata Preservation",
        scope: "metadata",
        findings: [
          {
            id: "finding-rvr-notes",
            severity: "warning",
            code: "EDITORIAL_NOTES_TRUNCATED",
            title: "Long editorial notes exceed current placeholder width",
            description: "The scaffold truncates very long editorial notes in dense table cells.",
            impact: "Operators can see the issue, but the final writer behavior is still undefined.",
            recommendation: "Keep notes visible in side panels until export logic exists.",
            requiresDecision: false,
            affectedItems: ["Clip note set 12"],
          },
          {
            id: "finding-rvr-reel",
            severity: "info",
            code: "REEL_NAMES_STABLE",
            title: "Reel names normalize cleanly",
            description: "Source reel values already match the current preset expectation.",
            impact: "No phase 1 operator action is required.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["All reel fields"],
          },
        ],
      },
    ],
  },
  {
    id: "report-hbr-110",
    jobId: "job-hbr-110",
    updatedOn: "2026-03-06",
    summary: {
      totalFindings: 4,
      criticalCount: 0,
      warningCount: 2,
      infoCount: 2,
      operatorDecisionCount: 1,
    },
    groups: [
      {
        id: "group-hbr-field",
        title: "Field Recorder Readiness",
        scope: "field_recorder",
        findings: [
          {
            id: "finding-hbr-missing-roll",
            severity: "warning",
            code: "MISSING_FIELD_REPORT",
            title: "Field recorder report placeholder is missing from the bundle",
            description: "The expected field recorder matching report is not present in the intake bundle.",
            impact: "The output placeholder remains blocked for that artifact.",
            recommendation: "Keep the blocked artifact visible instead of faking completeness.",
            requiresDecision: true,
            affectedItems: ["HBR_110_FIELD_RECORDER_REPORT.csv"],
          },
          {
            id: "finding-hbr-timecode",
            severity: "info",
            code: "TIMECODE_MATCH_OK",
            title: "Timeline and source timecode bases match",
            description: "No pull adjustments are required for this fixture bundle.",
            impact: "The timecode policy can remain source-absolute.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["Timeline base"],
          },
        ],
      },
      {
        id: "group-hbr-routing",
        title: "Track Grouping",
        scope: "tracks",
        findings: [
          {
            id: "finding-hbr-vo",
            severity: "warning",
            code: "VO_ROLE_MERGED",
            title: "Voice-over lane should stay isolated from dialogue",
            description: "The source turnover tags VO close to DX material.",
            impact: "Operators need a visible reminder to keep the VO lane separate in Nuendo prep.",
            recommendation: "Leave the VO mapping in review state.",
            requiresDecision: false,
            affectedItems: ["VO_1"],
          },
          {
            id: "finding-hbr-template",
            severity: "info",
            code: "PRESET_ALIGNMENT_OK",
            title: "Selected preset matches turnover density",
            description: "The full mix preset covers the current role spread.",
            impact: "Preset replacement is unnecessary in phase 1.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["Full Mix Turnover"],
          },
        ],
      },
    ],
  },
  {
    id: "report-orb-305",
    jobId: "job-orb-305",
    updatedOn: "2026-03-08",
    summary: {
      totalFindings: 3,
      criticalCount: 0,
      warningCount: 1,
      infoCount: 2,
      operatorDecisionCount: 0,
    },
    groups: [
      {
        id: "group-orb-video",
        title: "Reference Picture",
        scope: "clips",
        findings: [
          {
            id: "finding-orb-video",
            severity: "warning",
            code: "REFERENCE_VIDEO_PLACEHOLDER",
            title: "Reference picture remains a placeholder asset",
            description: "The reference movie is intentionally flagged placeholder rather than pretending it exists.",
            impact: "Audio prep looks ready while picture remains explicitly pending.",
            recommendation: "Keep the placeholder visible until a real online publish is available.",
            requiresDecision: false,
            affectedItems: ["ORB_305_PREDUB_REF.mov"],
          },
        ],
      },
      {
        id: "group-orb-metadata",
        title: "Metadata Integrity",
        scope: "metadata",
        findings: [
          {
            id: "finding-orb-reel",
            severity: "info",
            code: "REEL_FIELDS_PRESERVED",
            title: "Reel and source timecode fields preserve cleanly",
            description: "Reel and timecode metadata line up with the selected preset.",
            impact: "The bundle-out placeholder can stay simple.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["All primary tracks"],
          },
          {
            id: "finding-orb-track",
            severity: "info",
            code: "TRACK_ROLE_DENSITY_OK",
            title: "Track role density fits preset lanes",
            description: "The current source track map fits comfortably inside the planned Nuendo lane structure.",
            impact: "Operators can treat this bundle as the clean reference fixture.",
            recommendation: "No action required.",
            requiresDecision: false,
            affectedItems: ["DX, FX, MX folders"],
          },
        ],
      },
    ],
  },
];

export const preservationIssues: PreservationIssue[] = preservationReports.flatMap((report) => report.groups.flatMap((group) => group.findings));
export const mappingProfiles: MappingProfile[] = [
  {
    id: "mapping-rvr-203",
    jobId: "job-rvr-203",
    timecodePolicy: {
      timelineStart: "01:00:00:00",
      eventStartMode: "source_absolute",
      pullMode: "none",
      dropFrame: false,
    },
    trackMappings: [
      { id: "tm-rvr-1", sourceTrack: "DX Boom 1", sourceRole: "dx", channelLayout: "mono", targetLane: "DX A", targetType: "audio_track", action: "preserve" },
      { id: "tm-rvr-2", sourceTrack: "DX Lav 1", sourceRole: "dx", channelLayout: "mono", targetLane: "DX B", targetType: "audio_track", action: "preserve" },
      { id: "tm-rvr-3", sourceTrack: "ADR Temp", sourceRole: "guide", channelLayout: "mono", targetLane: "Guide Review", targetType: "folder", action: "ignore" },
      { id: "tm-rvr-4", sourceTrack: "FX Stereo Stem", sourceRole: "fx", channelLayout: "stereo", targetLane: "FX Stem", targetType: "group", action: "remap" },
      { id: "tm-rvr-5", sourceTrack: "Printmaster ST", sourceRole: "printmaster", channelLayout: "stereo", targetLane: "Printmaster Temp", targetType: "group", action: "merge" },
    ],
    metadataMappings: [
      { id: "mm-rvr-1", field: "clip_name", sourceValue: "A203C015_230101", targetValue: "A203C015_230101", status: "mapped" },
      { id: "mm-rvr-2", field: "reel", sourceValue: "RVR203A", targetValue: "RVR203A", status: "mapped" },
      { id: "mm-rvr-3", field: "scene", sourceValue: "15A", targetValue: "15A", status: "mapped" },
      { id: "mm-rvr-4", field: "take", sourceValue: "3", targetValue: "3", status: "mapped" },
      { id: "mm-rvr-5", field: "notes", sourceValue: "Boom shadow in line 4, prefer lav alternate if available.", targetValue: "Boom shadow in line 4, prefer lav alternate if available.", status: "transformed" },
    ],
    fieldRecorderOverrides: [
      { id: "fro-rvr-1", matchField: "sound_roll", sourceValue: "", targetValue: "54A", status: "linked" },
      { id: "fro-rvr-2", matchField: "scene", sourceValue: "15A", targetValue: "15A", status: "linked" },
      { id: "fro-rvr-3", matchField: "take", sourceValue: "4", targetValue: "4", status: "linked" },
      { id: "fro-rvr-4", matchField: "timecode", sourceValue: "01:04:11:18", targetValue: "01:04:11:18", status: "unresolved" },
    ],
  },
  {
    id: "mapping-hbr-110",
    jobId: "job-hbr-110",
    timecodePolicy: {
      timelineStart: "10:00:00:00",
      eventStartMode: "source_absolute",
      pullMode: "none",
      dropFrame: false,
    },
    trackMappings: [
      { id: "tm-hbr-1", sourceTrack: "DX 1", sourceRole: "dx", channelLayout: "mono", targetLane: "DX A", targetType: "audio_track", action: "preserve" },
      { id: "tm-hbr-2", sourceTrack: "VO 1", sourceRole: "vo", channelLayout: "mono", targetLane: "VO Folder", targetType: "folder", action: "remap" },
      { id: "tm-hbr-3", sourceTrack: "FX Stem", sourceRole: "fx", channelLayout: "stereo", targetLane: "FX Stem", targetType: "group", action: "preserve" },
      { id: "tm-hbr-4", sourceTrack: "Temp Mix", sourceRole: "guide", channelLayout: "stereo", targetLane: "Guide Review", targetType: "folder", action: "ignore" },
    ],
    metadataMappings: [
      { id: "mm-hbr-1", field: "clip_name", sourceValue: "H110_08B_0042", targetValue: "H110_08B_0042", status: "mapped" },
      { id: "mm-hbr-2", field: "reel", sourceValue: "8H", targetValue: "8H", status: "mapped" },
      { id: "mm-hbr-3", field: "track_name", sourceValue: "VO 1", targetValue: "VO Folder", status: "transformed" },
    ],
    fieldRecorderOverrides: [
      { id: "fro-hbr-1", matchField: "reel", sourceValue: "8H", targetValue: "8H", status: "unresolved" },
      { id: "fro-hbr-2", matchField: "timecode", sourceValue: "10:14:29:02", targetValue: "10:14:29:02", status: "linked" },
    ],
  },
  {
    id: "mapping-orb-305",
    jobId: "job-orb-305",
    timecodePolicy: {
      timelineStart: "09:58:30:00",
      eventStartMode: "source_absolute",
      pullMode: "none",
      dropFrame: false,
    },
    trackMappings: [
      { id: "tm-orb-1", sourceTrack: "DX MAIN", sourceRole: "dx", channelLayout: "mono", targetLane: "DX A", targetType: "audio_track", action: "preserve" },
      { id: "tm-orb-2", sourceTrack: "DX ALT", sourceRole: "dx", channelLayout: "mono", targetLane: "DX B", targetType: "audio_track", action: "preserve" },
      { id: "tm-orb-3", sourceTrack: "FX 5.1", sourceRole: "fx", channelLayout: "5.1", targetLane: "FX 5.1", targetType: "group", action: "preserve" },
      { id: "tm-orb-4", sourceTrack: "MX Stem", sourceRole: "mx", channelLayout: "stereo", targetLane: "MX Stem", targetType: "group", action: "preserve" },
    ],
    metadataMappings: [
      { id: "mm-orb-1", field: "clip_name", sourceValue: "ORB305_21C_112", targetValue: "ORB305_21C_112", status: "mapped" },
      { id: "mm-orb-2", field: "reel", sourceValue: "ORB305B", targetValue: "ORB305B", status: "mapped" },
      { id: "mm-orb-3", field: "source_tc", sourceValue: "10:08:44:12", targetValue: "10:08:44:12", status: "mapped" },
    ],
    fieldRecorderOverrides: [
      { id: "fro-orb-1", matchField: "sound_roll", sourceValue: "74C", targetValue: "74C", status: "linked" },
      { id: "fro-orb-2", matchField: "scene", sourceValue: "21C", targetValue: "21C", status: "linked" },
    ],
  },
];

export const mappingRules: MappingRule[] = [
  { id: "rule-rvr-1", jobId: "job-rvr-203", scope: "track", source: "Printmaster ST", target: "Printmaster Temp", action: "merge", status: "issue", note: "Requires manual premix decision." },
  { id: "rule-rvr-2", jobId: "job-rvr-203", scope: "field_recorder", source: "sound_roll=<empty>", target: "54A", action: "remap", status: "review", note: "Derived from operator override." },
  { id: "rule-hbr-1", jobId: "job-hbr-110", scope: "track", source: "VO 1", target: "VO Folder", action: "remap", status: "review", note: "Keep VO separate from DX." },
  { id: "rule-hbr-2", jobId: "job-hbr-110", scope: "metadata", source: "reel=8H", target: "reel=8H", action: "preserve", status: "locked", note: "Reel naming remains stable." },
  { id: "rule-orb-1", jobId: "job-orb-305", scope: "track", source: "FX 5.1", target: "FX 5.1", action: "preserve", status: "locked", note: "Straight lane preservation." },
  { id: "rule-orb-2", jobId: "job-orb-305", scope: "metadata", source: "source_tc", target: "source_tc", action: "preserve", status: "locked", note: "Source timecode passes through unchanged." },
];

export const fieldRecorderCandidates: FieldRecorderCandidate[] = [
  {
    id: "frc-rvr-1",
    jobId: "job-rvr-203",
    clipEventId: "clip-rvr-2",
    matchKeys: { scene: "15A", take: "4", timecode: "01:04:16:01" },
    status: "candidate",
    candidateAssetName: "SoundRoll_54A",
    note: "Sound roll missing in clip metadata, candidate inferred from adjacent events.",
  },
  {
    id: "frc-hbr-1",
    jobId: "job-hbr-110",
    clipEventId: "clip-hbr-1",
    matchKeys: { reel: "8H", timecode: "10:14:29:02" },
    status: "missing",
    candidateAssetName: "ProdAudio_Roll_8H",
    note: "Expected production roll not bundled.",
  },
  {
    id: "frc-orb-1",
    jobId: "job-orb-305",
    clipEventId: "clip-orb-1",
    matchKeys: { sound_roll: "74C", scene: "21C", take: "1", timecode: "10:08:44:12" },
    status: "linked",
    candidateAssetName: "SoundRoll_74C",
    note: "Best-case field recorder fixture.",
  },
];

export const defaultSettings: AppSettings = {
  defaultTemplateId: "tpl-dialogue-premix",
  showDenseTables: true,
  defaultHandlesFrames: 12,
  defaultReferenceVideo: true,
  defaultReportGrouping: "severity",
  localPersistenceEnabled: true,
};

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Open jobs", value: "03", note: "Two active turnovers and one ready bundle-out placeholder.", tone: "neutral" },
  { label: "Operator decisions", value: "03", note: "Routing and field recorder review remain open.", tone: "warning" },
  { label: "Planned bundle outs", value: "09", note: "Export artifacts are modeled as planned outputs only.", tone: "accent" },
  { label: "Missing inputs", value: "01", note: "One intake bundle is missing a field recorder report asset.", tone: "danger" },
];

export const activityFeed: ActivityItem[] = [
  { id: "act-1", timestamp: "2026-03-08 10:14", title: "JB-2413 marked ready", detail: "Predub turnover is the clean reference fixture for bundle-out placeholders." },
  { id: "act-2", timestamp: "2026-03-07 16:48", title: "JB-2407 preservation warning added", detail: "Guide vocals remain active and printmaster stems need manual lane assignment." },
  { id: "act-3", timestamp: "2026-03-06 12:05", title: "JB-2410 missing bundle report", detail: "Field recorder matching report asset is explicitly marked missing." },
];

export const reconformEvents: ReconformEvent[] = [
  {
    id: "rec-1",
    turnover: "RVR_203_R3 to R4",
    sequenceName: "RVR_203_REEL_3_LOCK",
    changedEvents: 18,
    movedEvents: 6,
    deletedEvents: 2,
    note: "Kitchen pickup sequence shifts around dialogue cues and requires compare review.",
  },
  {
    id: "rec-2",
    turnover: "HBR_110 Rev A to Rev B",
    sequenceName: "HBR_110_LOCK_REV_B",
    changedEvents: 9,
    movedEvents: 3,
    deletedEvents: 1,
    note: "VO lane is retagged close to dialogue and should stay isolated in the mapping placeholder.",
  },
];

export const fieldRecorderWatchlist = [
  {
    id: "fr-1",
    clip: "A203C015_230104",
    issue: "Missing sound roll value",
    fallback: "Scene/take plus timecode candidate",
  },
  {
    id: "fr-2",
    clip: "H110_08B_0042",
    issue: "Field recorder report asset is missing",
    fallback: "Keep bundle-out artifact blocked",
  },
  {
    id: "fr-3",
    clip: "ORB305_21C_112",
    issue: "Reference picture remains placeholder only",
    fallback: "Audio matching still reads as linked",
  },
];
const bundleMap = new Map(sourceBundles.map((bundle) => [bundle.id, bundle]));
const templateMap = new Map(templates.map((template) => [template.id, template]));
const timelineMap = new Map(timelines.map((timeline) => [timeline.id, timeline]));
const reportMap = new Map(preservationReports.map((report) => [report.id, report]));
const mappingMap = new Map(mappingProfiles.map((profile) => [profile.jobId, profile]));
const jobMap = new Map(jobs.map((job) => [job.id, job]));

export function getBundle(bundleId: string): SourceBundle | undefined {
  return bundleMap.get(bundleId);
}

export function getTemplate(templateId?: string): TranslationTemplate | undefined {
  if (!templateId) {
    return undefined;
  }

  return templateMap.get(templateId);
}

export function getOutputPreset(outputPresetId?: string): OutputPreset | undefined {
  if (!outputPresetId) {
    return undefined;
  }

  return templateMap.get(outputPresetId);
}

export function getTimeline(timelineId?: string): Timeline | undefined {
  if (!timelineId) {
    return undefined;
  }

  return timelineMap.get(timelineId);
}

export function getJob(jobId: string): TranslationJob | undefined {
  return jobMap.get(jobId);
}

export function getReport(reportId: string): PreservationReport | undefined {
  return reportMap.get(reportId);
}

export function getMappingProfile(jobId: string): MappingProfile | undefined {
  return mappingMap.get(jobId);
}

export function getExportArtifacts(jobId: string): ExportArtifact[] {
  return exportArtifacts.filter((artifact) => artifact.jobId === jobId);
}
