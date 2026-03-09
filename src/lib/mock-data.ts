import type {
  ActivityItem,
  AnalysisGroup,
  AnalysisReport,
  AppSettings,
  ClipEvent,
  ConformChangeEvent,
  DashboardMetric,
  DeliveryArtifact,
  DeliveryPackage,
  FieldRecorderCandidate,
  IntakeAsset,
  MappingProfile,
  MappingRule,
  Marker,
  OutputPreset,
  PreservationIssue,
  SourceBundle,
  Timeline,
  Track,
  TranslationJob,
  TranslationModel,
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

const intakeAssets: IntakeAsset[] = [
  {
    id: "asset-rvr-aaf",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "resolve",
    fileKind: "aaf",
    fileRole: "timeline_exchange",
    name: "RVR_203_R3_LOCK.aaf",
    sizeLabel: "4.2 MB",
    status: "present",
    note: "Primary Resolve turnover AAF with editorial event layout.",
  },
  {
    id: "asset-rvr-fcpxml",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "resolve",
    fileKind: "fcpxml",
    fileRole: "timeline_exchange",
    name: "RVR_203_R3_LOCK.fcpxml",
    sizeLabel: "612 KB",
    status: "present",
    note: "Alternate timeline exchange from Resolve for structure validation.",
  },
  {
    id: "asset-rvr-edl",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "editorial",
    fileKind: "edl",
    fileRole: "timeline_exchange",
    name: "RVR_203_AUDIO_PULL.edl",
    sizeLabel: "138 KB",
    status: "present",
    note: "Editorial pull list used for conform spot checks.",
  },
  {
    id: "asset-rvr-metadata",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "editorial",
    fileKind: "csv",
    fileRole: "metadata_export",
    name: "RVR_203_METADATA.csv",
    sizeLabel: "126 KB",
    status: "present",
    note: "Scene, take, reel, and production note extract from editorial.",
  },
  {
    id: "asset-rvr-ref",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "editorial",
    fileKind: "mov",
    fileRole: "reference_video",
    name: "RVR_203_R3_REF.mov",
    sizeLabel: "1.8 GB",
    status: "present",
    note: "Reference picture with burn-in and leader.",
    durationTimecode: "00:48:12:00",
    durationFrames: 69408,
  },
  {
    id: "asset-rvr-roll54a-poly",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "production-audio",
    fileKind: "bwf",
    fileRole: "production_audio",
    name: "ROLL_054A_01.BWF",
    sizeLabel: "2.4 GB",
    status: "present",
    note: "Primary polywav production roll with boom and lav iso channels.",
    channelCount: 8,
    channelLayout: "poly_8",
    durationTimecode: "00:32:14:00",
    durationFrames: 46416,
    sampleRate: 48000,
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
  },
  {
    id: "asset-rvr-roll54a-lav",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "production-audio",
    fileKind: "wav",
    fileRole: "production_audio",
    name: "ROLL_054A_LAV_ALT.WAV",
    sizeLabel: "412 MB",
    status: "present",
    note: "Mono lav safety track exported separately by production sound.",
    channelCount: 1,
    channelLayout: "mono",
    durationTimecode: "00:07:08:00",
    durationFrames: 10272,
    sampleRate: 48000,
    isPolyWav: false,
    hasBwf: false,
    hasIXml: false,
  },
  {
    id: "asset-rvr-roll54b-poly",
    bundleId: "bundle-rvr-203-r3",
    stage: "intake",
    origin: "production-audio",
    fileKind: "bwf",
    fileRole: "production_audio",
    name: "ROLL_054B_02.BWF",
    sizeLabel: "2.1 GB",
    status: "missing",
    note: "Expected alternate production roll is referenced by metadata but was not delivered.",
    channelCount: 8,
    channelLayout: "poly_8",
    durationTimecode: "00:28:00:00",
    durationFrames: 40320,
    sampleRate: 48000,
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
  },
];

export const sourceBundles: SourceBundle[] = [
  {
    id: "bundle-rvr-203-r3",
    name: "RVR_203_R3_LOCK_TURNOVER",
    stage: "intake",
    receivedFrom: "editorial",
    sequenceName: "RVR_203_REEL_3_LOCK",
    pictureLock: true,
    fps: "24",
    startTimecode: "01:00:00:00",
    startFrame: 86400,
    durationTimecode: "00:48:12:00",
    durationFrames: 69408,
    trackCount: 4,
    clipCount: 5,
    markerCount: 3,
    sampleRate: 48000,
    handlesFrames: 12,
    dropFrame: false,
    assets: intakeAssets,
  },
];

export const sourceAssets = intakeAssets;

export const translationModels: TranslationModel[] = [
  {
    id: "model-rvr-203",
    jobId: "job-rvr-203",
    sourceBundleId: "bundle-rvr-203-r3",
    workflow: "resolve_to_nuendo",
    name: "RVR 203 Reel 3 Canonical Model",
    primaryTimelineId: "timeline-rvr-203-r3",
    normalizedTimelineIds: ["timeline-rvr-203-r3"],
    analysisReportId: "report-rvr-203",
    deliveryPackageId: "delivery-rvr-203",
  },
];

export const timelines: Timeline[] = [
  {
    id: "timeline-rvr-203-r3",
    translationModelId: "model-rvr-203",
    name: "RVR_203_REEL_3_LOCK",
    fps: "24",
    sampleRate: 48000,
    dropFrame: false,
    startTimecode: "01:00:00:00",
    durationTimecode: "00:48:12:00",
    startFrame: 86400,
    durationFrames: 69408,
    trackIds: ["track-rvr-dx-1", "track-rvr-dx-2", "track-rvr-fx-1", "track-rvr-guide-1"],
    markerIds: ["marker-rvr-1", "marker-rvr-2", "marker-rvr-3"],
  },
];

export const tracks: Track[] = [
  { id: "track-rvr-dx-1", timelineId: "timeline-rvr-203-r3", name: "DX Boom 1", role: "dx", index: 1, channelLayout: "mono", clipEventIds: ["clip-rvr-1", "clip-rvr-2"] },
  { id: "track-rvr-dx-2", timelineId: "timeline-rvr-203-r3", name: "DX Lav 1", role: "dx", index: 2, channelLayout: "mono", clipEventIds: ["clip-rvr-3", "clip-rvr-5"] },
  { id: "track-rvr-fx-1", timelineId: "timeline-rvr-203-r3", name: "FX Stereo Stem", role: "fx", index: 15, channelLayout: "stereo", clipEventIds: ["clip-rvr-4"] },
  { id: "track-rvr-guide-1", timelineId: "timeline-rvr-203-r3", name: "ADR Temp", role: "guide", index: 33, channelLayout: "mono", clipEventIds: [] },
];

export const clipEvents: ClipEvent[] = [
  {
    id: "clip-rvr-1",
    timelineId: "timeline-rvr-203-r3",
    trackId: "track-rvr-dx-1",
    sourceAssetId: "asset-rvr-roll54a-poly",
    clipName: "A203C015_230101",
    sourceFileName: "ROLL_054A_01.BWF",
    reel: "RVR203A",
    tape: "054A",
    scene: "15A",
    take: "3",
    eventDescription: "Boom production take used for the kitchen exchange.",
    clipNotes: "Clean boom read. Prefer over lav for first half of the line.",
    recordIn: "01:04:11:08",
    recordOut: "01:04:15:12",
    sourceIn: "08:14:11:08",
    sourceOut: "08:14:15:12",
    recordInFrames: 92432,
    recordOutFrames: 92532,
    sourceInFrames: 711632,
    sourceOutFrames: 711732,
    channelCount: 1,
    channelLayout: "mono",
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
    isOffline: false,
    isNested: false,
    isFlattened: true,
    hasSpeedEffect: false,
    hasFadeIn: false,
    hasFadeOut: true,
  },
  {
    id: "clip-rvr-2",
    timelineId: "timeline-rvr-203-r3",
    trackId: "track-rvr-dx-1",
    sourceAssetId: "asset-rvr-roll54a-poly",
    clipName: "A203C015_230104",
    sourceFileName: "ROLL_054A_01.BWF",
    reel: "RVR203A",
    tape: "054A",
    scene: "15A",
    take: "4",
    eventDescription: "Boom iso after editorial trim on line pickup.",
    clipNotes: "Sound roll present, but editorial note flags alternate lav as possible backup.",
    recordIn: "01:04:15:16",
    recordOut: "01:04:19:18",
    sourceIn: "08:14:15:16",
    sourceOut: "08:14:19:18",
    recordInFrames: 92536,
    recordOutFrames: 92634,
    sourceInFrames: 711736,
    sourceOutFrames: 711834,
    channelCount: 1,
    channelLayout: "mono",
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
    isOffline: false,
    isNested: false,
    isFlattened: true,
    hasSpeedEffect: false,
    hasFadeIn: true,
    hasFadeOut: false,
  },
  {
    id: "clip-rvr-3",
    timelineId: "timeline-rvr-203-r3",
    trackId: "track-rvr-dx-2",
    sourceAssetId: "asset-rvr-roll54a-lav",
    clipName: "A203C015_230105",
    sourceFileName: "ROLL_054A_LAV_ALT.WAV",
    reel: "RVR203A",
    tape: "054A",
    scene: "15A",
    take: "4",
    eventDescription: "Lav safety carried as the alternate dialogue event.",
    clipNotes: "Separate WAV lacks BWF and iXML metadata, so sound roll must be inferred from adjacent metadata.",
    recordIn: "01:04:20:00",
    recordOut: "01:04:24:08",
    sourceIn: "08:14:20:00",
    sourceOut: "08:14:24:08",
    recordInFrames: 92640,
    recordOutFrames: 92744,
    sourceInFrames: 711840,
    sourceOutFrames: 711944,
    channelCount: 1,
    channelLayout: "mono",
    isPolyWav: false,
    hasBwf: false,
    hasIXml: false,
    isOffline: false,
    isNested: false,
    isFlattened: true,
    hasSpeedEffect: false,
    hasFadeIn: false,
    hasFadeOut: false,
  },
  {
    id: "clip-rvr-4",
    timelineId: "timeline-rvr-203-r3",
    trackId: "track-rvr-fx-1",
    sourceAssetId: "asset-rvr-aaf",
    clipName: "FX_KITCHEN_PASS",
    sourceFileName: "RVR_203_R3_LOCK.aaf",
    reel: "FXKITCHEN",
    tape: "FX",
    eventDescription: "Stereo editorial effects stem carried forward from the Resolve turnover.",
    clipNotes: "Nested stem should remain grouped as a reviewable FX lane in the delivery plan.",
    recordIn: "01:04:10:00",
    recordOut: "01:04:25:00",
    sourceIn: "01:04:10:00",
    sourceOut: "01:04:25:00",
    recordInFrames: 92400,
    recordOutFrames: 92760,
    sourceInFrames: 92400,
    sourceOutFrames: 92760,
    channelCount: 2,
    channelLayout: "stereo",
    isPolyWav: false,
    hasBwf: false,
    hasIXml: false,
    isOffline: false,
    isNested: true,
    isFlattened: false,
    hasSpeedEffect: false,
    hasFadeIn: false,
    hasFadeOut: true,
  },
  {
    id: "clip-rvr-5",
    timelineId: "timeline-rvr-203-r3",
    trackId: "track-rvr-dx-2",
    sourceAssetId: "asset-rvr-roll54b-poly",
    clipName: "A203C022_230212",
    sourceFileName: "ROLL_054B_02.BWF",
    reel: "RVR203B",
    tape: "054B",
    scene: "22C",
    take: "2",
    eventDescription: "Lav alternate referenced by metadata but offline in the intake package.",
    clipNotes: "Canonical event remains in the model so delivery planning can expose the missing roll explicitly.",
    recordIn: "01:18:40:00",
    recordOut: "01:18:44:12",
    sourceIn: "09:02:18:12",
    sourceOut: "09:02:23:00",
    recordInFrames: 113280,
    recordOutFrames: 113388,
    sourceInFrames: 780924,
    sourceOutFrames: 781032,
    channelCount: 1,
    channelLayout: "mono",
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
    isOffline: true,
    isNested: false,
    isFlattened: true,
    hasSpeedEffect: false,
    hasFadeIn: true,
    hasFadeOut: true,
  },
];

export const markers: Marker[] = [
  { id: "marker-rvr-1", timelineId: "timeline-rvr-203-r3", name: "Kitchen pickup", timecode: "01:04:11:08", frame: 92432, color: "yellow", note: "Guide vocals are still audible on the temp lane here." },
  { id: "marker-rvr-2", timelineId: "timeline-rvr-203-r3", name: "Offline lav alt", timecode: "01:18:40:00", frame: 113280, color: "red", note: "Metadata references roll 054B, but the intake package does not contain the file." },
  { id: "marker-rvr-3", timelineId: "timeline-rvr-203-r3", name: "Printmaster check", timecode: "01:31:05:12", frame: 131172, color: "blue", note: "Marker notes should remain visible in delivery marker exports." },
];

const preservationGroups: AnalysisGroup[] = [
  {
    id: "group-rvr-intake",
    title: "Intake completeness",
    scope: "intake" as const,
    findings: [
      {
        id: "finding-rvr-missing-roll",
        jobId: "job-rvr-203",
        category: "manual-review" as const,
        severity: "critical" as const,
        scope: "intake" as const,
        code: "MISSING_PRODUCTION_ROLL",
        title: "One referenced production roll is missing from intake",
        description: "Editorial metadata and the canonical clip list reference roll 054B, but the actual BWF file is not present in the intake package.",
        sourceLocation: "Intake package / ROLL_054B_02.BWF",
        impact: "One lav alternate remains offline and field recorder matching cannot be considered complete.",
        targetArtifactId: "artifact-rvr-field-report",
        targetArtifactName: "RVR_203_FIELD_RECORDER_REPORT.csv",
        recommendedAction: "Confirm whether roll 054B should be supplied or intentionally excluded before delivery sign-off.",
        requiresDecision: true,
        affectedItems: ["ROLL_054B_02.BWF", "A203C022_230212"],
      },
    ],
  },
  {
    id: "group-rvr-routing",
    title: "Routing preservation",
    scope: "routing" as const,
    findings: [
      {
        id: "finding-rvr-guide-lane",
        jobId: "job-rvr-203",
        category: "downgraded" as const,
        severity: "warning" as const,
        scope: "tracks" as const,
        code: "GUIDE_LANE_REVIEW_FOLDER",
        title: "Guide material is preserved only as a review lane",
        description: "ADR temp content remains visible in the canonical model, but the delivery plan keeps it in a review folder instead of a primary dialogue lane.",
        sourceLocation: "Normalized track / ADR Temp",
        impact: "Operators can inspect the guide content, but it should not be treated as final dialogue material.",
        targetArtifactId: "artifact-rvr-nuendo-aaf",
        targetArtifactName: "RVR_203_NUENDO_READY.aaf",
        recommendedAction: "Keep the guide lane in manual review until a real writer can suppress or route it intentionally.",
        requiresDecision: true,
        affectedItems: ["ADR Temp", "Guide Review Folder"],
      },
      {
        id: "finding-rvr-field-report",
        jobId: "job-rvr-203",
        category: "manual-review" as const,
        severity: "warning" as const,
        scope: "delivery" as const,
        code: "FIELD_REPORT_BLOCKED",
        title: "Field recorder report stays blocked until the missing roll is resolved",
        description: "The delivery report is planned, but it remains blocked because one offline production asset still needs operator review.",
        sourceLocation: "Field recorder candidates / scene 22C take 2",
        impact: "Delivery planning remains explicit about unresolved production audio coverage.",
        targetArtifactId: "artifact-rvr-field-report",
        targetArtifactName: "RVR_203_FIELD_RECORDER_REPORT.csv",
        recommendedAction: "Leave the artifact blocked and surface the unresolved roll in the operator report.",
        requiresDecision: false,
        affectedItems: ["Scene 22C Take 2", "ROLL_054B_02.BWF"],
      },
    ],
  },
  {
    id: "group-rvr-markers",
    title: "Marker carryover",
    scope: "markers" as const,
    findings: [
      {
        id: "finding-rvr-markers-preserved",
        jobId: "job-rvr-203",
        category: "preserved" as const,
        severity: "info" as const,
        scope: "markers" as const,
        code: "MARKER_NOTES_PRESERVED",
        title: "Resolve marker notes remain available for delivery planning",
        description: "Marker names, notes, and timing survive normalization cleanly in the current mock fallback model.",
        sourceLocation: "Resolve marker export / RVR_203_AUDIO_PULL.edl",
        impact: "Spotting notes can be listed in planned marker EDL and CSV outputs without additional UI work.",
        targetArtifactId: "artifact-rvr-marker-csv",
        targetArtifactName: "RVR_203_MARKERS.csv",
        recommendedAction: "No action required.",
        requiresDecision: false,
        affectedItems: ["Kitchen pickup", "Printmaster check"],
      },
    ],
  },
];

const preservationFindings: PreservationIssue[] = preservationGroups.flatMap((group) => group.findings);
const totalFindings = preservationFindings.length;
const criticalCount = preservationFindings.filter((finding) => finding.severity === "critical").length;
const warningCount = preservationFindings.filter((finding) => finding.severity === "warning").length;
const infoCount = preservationFindings.filter((finding) => finding.severity === "info").length;
const operatorDecisionCount = preservationFindings.filter((finding) => finding.requiresDecision).length;

export const analysisReports: AnalysisReport[] = [
  {
    id: "report-rvr-203",
    jobId: "job-rvr-203",
    translationModelId: "model-rvr-203",
    updatedOn: "2026-03-08",
    totals: {
      trackCount: 4,
      clipCount: 5,
      markerCount: 3,
      offlineAssetCount: 1,
    },
    highRiskCount: 1,
    warningCount: 2,
    blockedCount: 1,
    intakeCompletenessSummary: "Resolve and editorial exchange files are present, but one expected production BWF roll is missing from intake.",
    deliveryReadinessSummary: "The Nuendo delivery package can be planned, but the field recorder report remains blocked until roll 054B is resolved.",
    summary: {
      totalFindings,
      criticalCount,
      warningCount,
      infoCount,
      operatorDecisionCount,
    },
    groups: preservationGroups,
  },
];

export const preservationReports = analysisReports;
export const preservationIssues: PreservationIssue[] = preservationFindings;

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
      { id: "tm-rvr-3", sourceTrack: "FX Stereo Stem", sourceRole: "fx", channelLayout: "stereo", targetLane: "FX Stem", targetType: "group", action: "preserve" },
      { id: "tm-rvr-4", sourceTrack: "ADR Temp", sourceRole: "guide", channelLayout: "mono", targetLane: "Guide Review", targetType: "folder", action: "ignore" },
    ],
    metadataMappings: [
      { id: "mm-rvr-1", field: "clip_name", sourceValue: "A203C015_230101", targetValue: "A203C015_230101", status: "mapped" },
      { id: "mm-rvr-2", field: "reel", sourceValue: "RVR203A", targetValue: "RVR203A", status: "mapped" },
      { id: "mm-rvr-3", field: "scene", sourceValue: "15A", targetValue: "15A", status: "mapped" },
      { id: "mm-rvr-4", field: "take", sourceValue: "4", targetValue: "4", status: "mapped" },
      { id: "mm-rvr-5", field: "notes", sourceValue: "Separate WAV lacks BWF and iXML metadata.", targetValue: "Separate WAV lacks BWF and iXML metadata.", status: "transformed" },
    ],
    fieldRecorderOverrides: [
      { id: "fro-rvr-1", matchField: "sound_roll", sourceValue: "", targetValue: "054A", status: "linked" },
      { id: "fro-rvr-2", matchField: "scene", sourceValue: "15A", targetValue: "15A", status: "linked" },
      { id: "fro-rvr-3", matchField: "timecode", sourceValue: "01:18:40:00", targetValue: "ROLL_054B_02 missing", status: "unresolved" },
    ],
  },
];

