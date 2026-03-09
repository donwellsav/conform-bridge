import { getFieldRecorderDecision } from "../mapping-workflow";
import type {
  AnalysisReport,
  ClipEvent,
  DeliveryArtifact,
  DeliveryExecutionArtifactPayload,
  DeliveryExecutionPlan,
  DeliveryPackage,
  DeferredBinaryArtifactPayload,
  FieldRecorderCandidate,
  GeneratedFieldRecorderReportPayload,
  GeneratedManifestPayload,
  GeneratedMarkerCsvPayload,
  GeneratedMarkerEdlPayload,
  GeneratedMetadataCsvPayload,
  GeneratedReadmePayload,
  MappingProfile,
  Marker,
  PreservationIssue,
  SourceBundle,
  Track,
  TranslationJob,
  TranslationModel,
  UnavailableArtifactPayload,
} from "../types";

export interface DeliveryExecutionInput {
  job: TranslationJob;
  bundle: SourceBundle;
  translationModel: TranslationModel;
  timelineName: string;
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
  analysisReport: AnalysisReport;
  mappingProfile: MappingProfile;
  fieldRecorderCandidates: FieldRecorderCandidate[];
  preservationIssues: PreservationIssue[];
  deliveryPackage: DeliveryPackage;
  exportArtifacts: DeliveryArtifact[];
}

