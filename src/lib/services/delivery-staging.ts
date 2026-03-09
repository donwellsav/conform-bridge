import type {
  DeliveryArtifact,
  DeliveryDeferredDescriptor,
  DeliveryExecutionArtifactPayload,
  DeliveryExecutionPlan,
  DeliveryPackage,
  DeliveryStagingBundle,
  DeliveryStagingReviewInfluence,
  DeliveryStagingSummaryJson,
  DeferredBinaryArtifactPayload,
  GeneratedArtifactPayloadKind,
  PreservationIssue,
  SourceBundle,
  StagedDeferredArtifactFile,
  StagedDeliveryEntry,
  StagedGeneratedArtifactFile,
  StagedSummaryFile,
  TranslationJob,
  UnavailableArtifactPayload,
} from "../types";

export interface DeliveryStagingInput {
  job: TranslationJob;
  bundle: SourceBundle;
  deliveryPackage: DeliveryPackage;
  exportArtifacts: DeliveryArtifact[];
  executionPlan: DeliveryExecutionPlan;
  preservationIssues: PreservationIssue[];
  sourceSignature: string;
  reviewInfluence: DeliveryStagingReviewInfluence;
}

export interface DeliveryStagingService {
  stage(input: DeliveryStagingInput): Promise<DeliveryStagingBundle>;
}

function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

function dirname(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(0, index) : "";
}

function basename(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(index + 1) : filePath;
}

function normalizeSegment(value: string) {
  const normalized = value
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "delivery_bundle";
}

function sequenceLabel(input: DeliveryStagingInput) {
  return normalizeSegment(input.bundle.sequenceName || input.job.jobCode || input.job.id);
}

function rootFolderName(input: DeliveryStagingInput) {
  return normalizeSegment(input.bundle.sequenceName || input.job.jobCode || input.deliveryPackage.name || input.job.id);
}

function generatedDirectoryForPayload(payloadKind: GeneratedArtifactPayloadKind) {
  switch (payloadKind) {
    case "manifest_json":
    case "readme_text":
      return "";
    case "marker_csv":
    case "marker_edl":
      return "markers";
    case "metadata_csv":
      return "metadata";
    case "field_recorder_report":
      return "reports";
    case "reference_video_instruction":
      return "reports";
  }
}

function generatedRelativePath(rootFolder: string, artifact: DeliveryExecutionArtifactPayload) {
  if (artifact.executionStatus !== "generated") {
    throw new Error(`Cannot stage non-generated artifact ${artifact.fileName} as a generated file.`);
  }

  const directory = generatedDirectoryForPayload(artifact.payloadKind);
  const fileName = artifact.payloadKind === "reference_video_instruction"
    ? `${artifact.fileName}.instruction.txt`
    : artifact.fileName;

  return directory ? joinPath(rootFolder, directory, fileName) : joinPath(rootFolder, fileName);
}

function deferredRelativePath(rootFolder: string, artifact: DeferredBinaryArtifactPayload) {
  return joinPath(rootFolder, "deferred", `${artifact.fileName}.deferred.json`);
}

function sourceDependencies(bundle: SourceBundle, artifact: DeferredBinaryArtifactPayload) {
  if (artifact.fileRole === "timeline_exchange") {
    return bundle.assets
      .filter((asset) => asset.fileRole === "timeline_exchange")
      .map((asset) => asset.relativePath ?? asset.name)
      .sort((left, right) => left.localeCompare(right));
  }

  if (artifact.fileRole === "reference_video") {
    return bundle.assets
      .filter((asset) => asset.fileRole === "reference_video")
      .map((asset) => asset.relativePath ?? asset.name)
      .sort((left, right) => left.localeCompare(right));
  }

  return bundle.assets
    .map((asset) => asset.relativePath ?? asset.name)
    .sort((left, right) => left.localeCompare(right));
}