export const mappingRules: MappingRule[] = [
  { id: "rule-rvr-1", jobId: "job-rvr-203", scope: "track", source: "ADR Temp", target: "Guide Review", action: "ignore", status: "review", note: "Keep guide material visible but out of the primary dialogue lanes." },
  { id: "rule-rvr-2", jobId: "job-rvr-203", scope: "field_recorder", source: "sound_roll=<empty>", target: "054A", action: "remap", status: "review", note: "Derived from adjacent production audio metadata." },
  { id: "rule-rvr-3", jobId: "job-rvr-203", scope: "metadata", source: "notes", target: "notes", action: "preserve", status: "locked", note: "Editorial clip notes should remain visible in the delivery package." },
  { id: "rule-rvr-4", jobId: "job-rvr-203", scope: "delivery", source: "field_recorder_report", target: "blocked", action: "preserve", status: "issue", note: "Keep the delivery artifact blocked until the missing roll is resolved." },
];

export const fieldRecorderCandidates: FieldRecorderCandidate[] = [
  {
    id: "frc-rvr-1",
    jobId: "job-rvr-203",
    clipEventId: "clip-rvr-2",
    matchKeys: { sound_roll: "054A", scene: "15A", take: "4", timecode: "01:04:15:16" },
    status: "linked",
    candidateAssetName: "ROLL_054A_01.BWF",
    note: "Polywav boom roll links cleanly by scene, take, and timecode.",
  },
  {
    id: "frc-rvr-2",
    jobId: "job-rvr-203",
    clipEventId: "clip-rvr-3",
    matchKeys: { scene: "15A", take: "4", timecode: "01:04:20:00" },
    status: "candidate",
    candidateAssetName: "ROLL_054A_LAV_ALT.WAV",
    note: "Lav WAV is usable but lacks BWF and iXML metadata, so the roll value is inferred.",
  },
  {
    id: "frc-rvr-3",
    jobId: "job-rvr-203",
    clipEventId: "clip-rvr-5",
    matchKeys: { sound_roll: "054B", scene: "22C", take: "2", timecode: "01:18:40:00" },
    status: "missing",
    candidateAssetName: "ROLL_054B_02.BWF",
    note: "Metadata points to a production roll that is not present in the intake package.",
  },
];