export interface DeliveryExecutionService {
  prepareExecution(input: DeliveryExecutionInput): Promise<DeliveryExecutionPlan>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function csvCell(value: string | number | boolean | undefined) {
  const normalized = value === undefined ? "" : String(value);
  if (!/[",\n]/.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replaceAll('"', '""')}"`;
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | undefined>>) {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
}

type PayloadBase = Omit<GeneratedManifestPayload, "executionStatus" | "payloadKind" | "mimeType" | "content" | "json">;

function createBasePayload(artifact: DeliveryArtifact, summary: string): PayloadBase {
  return {
    artifactId: artifact.id,
    deliveryPackageId: artifact.deliveryPackageId,
    jobId: artifact.jobId,
    fileName: artifact.fileName,
    fileRole: artifact.fileRole,
    fileKind: artifact.fileKind,
    artifactStatus: artifact.status,
    summary,
  };
}

function createUnavailablePayload(artifact: DeliveryArtifact, reason: string, summary: string): UnavailableArtifactPayload {
  return {
    ...createBasePayload(artifact, summary),
    executionStatus: "unavailable",
    payloadKind: "unavailable",
    reason,
  };
}

function createDeferredBinaryPayload(
  artifact: DeliveryArtifact,
  nextBoundary: DeferredBinaryArtifactPayload["nextBoundary"],
  reason: string,
  summary: string,
): DeferredBinaryArtifactPayload {
  return {
    ...createBasePayload(artifact, summary),
    executionStatus: "deferred",
    payloadKind: "deferred_binary",
    nextBoundary,
    reason,
  };
}

function createMarkerCsvPayload(
  artifact: DeliveryArtifact,
  markers: Marker[],
): GeneratedMarkerCsvPayload | UnavailableArtifactPayload {
  if (artifact.status !== "planned" || markers.length === 0) {
    return createUnavailablePayload(
      artifact,
      artifact.status !== "planned"
        ? `Marker CSV is ${artifact.status} in the delivery plan.`
        : "No canonical markers are available.",
      "Marker CSV remains unavailable until marker data is both planned and present.",
    );
  }

  const orderedMarkers = [...markers].sort((left, right) => left.frame - right.frame || left.name.localeCompare(right.name));
  const content = toCsv(
    ["timecode", "frame", "name", "color", "note"],
    orderedMarkers.map((marker) => [marker.timecode, marker.frame, marker.name, marker.color, marker.note]),
  );

  return {
    ...createBasePayload(artifact, "Generated marker CSV payload from canonical marker timing."),
    executionStatus: "generated",
    payloadKind: "marker_csv",
    mimeType: "text/csv",
    content,
    rowCount: orderedMarkers.length,
  };
}

function createMarkerEdlPayload(
  artifact: DeliveryArtifact,
  markers: Marker[],
  dropFrame: boolean,
): GeneratedMarkerEdlPayload | UnavailableArtifactPayload {
  if (artifact.status !== "planned" || markers.length === 0) {
    return createUnavailablePayload(
      artifact,
      artifact.status !== "planned"
        ? `Marker EDL is ${artifact.status} in the delivery plan.`
        : "No canonical markers are available.",
      "Marker EDL remains unavailable until marker data is both planned and present.",
    );
  }

  const orderedMarkers = [...markers].sort((left, right) => left.frame - right.frame || left.name.localeCompare(right.name));
  const edlLines = [
    `TITLE: ${artifact.fileName.replace(/\.edl$/i, "")}`,
    `FCM: ${dropFrame ? "DROP FRAME" : "NON-DROP FRAME"}`,
    "",
    ...orderedMarkers.flatMap((marker, index) => [
      `${String(index + 1).padStart(3, "0")}  MARK V     C        00:00:00:00 00:00:00:00 ${marker.timecode} ${marker.timecode}`,
      `* LOC: ${marker.timecode} ${marker.color.toUpperCase()} MARKER ${marker.name}${marker.note ? ` | ${marker.note}` : ""}`,
    ]),
  ];

  return {
    ...createBasePayload(artifact, "Generated marker EDL payload from canonical marker timing."),
    executionStatus: "generated",
    payloadKind: "marker_edl",
    mimeType: "text/plain",
    content: edlLines.join("\n"),
    eventCount: orderedMarkers.length,
  };
}

function createMetadataCsvPayload(
  artifact: DeliveryArtifact,
  timelineName: string,
  tracks: Track[],
  clipEvents: ClipEvent[],
  mappingProfile: MappingProfile,
): GeneratedMetadataCsvPayload | UnavailableArtifactPayload {
  if (artifact.status !== "planned" || clipEvents.length === 0) {
    return createUnavailablePayload(
      artifact,
      artifact.status !== "planned"
        ? `Metadata CSV is ${artifact.status} in the delivery plan.`
        : "No canonical clip events are available.",
      "Metadata CSV remains unavailable until clip metadata is both planned and present.",
    );
  }

  const trackMap = new Map(tracks.map((track) => [track.id, track]));
  const mappingByTrackName = new Map(mappingProfile.trackMappings.map((mapping) => [mapping.sourceTrack, mapping]));
  const orderedClips = [...clipEvents].sort((left, right) => left.recordInFrames - right.recordInFrames || left.clipName.localeCompare(right.clipName));
  const content = toCsv(
    [
      "timelineName",
      "trackIndex",
      "trackName",
      "targetLane",
      "trackAction",
      "clipName",
      "sourceFileName",
      "reel",
      "tape",
      "scene",
      "take",
      "recordIn",
      "recordOut",
      "sourceIn",
      "sourceOut",
      "channelLayout",
      "channelCount",
      "isOffline",
      "clipNotes",
    ],
    orderedClips.map((clip) => {
      const track = trackMap.get(clip.trackId);
      const mapping = track ? mappingByTrackName.get(track.name) : undefined;

      return [
        timelineName,
        track?.index ?? "",
        track?.name ?? clip.trackId,
        mapping?.targetLane ?? "",
        mapping?.action ?? "",
        clip.clipName,
        clip.sourceFileName,
        clip.reel ?? "",
        clip.tape ?? "",
        clip.scene ?? "",
        clip.take ?? "",
        clip.recordIn,
        clip.recordOut,
        clip.sourceIn,
        clip.sourceOut,
        clip.channelLayout,
        clip.channelCount,
        clip.isOffline,
        clip.clipNotes,
      ];
    }),
  );

  return {
    ...createBasePayload(artifact, "Generated metadata CSV payload from canonical clip metadata and effective track mapping."),
    executionStatus: "generated",
    payloadKind: "metadata_csv",
    mimeType: "text/csv",
    content,
    rowCount: orderedClips.length,
  };
}

function createFieldRecorderReportPayload(
  artifact: DeliveryArtifact,
  clipEvents: ClipEvent[],
  fieldRecorderCandidates: FieldRecorderCandidate[],
  mappingProfile: MappingProfile,
): GeneratedFieldRecorderReportPayload | UnavailableArtifactPayload {
  if (artifact.status !== "planned" || fieldRecorderCandidates.length === 0) {
    return createUnavailablePayload(
      artifact,
      artifact.status !== "planned"
        ? `Field recorder report is ${artifact.status} in the delivery plan.`
        : "No field recorder candidates are available.",
      "Field recorder report remains unavailable until candidate coverage is both planned and present.",
    );
  }

  const clipMap = new Map(clipEvents.map((clip) => [clip.id, clip]));
  const orderedCandidates = [...fieldRecorderCandidates].sort((left, right) => left.id.localeCompare(right.id));
  const content = toCsv(
    ["clipName", "sourceFileName", "candidateAssetName", "decision", "reel", "tape", "scene", "take", "note"],
    orderedCandidates.map((candidate) => {
      const clip = clipMap.get(candidate.clipEventId);
      return [
        clip?.clipName ?? candidate.clipEventId,
        clip?.sourceFileName ?? "",
        candidate.candidateAssetName,
        getFieldRecorderDecision(mappingProfile, candidate),
        candidate.matchKeys.reel ?? "",
        candidate.matchKeys.tape ?? "",
        candidate.matchKeys.scene ?? "",
        candidate.matchKeys.take ?? "",
        candidate.note,
      ];
    }),
  );

  return {
    ...createBasePayload(artifact, "Generated field recorder report from effective candidate review decisions."),
    executionStatus: "generated",
    payloadKind: "field_recorder_report",
    mimeType: "text/csv",
    content,
    rowCount: orderedCandidates.length,
  };
}

function createManifestJson(
  input: DeliveryExecutionInput,
  preparedArtifacts: DeliveryExecutionArtifactPayload[],
): GeneratedManifestPayload {
  const manifestArtifact = input.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_manifest");
  if (!manifestArtifact) {
    throw new Error(`Delivery manifest artifact is missing for ${input.job.id}.`);
  }

  const json = {
    schemaVersion: 1,
    generatedBy: "conform-bridge/delivery-execution-prep",
    workflow: input.job.workflow,
    job: {
      id: input.job.id,
      jobCode: input.job.jobCode,
      title: input.job.title,
      status: input.job.status,
      priority: input.job.priority,
    },
    sourceBundle: {
      id: input.bundle.id,
      name: input.bundle.name,
      sequenceName: input.bundle.sequenceName,
      pictureLock: input.bundle.pictureLock,
      fps: input.bundle.fps,
      startTimecode: input.bundle.startTimecode,
      durationTimecode: input.bundle.durationTimecode,
      sampleRate: input.bundle.sampleRate,
      handlesFrames: input.bundle.handlesFrames,
      dropFrame: input.bundle.dropFrame,
      assetCount: input.bundle.assets.length,
    },
    canonicalModel: {
      id: input.translationModel.id,
      name: input.translationModel.name,
      timelineName: input.timelineName,
      trackCount: input.analysisReport.totals.trackCount,
      clipCount: input.analysisReport.totals.clipCount,
      markerCount: input.analysisReport.totals.markerCount,
      offlineAssetCount: input.analysisReport.totals.offlineAssetCount,
    },
    analysis: {
      highRiskCount: input.analysisReport.highRiskCount,
      warningCount: input.analysisReport.warningCount,
      blockedCount: input.analysisReport.blockedCount,
      intakeCompletenessSummary: input.analysisReport.intakeCompletenessSummary,
      deliveryReadinessSummary: input.analysisReport.deliveryReadinessSummary,
    },
    artifacts: input.exportArtifacts.map((artifact) => {
      const prepared = preparedArtifacts.find((candidate) => candidate.artifactId === artifact.id);
      return {
        fileName: artifact.fileName,
        fileRole: artifact.fileRole,
        fileKind: artifact.fileKind,
        artifactStatus: artifact.status,
        executionStatus: prepared?.executionStatus ?? "unavailable",
        summary: prepared?.summary ?? artifact.note,
      };
    }),
    preservationIssues: [...input.preservationIssues]
      .sort((left, right) => left.code.localeCompare(right.code) || left.title.localeCompare(right.title))
      .map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        scope: issue.scope,
        title: issue.title,
      })),
  } satisfies Record<string, unknown>;