function createGeneratedEntry(rootFolder: string, artifact: DeliveryExecutionArtifactPayload): StagedGeneratedArtifactFile {
  if (artifact.executionStatus !== "generated") {
    throw new Error(`Expected generated execution payload for ${artifact.fileName}.`);
  }

  const relativePath = generatedRelativePath(rootFolder, artifact);
  const directory = dirname(relativePath);

  return {
    kind: "generated_file",
    relativePath,
    directory,
    fileName: basename(relativePath),
    artifactId: artifact.artifactId,
    fileRole: artifact.fileRole,
    fileKind: artifact.fileKind,
    artifactStatus: artifact.artifactStatus,
    payloadKind: artifact.payloadKind,
    mimeType: artifact.mimeType,
    content: artifact.content,
    summary: artifact.summary,
  };
}

function createDeferredEntry(
  rootFolder: string,
  bundle: SourceBundle,
  artifact: DeferredBinaryArtifactPayload,
): StagedDeferredArtifactFile {
  const relativePath = deferredRelativePath(rootFolder, artifact);
  const descriptor: DeliveryDeferredDescriptor = {
    schemaVersion: 1,
    artifactId: artifact.artifactId,
    jobId: artifact.jobId,
    deliveryPackageId: artifact.deliveryPackageId,
    fileName: artifact.fileName,
    fileRole: artifact.fileRole,
    fileKind: artifact.fileKind,
    artifactStatus: artifact.artifactStatus,
    executionStatus: "deferred",
    nextBoundary: artifact.nextBoundary,
    reason: artifact.reason,
    sourceDependencies: sourceDependencies(bundle, artifact),
  };

  return {
    kind: "deferred_descriptor",
    relativePath,
    directory: dirname(relativePath),
    fileName: basename(relativePath),
    artifactId: artifact.artifactId,
    fileRole: artifact.fileRole,
    fileKind: artifact.fileKind,
    artifactStatus: artifact.artifactStatus,
    payloadKind: "deferred_descriptor",
    mimeType: "application/json",
    content: JSON.stringify(descriptor, null, 2),
    descriptor,
    summary: artifact.summary,
  };
}