const deliveryArtifacts: DeliveryArtifact[] = [
  {
    id: "artifact-rvr-nuendo-aaf",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "aaf",
    fileRole: "timeline_exchange",
    fileName: "RVR_203_NUENDO_READY.aaf",
    status: "planned",
    note: "Planned Nuendo-ready timeline exchange artifact. No real writer exists yet.",
  },
  {
    id: "artifact-rvr-marker-edl",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "edl",
    fileRole: "marker_export",
    fileName: "RVR_203_MARKERS.edl",
    status: "planned",
    note: "Marker EDL planned from the canonical marker set.",
  },
  {
    id: "artifact-rvr-marker-csv",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "csv",
    fileRole: "marker_export",
    fileName: "RVR_203_MARKERS.csv",
    status: "planned",
    note: "CSV mirror of marker data for operator import review.",
  },
  {
    id: "artifact-rvr-metadata",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "csv",
    fileRole: "metadata_export",
    fileName: "RVR_203_METADATA.csv",
    status: "planned",
    note: "Canonical clip metadata projected into delivery CSV form.",
  },
  {
    id: "artifact-rvr-manifest",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "json",
    fileRole: "delivery_manifest",
    fileName: "manifest.json",
    status: "planned",
    note: "Delivery manifest placeholder that documents planned artifacts and counts.",
  },
  {
    id: "artifact-rvr-readme",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "txt",
    fileRole: "delivery_readme",
    fileName: "README_NUENDO_IMPORT.txt",
    status: "planned",
    note: "Operator instructions for the planned Nuendo handoff.",
  },
  {
    id: "artifact-rvr-reference-video",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "mov",
    fileRole: "reference_video",
    fileName: "RVR_203_REF.mov",
    status: "planned",
    note: "Reference movie is carried forward from intake as a planned delivery companion.",
  },
  {
    id: "artifact-rvr-field-report",
    deliveryPackageId: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    origin: "conform-bridge",
    fileKind: "csv",
    fileRole: "field_recorder_report",
    fileName: "RVR_203_FIELD_RECORDER_REPORT.csv",
    status: "blocked",
    note: "Planned field recorder matching report stays blocked until the missing 054B roll is resolved.",
  },
];