  return {
    ...createBasePayload(manifestArtifact, "Generated manifest.json payload from delivery planning, canonical counts, and execution-prep output."),
    executionStatus: "generated",
    payloadKind: "manifest_json",
    mimeType: "application/json",
    content: JSON.stringify(json, null, 2),
    json,
  };
}

function createReadmePayload(
  input: DeliveryExecutionInput,
  preparedArtifacts: DeliveryExecutionArtifactPayload[],
): GeneratedReadmePayload {
  const readmeArtifact = input.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_readme");
  if (!readmeArtifact) {
    throw new Error(`Delivery README artifact is missing for ${input.job.id}.`);
  }

  const generated = preparedArtifacts.filter((artifact) => artifact.executionStatus === "generated").map((artifact) => artifact.fileName);
  const deferred = preparedArtifacts.filter((artifact) => artifact.executionStatus === "deferred").map((artifact) => artifact.fileName);
  const unavailable = preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").map((artifact) => artifact.fileName);

  const lines = [
    `${input.deliveryPackage.name} import package`,
    "",
    "Scope",
    `${input.job.jobCode} / ${input.timelineName}`,
    "",
    "Generated now",
    ...generated.map((fileName) => `- ${fileName}`),
    "",
    "Deferred to future writer or media handoff",
    ...deferred.map((fileName) => `- ${fileName}`),
    "",
    "Unavailable from current planning state",
    ...(unavailable.length > 0 ? unavailable.map((fileName) => `- ${fileName}`) : ["- none"]),
    "",
    "Import notes",
    `- Delivery summary: ${input.deliveryPackage.deliverySummary}`,
    `- Intake summary: ${input.analysisReport.intakeCompletenessSummary}`,
    `- Delivery readiness: ${input.analysisReport.deliveryReadinessSummary}`,
    `- Blocked findings: ${input.analysisReport.blockedCount}`,
    `- High-risk findings: ${input.analysisReport.highRiskCount}`,
    "",
    "Writer status",
    "- Native Nuendo session/project writing is not implemented in this phase.",
    "- Binary AAF and reference video outputs remain deferred behind a future writer or media-handoff boundary.",
  ];

  return {
    ...createBasePayload(readmeArtifact, "Generated README import instructions from delivery planning and execution-prep state."),
    executionStatus: "generated",
    payloadKind: "readme_text",
    mimeType: "text/plain",
    content: lines.join("\n"),
  };
}