function createUnavailableArtifacts(artifacts: DeliveryExecutionArtifactPayload[]) {
  return artifacts
    .filter((artifact): artifact is UnavailableArtifactPayload => artifact.executionStatus === "unavailable")
    .map((artifact) => ({
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      fileRole: artifact.fileRole,
      fileKind: artifact.fileKind,
      artifactStatus: artifact.artifactStatus,
      reason: artifact.reason,
      summary: artifact.summary,
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName) || left.artifactId.localeCompare(right.artifactId));
}

function unresolvedBlockerCount(issues: PreservationIssue[], artifacts: DeliveryArtifact[]) {
  const blockedArtifacts = artifacts.filter((artifact) => artifact.status === "blocked").length;
  const criticalIssues = issues.filter((issue) => issue.severity === "critical").length;
  return blockedArtifacts + criticalIssues;
}

function createSummaryEntry(
  rootFolder: string,
  input: DeliveryStagingInput,
  generatedEntries: StagedGeneratedArtifactFile[],
  deferredEntries: StagedDeferredArtifactFile[],
  unavailableArtifacts: DeliveryStagingBundle["unavailableArtifacts"],
): StagedSummaryFile {
  const json: DeliveryStagingSummaryJson = {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    rootFolderName: rootFolder,
    sourceSignature: input.sourceSignature,
    generatedCount: generatedEntries.length,
    deferredCount: deferredEntries.length,
    unavailableCount: unavailableArtifacts.length,
    unresolvedBlockerCount: unresolvedBlockerCount(input.preservationIssues, input.exportArtifacts),
    generatedFiles: generatedEntries
      .map((entry) => ({
        relativePath: entry.relativePath,
        artifactId: entry.artifactId,
        payloadKind: entry.payloadKind,
        artifactStatus: entry.artifactStatus,
        summary: entry.summary,
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    deferredFiles: deferredEntries
      .map((entry) => ({
        relativePath: entry.relativePath,
        artifactId: entry.artifactId,
        fileRole: entry.fileRole,
        fileKind: entry.fileKind,
        artifactStatus: entry.artifactStatus,
        nextBoundary: entry.descriptor.nextBoundary,
        summary: entry.summary,
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    unavailableArtifacts,
    reviewInfluence: input.reviewInfluence,
  };

  const relativePath = joinPath(rootFolder, "staging-summary.json");

  return {
    kind: "summary_file",
    relativePath,
    directory: dirname(relativePath),
    fileName: "staging-summary.json",
    payloadKind: "staging_summary",
    mimeType: "application/json",
    content: JSON.stringify(json, null, 2),
    json,
    summary: "Generated staging summary from the delivery plan, execution-prep outputs, and review overlay state.",
  };
}

function sortEntries(entries: StagedDeliveryEntry[]) {
  return [...entries].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function prepareDeliveryStagingSync(input: DeliveryStagingInput): DeliveryStagingBundle {
  const rootFolder = rootFolderName(input);
  const generatedEntries = input.executionPlan.preparedArtifacts
    .filter((artifact) => artifact.executionStatus === "generated")
    .map((artifact) => createGeneratedEntry(rootFolder, artifact));
  const deferredEntries = input.executionPlan.preparedArtifacts
    .filter((artifact): artifact is DeferredBinaryArtifactPayload => artifact.executionStatus === "deferred")
    .map((artifact) => createDeferredEntry(rootFolder, input.bundle, artifact));
  const unavailableArtifacts = createUnavailableArtifacts(input.executionPlan.preparedArtifacts);
  const summaryEntry = createSummaryEntry(rootFolder, input, generatedEntries, deferredEntries, unavailableArtifacts);
  const entries = sortEntries([...generatedEntries, ...deferredEntries, summaryEntry]);

  return {
    id: `staging-${normalizeSegment(input.job.id)}`,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    rootFolderName: rootFolder,
    rootRelativePath: rootFolder,
    entries,
    unavailableArtifacts,
    generatedCount: generatedEntries.length + 1,
    deferredCount: deferredEntries.length,
    unavailableCount: unavailableArtifacts.length,
    unresolvedBlockerCount: summaryEntry.json.unresolvedBlockerCount,
    sourceSignature: input.sourceSignature,
    reviewInfluence: input.reviewInfluence,
    summaryPath: summaryEntry.relativePath,
    summary: `Staging materialized ${generatedEntries.length + 1} file(s), deferred ${deferredEntries.length}, and left ${unavailableArtifacts.length} unavailable artifact(s) out of the staged bundle.`,
  };
}

export async function prepareDeliveryStaging(input: DeliveryStagingInput): Promise<DeliveryStagingBundle> {
  return prepareDeliveryStagingSync(input);
}

export function createImportedBaseReviewInfluence(): DeliveryStagingReviewInfluence {
  return {
    mode: "imported_base",
    hasSavedState: false,
    operatorEditedCount: 0,
    validationAcknowledgedCount: 0,
    validationDismissedCount: 0,
    reconformReviewedCount: 0,
    openReviewCount: 0,
    note: "Staging reflects the imported base analysis with no saved operator overlay applied.",
  };
}

export function createOverlayReviewInfluence(input: {
  hasSavedState: boolean;
  operatorEditedCount: number;
  validationAcknowledgedCount: number;
  validationDismissedCount: number;
  reconformReviewedCount: number;
  openReviewCount: number;
}): DeliveryStagingReviewInfluence {
  return {
    mode: "saved_review_overlay",
    hasSavedState: input.hasSavedState,
    operatorEditedCount: input.operatorEditedCount,
    validationAcknowledgedCount: input.validationAcknowledgedCount,
    validationDismissedCount: input.validationDismissedCount,
    reconformReviewedCount: input.reconformReviewedCount,
    openReviewCount: input.openReviewCount,
    note: input.hasSavedState
      ? "Staging reflects saved operator review deltas layered over the imported canonical model."
      : "Staging reflects the review overlay path, but no saved operator deltas are currently present.",
  };
}

export function buildDefaultStagingRootHint(input: DeliveryStagingInput) {
  return `<staging-root>/${rootFolderName(input)}/${sequenceLabel(input)}`;
}