export const deliveryPackages: DeliveryPackage[] = [
  {
    id: "delivery-rvr-203",
    jobId: "job-rvr-203",
    stage: "delivery",
    destination: "nuendo",
    outputPresetId: "tpl-dialogue-premix",
    name: "RVR_203_NUENDO_DELIVERY_PLAN",
    includeReferenceVideo: true,
    includeHandles: true,
    deliverySummary: "Eight planned artifacts represent the Nuendo delivery package, with the field recorder report explicitly blocked.",
    artifacts: deliveryArtifacts,
  },
];

export const exportArtifacts = deliveryArtifacts;

export const jobs: TranslationJob[] = [
  {
    id: "job-rvr-203",
    jobCode: "JB-2407",
    title: "Riverside Episode 203 Dialogue Prep",
    status: "attention",
    priority: "high",
    workflow: "resolve_to_nuendo",
    sourceBundleId: "bundle-rvr-203-r3",
    translationModelId: "model-rvr-203",
    deliveryPackageId: "delivery-rvr-203",
    templateId: "tpl-dialogue-premix",
    outputPresetId: "tpl-dialogue-premix",
    analysisReportId: "report-rvr-203",
    createdOn: "2026-02-21",
    updatedOn: "2026-03-08",
    sourceSnapshot: {
      sequenceName: "RVR_203_REEL_3_LOCK",
      clipCount: 5,
      trackCount: 4,
      unresolvedMediaCount: 1,
      revisionLabel: "R3 lock",
    },
    mappingSnapshot: {
      mappedTrackCount: 4,
      preservedMetadataCount: 5,
      unresolvedCount: 1,
      fieldRecorderLinkedCount: 2,
    },
    notes: "The intake package is structurally clean, the canonical model is stable, and the delivery package is fully planned except for the blocked field recorder report.",
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
  { label: "Intake packages", value: "01", note: "One intake package is modeled explicitly from Resolve, editorial, and production-audio sources.", tone: "neutral" },
  { label: "Canonical timelines", value: "01", note: "The normalized translation model carries one timeline with fixed frame-domain timing.", tone: "accent" },
  { label: "Planned delivery files", value: "08", note: "Nuendo delivery artifacts are modeled separately from intake assets.", tone: "accent" },
  { label: "High-risk issues", value: "01", note: "One missing production roll keeps the field recorder report blocked.", tone: "danger" },
];

export const activityFeed: ActivityItem[] = [
  { id: "act-1", timestamp: "2026-03-08 10:14", title: "Canonical model refreshed", detail: "Frame-domain timing, clip metadata, and marker carryover are now separated from intake and delivery layers." },
  { id: "act-2", timestamp: "2026-03-08 09:32", title: "Delivery package planned", detail: "Nuendo-ready AAF, marker exports, metadata CSV, manifest, readme, and field recorder report were staged as delivery artifacts." },
  { id: "act-3", timestamp: "2026-03-07 16:48", title: "Missing roll flagged", detail: "ROLL_054B_02.BWF remains absent from intake and keeps the field recorder report blocked." },
];

export const conformChangeEvents: ConformChangeEvent[] = [
  {
    id: "chg-rvr-1",
    jobId: "job-rvr-203",
    changeType: "trim",
    oldTimecode: "01:04:11:08",
    newTimecode: "01:04:11:20",
    oldFrame: 92432,
    newFrame: 92444,
    note: "Kitchen pickup starts 12 frames later in the revision compare fixture.",
  },
  {
    id: "chg-rvr-2",
    jobId: "job-rvr-203",
    changeType: "move",
    oldTimecode: "01:18:40:00",
    newTimecode: "01:18:41:12",
    oldFrame: 113280,
    newFrame: 113316,
    note: "Offline lav alternate shifts 36 frames later in the compare pass.",
  },
  {
    id: "chg-rvr-3",
    jobId: "job-rvr-203",
    changeType: "replace",
    oldTimecode: "01:31:05:12",
    newTimecode: "01:31:05:12",
    oldFrame: 131172,
    newFrame: 131172,
    note: "Marker-adjacent FX event is replaced without a timing move.",
  },
];

export const fieldRecorderWatchlist = [
  {
    id: "fr-1",
    clip: "A203C015_230105",
    issue: "Lav WAV lacks BWF and iXML metadata",
    fallback: "Infer sound roll from neighboring polywav events",
  },
  {
    id: "fr-2",
    clip: "A203C022_230212",
    issue: "Referenced production roll is missing from intake",
    fallback: "Keep the delivery report blocked and surface the event for manual review",
  },
  {
    id: "fr-3",
    clip: "RVR_203 marker carryover",
    issue: "Marker notes must remain aligned with conform changes",
    fallback: "Preserve marker exports from the canonical model rather than the raw intake files",
  },
];

const bundleMap = new Map(sourceBundles.map((bundle) => [bundle.id, bundle]));
const templateMap = new Map(templates.map((template) => [template.id, template]));
const translationModelMap = new Map(translationModels.map((model) => [model.id, model]));
const timelineMap = new Map(timelines.map((timeline) => [timeline.id, timeline]));
const reportMap = new Map(analysisReports.map((report) => [report.id, report]));
const mappingMap = new Map(mappingProfiles.map((profile) => [profile.jobId, profile]));
const deliveryPackageMap = new Map(deliveryPackages.map((deliveryPackage) => [deliveryPackage.id, deliveryPackage]));
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

export function getTranslationModel(translationModelId?: string): TranslationModel | undefined {
  if (!translationModelId) {
    return undefined;
  }

  return translationModelMap.get(translationModelId);
}

export function getTimeline(timelineId?: string): Timeline | undefined {
  if (!timelineId) {
    return undefined;
  }

  return timelineMap.get(timelineId);
}

export function getTimelineForJob(jobId: string): Timeline | undefined {
  const job = getJob(jobId);

  if (!job) {
    return undefined;
  }

  const translationModel = getTranslationModel(job.translationModelId);
  return translationModel ? getTimeline(translationModel.primaryTimelineId) : undefined;
}

export function getJob(jobId: string): TranslationJob | undefined {
  return jobMap.get(jobId);
}

export function getReport(reportId: string): AnalysisReport | undefined {
  return reportMap.get(reportId);
}

export function getAnalysisReportForJob(jobId: string): AnalysisReport | undefined {
  const job = getJob(jobId);
  return job ? getReport(job.analysisReportId) : undefined;
}

export function getMappingProfile(jobId: string): MappingProfile | undefined {
  return mappingMap.get(jobId);
}

export function getDeliveryPackage(deliveryPackageId?: string): DeliveryPackage | undefined {
  if (!deliveryPackageId) {
    return undefined;
  }

  return deliveryPackageMap.get(deliveryPackageId);
}

export function getExportArtifacts(jobId: string): DeliveryArtifact[] {
  const job = getJob(jobId);
  const deliveryPackage = job ? getDeliveryPackage(job.deliveryPackageId) : undefined;

  return deliveryPackage?.artifacts ?? [];
}