function prepareArtifactPayload(
  input: DeliveryExecutionInput,
  artifact: DeliveryArtifact,
): DeliveryExecutionArtifactPayload {
  switch (artifact.fileRole) {
    case "timeline_exchange":
      return createDeferredBinaryPayload(
        artifact,
        "future_writer",
        "AAF delivery still requires a future writer boundary. Execution prep only records the deferred binary handoff.",
        "Binary AAF remains deferred behind the future writer boundary.",
      );
    case "marker_export":
      return artifact.fileKind === "csv"
        ? createMarkerCsvPayload(artifact, input.markers)
        : createMarkerEdlPayload(artifact, input.markers, input.bundle.dropFrame);
    case "metadata_export":
      return createMetadataCsvPayload(artifact, input.timelineName, input.tracks, input.clipEvents, input.mappingProfile);
    case "field_recorder_report":
      return createFieldRecorderReportPayload(artifact, input.clipEvents, input.fieldRecorderCandidates, input.mappingProfile);
    case "reference_video":
      return createDeferredBinaryPayload(
        artifact,
        "source_media_handoff",
        artifact.status === "planned"
          ? "Reference video remains a binary handoff artifact. Execution prep records the required companion output without serializing MOV/MP4 data."
          : `Reference video is ${artifact.status} in the delivery plan, so no binary payload is serialized in this phase.`,
        "Reference video remains deferred to source media handoff rather than in-repo binary generation.",
      );
    default:
      return createUnavailablePayload(
        artifact,
        "This artifact is generated in a later execution-prep pass.",
        "Execution prep does not yet produce a payload for this artifact type.",
      );
  }
}

