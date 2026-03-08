import type {
  AnalysisReport,
  DeliveryArtifact,
  DeliveryArtifactStatus,
  DeliveryPackage,
  FileKind,
  FileRole,
  MappingProfile,
  OutputPreset,
  PreservationIssue,
  TranslationJob,
  TranslationModel,
} from "@/lib/types";

export interface DeliveryPlanResult {
  deliveryPackage: DeliveryPackage;
  exportArtifacts: DeliveryArtifact[];
}

export interface ExporterService {
  planDelivery(
    job: TranslationJob,
    translationModel: TranslationModel,
    outputPreset: OutputPreset,
    analysisReport: AnalysisReport,
    mappingProfile: MappingProfile,
    preservationIssues: PreservationIssue[],
  ): Promise<DeliveryPlanResult>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSequenceLabel(job: TranslationJob, translationModel: TranslationModel) {
  return (job.sourceSnapshot.sequenceName || translationModel.name.replace(/\s+canonical model$/i, ""))
    .trim()
    .replaceAll(" ", "_");
}

function includesReferenceVideo(issue: PreservationIssue) {
  const haystacks = [
    issue.title,
    issue.description,
    issue.sourceLocation,
    issue.targetArtifactName,
    ...issue.affectedItems,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  return haystacks.some((value) => value.includes("reference") || value.includes(".mov") || value.includes("_ref"));
}

function hasIssueCode(preservationIssues: PreservationIssue[], code: string) {
  return preservationIssues.some((issue) => issue.code === code);
}

function createArtifact(
  jobId: string,
  deliveryPackageId: string,
  suffix: string,
  fileKind: FileKind,
  fileRole: FileRole,
  fileName: string,
  status: DeliveryArtifactStatus,
  note: string,
): DeliveryArtifact {
  return {
    id: `artifact-${slugify(jobId)}-${suffix}`,
    deliveryPackageId,
    jobId,
    stage: "delivery",
    origin: "conform-bridge",
    fileKind,
    fileRole,
    fileName,
    status,
    note,
  };
}

export function planNuendoDeliverySync(
  job: TranslationJob,
  translationModel: TranslationModel,
  outputPreset: OutputPreset,
  analysisReport: AnalysisReport,
  mappingProfile: MappingProfile,
  preservationIssues: PreservationIssue[],
): DeliveryPlanResult {
  const deliveryPackageId = job.deliveryPackageId || `delivery-${slugify(job.id)}`;
  const sequenceLabel = toSequenceLabel(job, translationModel);
  const markerAvailable = analysisReport.totals.markerCount > 0;
  const metadataAvailable = mappingProfile.metadataMappings.length > 0 || analysisReport.totals.clipCount > 0;
  const unresolvedFieldRecorder = mappingProfile.fieldRecorderOverrides.some((override) => override.status === "unresolved")
    || hasIssueCode(preservationIssues, "MISSING_PRODUCTION_ROLL")
    || hasIssueCode(preservationIssues, "UNRESOLVED_METADATA");
  const referenceRequested = outputPreset.exportDefaults.includeReferenceVideo;
  const referenceMissing = hasIssueCode(preservationIssues, "MISSING_EXPECTED_FILE")
    && preservationIssues.some((issue) => issue.code === "MISSING_EXPECTED_FILE" && includesReferenceVideo(issue));

  const exportArtifacts = [
    createArtifact(
      job.id,
      deliveryPackageId,
      "nuendo-aaf",
      "aaf",
      "timeline_exchange",
      `${sequenceLabel}_NUENDO_READY.aaf`,
      analysisReport.totals.clipCount > 0 && analysisReport.totals.trackCount > 0 ? "planned" : "placeholder",
      analysisReport.totals.clipCount > 0 && analysisReport.totals.trackCount > 0
        ? "Exporter-generated Nuendo-ready AAF plan from the canonical translation model. No writer is implemented yet."
        : "Exporter keeps the AAF artifact as a placeholder until canonical clip and track data exist.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "marker-edl",
      "edl",
      "marker_export",
      `${sequenceLabel}_MARKERS.edl`,
      markerAvailable ? "planned" : "placeholder",
      markerAvailable
        ? "Exporter-generated marker EDL plan from canonical marker timing."
        : "No canonical markers are available, so the marker EDL remains a placeholder.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "marker-csv",
      "csv",
      "marker_export",
      `${sequenceLabel}_MARKERS.csv`,
      markerAvailable ? "planned" : "placeholder",
      markerAvailable
        ? "Exporter-generated marker CSV plan from canonical marker timing."
        : "No canonical markers are available, so the marker CSV remains a placeholder.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "metadata-csv",
      "csv",
      "metadata_export",
      `${sequenceLabel}_METADATA.csv`,
      metadataAvailable ? "planned" : "placeholder",
      metadataAvailable
        ? "Exporter-generated metadata CSV plan from canonical clip metadata and mapping rules."
        : "Canonical metadata is not available yet, so the metadata CSV remains a placeholder.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "manifest",
      "json",
      "delivery_manifest",
      "manifest.json",
      "planned",
      "Exporter-generated delivery manifest plan summarizing canonical counts and artifact states.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "readme",
      "txt",
      "delivery_readme",
      "README_NUENDO_IMPORT.txt",
      "planned",
      "Exporter-generated README plan for operator import instructions. No writer is implemented yet.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "reference-video",
      "mov",
      "reference_video",
      `${sequenceLabel}_REF.mov`,
      !referenceRequested ? "placeholder" : referenceMissing ? "blocked" : "planned",
      !referenceRequested
        ? "The selected output preset does not request a reference video, so this artifact remains a placeholder."
        : referenceMissing
          ? "Reference video is requested by the preset, but intake analysis indicates the source file is missing."
          : "Exporter-generated reference video companion plan based on the requested output preset.",
    ),
    createArtifact(
      job.id,
      deliveryPackageId,
      "field-recorder-report",
      "csv",
      "field_recorder_report",
      `${sequenceLabel}_FIELD_RECORDER_REPORT.csv`,
      !outputPreset.fieldRecorderPolicy.enabled ? "placeholder" : unresolvedFieldRecorder ? "blocked" : "planned",
      !outputPreset.fieldRecorderPolicy.enabled
        ? "The selected output preset disables field recorder processing, so this report remains a placeholder."
        : unresolvedFieldRecorder
          ? "Field recorder report remains blocked because intake analysis still shows unresolved production-audio coverage or metadata gaps."
          : "Exporter-generated field recorder report plan from linked production-audio candidates.",
    ),
  ] satisfies DeliveryArtifact[];

  const blockedCount = exportArtifacts.filter((artifact) => artifact.status === "blocked").length;
  const placeholderCount = exportArtifacts.filter((artifact) => artifact.status === "placeholder").length;
  const plannedCount = exportArtifacts.filter((artifact) => artifact.status === "planned").length;

  const deliveryPackage = {
    id: deliveryPackageId,
    jobId: job.id,
    stage: "delivery",
    destination: "nuendo",
    outputPresetId: outputPreset.id,
    name: `${sequenceLabel}_NUENDO_DELIVERY`,
    includeReferenceVideo: referenceRequested,
    includeHandles: outputPreset.exportDefaults.includeHandles,
    deliverySummary: `Exporter planned ${plannedCount} artifact(s), blocked ${blockedCount}, and left ${placeholderCount} as placeholders.`,
    artifacts: exportArtifacts,
  } satisfies DeliveryPackage;

  return {
    deliveryPackage,
    exportArtifacts,
  };
}

export async function planNuendoDelivery(
  job: TranslationJob,
  translationModel: TranslationModel,
  outputPreset: OutputPreset,
  analysisReport: AnalysisReport,
  mappingProfile: MappingProfile,
  preservationIssues: PreservationIssue[],
): Promise<DeliveryPlanResult> {
  return planNuendoDeliverySync(job, translationModel, outputPreset, analysisReport, mappingProfile, preservationIssues);
}