export function prepareDeliveryExecutionSync(input: DeliveryExecutionInput): DeliveryExecutionPlan {
  const preparedById = new Map<string, DeliveryExecutionArtifactPayload>();
  const manifestArtifact = input.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_manifest");
  const readmeArtifact = input.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_readme");

  input.exportArtifacts
    .filter((artifact) => artifact.fileRole !== "delivery_manifest" && artifact.fileRole !== "delivery_readme")
    .forEach((artifact) => {
      preparedById.set(artifact.id, prepareArtifactPayload(input, artifact));
    });

  const summaryArtifacts = [
    ...preparedById.values(),
    ...(manifestArtifact ? [{
      ...createBasePayload(manifestArtifact, "Generated manifest.json payload from delivery planning and execution-prep output."),
      executionStatus: "generated" as const,
      payloadKind: "manifest_json" as const,
      mimeType: "application/json" as const,
      content: "",
      json: {},
    }] : []),
    ...(readmeArtifact ? [{
      ...createBasePayload(readmeArtifact, "Generated README import instructions from delivery planning and execution-prep state."),
      executionStatus: "generated" as const,
      payloadKind: "readme_text" as const,
      mimeType: "text/plain" as const,
      content: "",
    }] : []),
  ];

  const manifestPayload = createManifestJson(input, summaryArtifacts);
  preparedById.set(manifestPayload.artifactId, manifestPayload);

  const readmePayload = createReadmePayload(input, [...preparedById.values(), manifestPayload, ...summaryArtifacts.filter((artifact) => artifact.payloadKind === "readme_text")]);
  preparedById.set(readmePayload.artifactId, readmePayload);

  const preparedArtifacts = input.exportArtifacts.map((artifact) => {
    const prepared = preparedById.get(artifact.id);
    if (!prepared) {
      return createUnavailablePayload(
        artifact,
        "Execution prep did not produce a payload for this artifact.",
        "No execution-prep payload is currently available for this artifact.",
      );
    }

    return prepared;
  });
  const generatedCount = preparedArtifacts.filter((artifact) => artifact.executionStatus === "generated").length;
  const deferredCount = preparedArtifacts.filter((artifact) => artifact.executionStatus === "deferred").length;
  const unavailableCount = preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").length;

  return {
    id: `execution-${slugify(input.job.id)}`,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    preparedArtifacts,
    generatedCount,
    deferredCount,
    unavailableCount,
    summary: `Execution prep generated ${generatedCount} serializable artifact payload(s), deferred ${deferredCount}, and left ${unavailableCount} unavailable from the current plan.`,
  };
}

export async function prepareDeliveryExecution(input: DeliveryExecutionInput): Promise<DeliveryExecutionPlan> {
  return prepareDeliveryExecutionSync(input);
}
