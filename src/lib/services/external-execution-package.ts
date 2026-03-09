import type {
  DeliveryArtifactStatus,
  DeliveryExecutionPlan,
  DeliveryHandoffBundle,
  DeliveryPackage,
  DeliveryStagingBundle,
  ExternalExecutionChecksums,
  ExternalExecutionClassification,
  ExternalExecutionDeferredInput,
  ExternalExecutionDeferredInputsDocument,
  ExternalExecutionEntry,
  ExternalExecutionGeneratedArtifactIndex,
  ExternalExecutionIndex,
  ExternalExecutionManifest,
  ExternalExecutionPackage,
  ExternalExecutionStatus,
  ExternalExecutionSummary,
  FileKind,
  FileRole,
  GeneratedArtifactPayloadKind,
  SourceBundle,
  TranslationJob,
} from "../types";

export interface ExternalExecutionPackageInput {
  job: TranslationJob;
  bundle: SourceBundle;
  deliveryPackage: DeliveryPackage;
  executionPlan: DeliveryExecutionPlan;
  stagingBundle: DeliveryStagingBundle;
  handoffBundle: DeliveryHandoffBundle;
}

export interface ExternalExecutionPackageService {
  preparePackage(input: ExternalExecutionPackageInput): Promise<ExternalExecutionPackage>;
}

function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

function basename(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(index + 1) : filePath;
}

function stripRoot(relativePath: string, rootRelativePath: string) {
  const prefix = `${rootRelativePath}/`;
  return relativePath.startsWith(prefix) ? relativePath.slice(prefix.length) : relativePath;
}

function byteSize(content: string) {
  return new TextEncoder().encode(content).length;
}

function checksumValue(content: string) {
  const bytes = new TextEncoder().encode(content);
  let hash = 0x811c9dc5;

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function createChecksum(relativePath: string, content: string) {
  return {
    relativePath,
    algorithm: "fnv1a-32" as const,
    value: checksumValue(content),
    byteSize: byteSize(content),
  };
}

function createEntry(input: {
  relativePath: string;
  layer: ExternalExecutionEntry["layer"];
  classification: ExternalExecutionClassification;
  mimeType: string;
  payloadKind: string;
  content: string;
  summary: string;
  artifactId?: string;
  artifactStatus?: DeliveryArtifactStatus;
  fileRole?: FileRole;
  fileKind?: FileKind;
  writerReadinessStatus?: ExternalExecutionEntry["writerReadinessStatus"];
}): ExternalExecutionEntry {
  const checksum = createChecksum(input.relativePath, input.content);

  return {
    kind: "external_execution_entry",
    relativePath: input.relativePath,
    fileName: basename(input.relativePath),
    layer: input.layer,
    classification: input.classification,
    mimeType: input.mimeType,
    payloadKind: input.payloadKind,
    content: input.content,
    byteSize: checksum.byteSize,
    checksum,
    summary: input.summary,
    artifactId: input.artifactId,
    artifactStatus: input.artifactStatus,
    fileRole: input.fileRole,
    fileKind: input.fileKind,
    writerReadinessStatus: input.writerReadinessStatus,
  };
}

function createStagedEntries(bundle: DeliveryStagingBundle) {
  return bundle.entries.map((entry) => {
    const suffix = stripRoot(entry.relativePath, bundle.rootRelativePath);
    const relativePath = joinPath(bundle.rootRelativePath, "staged", suffix);

    if (entry.kind === "generated_file") {
      return createEntry({
        relativePath,
        layer: "staged",
        classification: "generated",
        mimeType: entry.mimeType,
        payloadKind: entry.payloadKind,
        content: entry.content,
        summary: entry.summary,
        artifactId: entry.artifactId,
        artifactStatus: entry.artifactStatus,
        fileRole: entry.fileRole,
        fileKind: entry.fileKind,
      });
    }

    if (entry.kind === "deferred_descriptor") {
      return createEntry({
        relativePath,
        layer: "staged",
        classification: "deferred-contract",
        mimeType: entry.mimeType,
        payloadKind: entry.payloadKind,
        content: entry.content,
        summary: entry.summary,
        artifactId: entry.artifactId,
        artifactStatus: entry.artifactStatus,
        fileRole: entry.fileRole,
        fileKind: entry.fileKind,
      });
    }

    return createEntry({
      relativePath,
      layer: "staged",
      classification: "generated",
      mimeType: entry.mimeType,
      payloadKind: entry.payloadKind,
      content: entry.content,
      summary: entry.summary,
    });
  });
}

function createHandoffEntries(bundle: DeliveryHandoffBundle) {
  return bundle.entries.map((entry) =>
    createEntry({
      relativePath: entry.relativePath,
      layer: "handoff",
      classification: "generated",
      mimeType: entry.mimeType,
      payloadKind: entry.payloadKind,
      content: entry.content,
      summary: entry.summary,
    }),
  );
}

function createDeferredInputsDocument(input: ExternalExecutionPackageInput, deliveryPackageSignature: string) {
  const inputs: ExternalExecutionDeferredInput[] = input.handoffBundle.deferredWriterInput.artifacts
    .map((artifact) => ({
      artifactId: artifact.artifactId,
      artifactKind: artifact.artifactKind,
      relativePath: artifact.deferredDescriptorPath,
      plannedOutputPath: artifact.plannedOutputPath,
      readinessStatus: artifact.readinessStatus,
      requiredWriterCapability: artifact.requiredWriterCapability,
      blockers: [...artifact.blockers].sort((left, right) => left.localeCompare(right)),
      dependencyIds: artifact.dependencies.map((dependency) => dependency.id).sort((left, right) => left.localeCompare(right)),
      payload: artifact.payload,
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  const document: ExternalExecutionDeferredInputsDocument = {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    deliveryPackageSignature,
    sourceSignature: input.handoffBundle.deferredWriterInput.sourceSignature,
    reviewSignature: input.handoffBundle.deferredWriterInput.reviewSignature,
    inputs,
  };

  return document;
}

function createGeneratedArtifactIndex(entries: ExternalExecutionEntry[], jobId: string, deliveryPackageId: string) {
  const artifacts = entries
    .filter((entry) =>
      entry.layer === "staged"
      && entry.classification === "generated"
      && entry.artifactId
      && entry.artifactStatus
      && entry.fileRole
      && entry.fileKind
      && entry.payloadKind !== "staging_summary",
    )
    .map((entry) => ({
      artifactId: entry.artifactId as string,
      relativePath: entry.relativePath,
      fileRole: entry.fileRole as FileRole,
      fileKind: entry.fileKind as FileKind,
      artifactStatus: entry.artifactStatus as DeliveryArtifactStatus,
      payloadKind: entry.payloadKind as GeneratedArtifactPayloadKind,
      byteSize: entry.byteSize,
      checksum: entry.checksum.value,
      summary: entry.summary,
    }));

  const index: ExternalExecutionGeneratedArtifactIndex = {
    schemaVersion: 1,
    jobId,
    deliveryPackageId,
    artifacts: artifacts.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };

  return index;
}

function requiredGeneratedSuffixes(executionPlan: DeliveryExecutionPlan) {
  return executionPlan.preparedArtifacts
    .filter((artifact) => artifact.executionStatus === "generated")
    .map((artifact) => artifact.payloadKind === "reference_video_instruction" ? `${artifact.fileName}.instruction.txt` : artifact.fileName)
    .sort((left, right) => left.localeCompare(right));
}

function missingGeneratedArtifacts(input: ExternalExecutionPackageInput, stagedEntries: ExternalExecutionEntry[]) {
  const stagedFiles = stagedEntries
    .filter((entry) => entry.layer === "staged" && entry.classification === "generated")
    .map((entry) => entry.fileName);

  return requiredGeneratedSuffixes(input.executionPlan).filter((fileName) => !stagedFiles.includes(fileName));
}

function createStatusAndReasons(input: ExternalExecutionPackageInput, stagedEntries: ExternalExecutionEntry[], handoffEntries: ExternalExecutionEntry[]) {
  const reasons: string[] = [];
  const requiredHandoffFiles = [
    `${input.stagingBundle.rootRelativePath}/handoff/deferred-writer-inputs.json`,
    `${input.stagingBundle.rootRelativePath}/handoff/delivery-handoff-manifest.json`,
    `${input.stagingBundle.rootRelativePath}/handoff/delivery-handoff-summary.json`,
  ];
  const missingHandoffFiles = requiredHandoffFiles.filter((relativePath) =>
    !handoffEntries.some((entry) => entry.relativePath === relativePath),
  );
  const missingGenerated = missingGeneratedArtifacts(input, stagedEntries);

  reasons.push(
    ...missingGenerated.map((fileName) => `Missing staged generated payload for ${fileName}.`),
    ...missingHandoffFiles.map((relativePath) => `Missing handoff package member ${relativePath}.`),
  );

  if (input.handoffBundle.summaryJson.readinessStatus === "blocked") {
    reasons.push(...input.handoffBundle.summaryJson.unresolvedBlockers);
  } else if (input.handoffBundle.summaryJson.readinessStatus !== "ready-for-writer") {
    reasons.push(input.handoffBundle.summaryJson.note);
  }

  const uniqueReasons = [...new Set(reasons.filter((reason) => reason.trim().length > 0))].sort((left, right) => left.localeCompare(right));

  if (missingGenerated.length > 0 || missingHandoffFiles.length > 0 || input.handoffBundle.summaryJson.readinessStatus === "blocked") {
    return {
      status: "blocked" as const,
      reasons: uniqueReasons,
    };
  }

  if (input.handoffBundle.summaryJson.readinessStatus === "partial" || input.handoffBundle.summaryJson.readinessStatus === "deferred-with-known-gaps") {
    return {
      status: "partial" as const,
      reasons: uniqueReasons,
    };
  }

  return {
    status: "ready" as const,
    reasons: uniqueReasons,
  };
}

function createManifest(
  input: ExternalExecutionPackageInput,
  status: ExternalExecutionStatus,
  reasons: string[],
  packageRoot: string,
  packageEntries: ExternalExecutionEntry[],
  packageMetadataCount: number,
) {
  const generatedEntryCount = packageEntries.filter((entry) => entry.classification === "generated").length;
  const deferredContractCount = packageEntries.filter((entry) => entry.classification === "deferred-contract").length;

  const note = status === "ready"
    ? "External execution package is complete for generated payloads and deferred writer contracts."
    : status === "partial"
      ? "External execution package is complete enough for inspection, but deferred writer work still has known gaps."
      : "External execution package is blocked by missing prerequisites or blocked deferred writer inputs.";

  const manifest: ExternalExecutionManifest = {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    sourceSignature: input.handoffBundle.deferredWriterInput.sourceSignature,
    reviewSignature: input.handoffBundle.deferredWriterInput.reviewSignature,
    deliveryPackageSignature: input.handoffBundle.deferredWriterInput.deliveryPackageSignature,
    packageStatus: status,
    stagedRoot: joinPath(input.stagingBundle.rootRelativePath, "staged"),
    handoffRoot: joinPath(input.stagingBundle.rootRelativePath, "handoff"),
    packageRoot,
    generatedEntryCount,
    deferredContractCount,
    packageMetadataCount,
    reasons,
    note,
  };

  return manifest;
}

function createSummary(
  input: ExternalExecutionPackageInput,
  status: ExternalExecutionStatus,
  reasons: string[],
  packageEntries: ExternalExecutionEntry[],
  packageMetadataCount: number,
) {
  const stagedEntryCount = packageEntries.filter((entry) => entry.layer === "staged").length;
  const handoffEntryCount = packageEntries.filter((entry) => entry.layer === "handoff").length;
  const deferredContractCount = packageEntries.filter((entry) => entry.classification === "deferred-contract").length;
  const blockedDeferredCount = input.handoffBundle.deferredWriterInput.artifacts.filter((artifact) => artifact.readinessStatus === "blocked").length;
  const totalEntryCount = packageEntries.length + packageMetadataCount;

  return {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    sourceSignature: input.handoffBundle.deferredWriterInput.sourceSignature,
    reviewSignature: input.handoffBundle.deferredWriterInput.reviewSignature,
    deliveryPackageSignature: input.handoffBundle.deferredWriterInput.deliveryPackageSignature,
    packageStatus: status,
    stagedEntryCount,
    handoffEntryCount,
    packageEntryCount: packageMetadataCount,
    generatedEntryCount: packageEntries.filter((entry) => entry.classification === "generated").length,
    deferredContractCount,
    blockedDeferredCount,
    totalEntryCount,
    note: status === "ready"
      ? "Generated staged outputs and deferred writer contracts are packaged for external execution."
      : status === "partial"
        ? "Package is available for external inspection, but at least one deferred writer contract still has known gaps."
        : "Package is blocked because required generated payloads or deferred writer prerequisites are still unresolved.",
    reasons,
  } satisfies ExternalExecutionSummary;
}

function createIndex(entries: ExternalExecutionEntry[], jobId: string, deliveryPackageId: string) {
  const index: ExternalExecutionIndex = {
    schemaVersion: 1,
    jobId,
    deliveryPackageId,
    entries: entries
      .map((entry) => ({
        relativePath: entry.relativePath,
        fileName: entry.fileName,
        layer: entry.layer,
        classification: entry.classification,
        mimeType: entry.mimeType,
        payloadKind: entry.payloadKind,
        artifactId: entry.artifactId,
        artifactStatus: entry.artifactStatus,
        writerReadinessStatus: entry.writerReadinessStatus,
        byteSize: entry.byteSize,
        checksum: entry.checksum.value,
        summary: entry.summary,
      }))
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };

  return index;
}

function createChecksums(entries: ExternalExecutionEntry[], jobId: string, deliveryPackageId: string) {
  const checksums: ExternalExecutionChecksums = {
    schemaVersion: 1,
    jobId,
    deliveryPackageId,
    algorithm: "fnv1a-32",
    entries: entries
      .map((entry) => entry.checksum)
      .sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
  };

  return checksums;
}

export function prepareExternalExecutionPackageSync(input: ExternalExecutionPackageInput): ExternalExecutionPackage {
  const rootRelativePath = input.stagingBundle.rootRelativePath;
  const stagedEntries = createStagedEntries(input.stagingBundle);
  const handoffEntries = createHandoffEntries(input.handoffBundle);
  const deferredInputsJson = createDeferredInputsDocument(input, input.handoffBundle.deferredWriterInput.deliveryPackageSignature);
  const generatedArtifactIndexJson = createGeneratedArtifactIndex(stagedEntries, input.job.id, input.deliveryPackage.id);
  const packageRoot = joinPath(rootRelativePath, "package");
  const baseEntries = [...stagedEntries, ...handoffEntries];
  const { status, reasons } = createStatusAndReasons(input, stagedEntries, handoffEntries);
  const packageMetadataCount = 6;
  const manifestJson = createManifest(input, status, reasons, packageRoot, baseEntries, packageMetadataCount);
  const summaryJson = createSummary(input, status, reasons, baseEntries, packageMetadataCount);

  const packageEntries = [
    createEntry({
      relativePath: joinPath(packageRoot, "deferred-writer-inputs.json"),
      layer: "package",
      classification: "package-metadata",
      mimeType: "application/json",
      payloadKind: "external_deferred_writer_inputs",
      content: JSON.stringify(deferredInputsJson, null, 2),
      summary: "Packaged deferred writer inputs for external execution consumers.",
    }),
    createEntry({
      relativePath: joinPath(packageRoot, "generated-artifact-index.json"),
      layer: "package",
      classification: "package-metadata",
      mimeType: "application/json",
      payloadKind: "external_generated_artifact_index",
      content: JSON.stringify(generatedArtifactIndexJson, null, 2),
      summary: "Generated index of staged safe artifacts included in the external execution package.",
    }),
    createEntry({
      relativePath: joinPath(packageRoot, "external-execution-manifest.json"),
      layer: "package",
      classification: "package-metadata",
      mimeType: "application/json",
      payloadKind: "external_execution_manifest",
      content: JSON.stringify(manifestJson, null, 2),
      summary: "External execution manifest linking packaged staged outputs, handoff contracts, and readiness.",
    }),
    createEntry({
      relativePath: joinPath(packageRoot, "external-execution-summary.json"),
      layer: "package",
      classification: "package-metadata",
      mimeType: "application/json",
      payloadKind: "external_execution_summary",
      content: JSON.stringify(summaryJson, null, 2),
      summary: "External execution summary with package readiness and unresolved reasons.",
    }),
  ];

  const indexJson = createIndex([...baseEntries, ...packageEntries], input.job.id, input.deliveryPackage.id);
  const indexEntry = createEntry({
    relativePath: joinPath(packageRoot, "external-execution-index.json"),
    layer: "package",
    classification: "package-metadata",
    mimeType: "application/json",
    payloadKind: "external_execution_index",
    content: JSON.stringify(indexJson, null, 2),
    summary: "External execution index covering packaged staged, handoff, and package metadata files.",
  });
  const checksumsJson = createChecksums([...baseEntries, ...packageEntries, indexEntry], input.job.id, input.deliveryPackage.id);
  const checksumsEntry = createEntry({
    relativePath: joinPath(packageRoot, "checksums.json"),
    layer: "package",
    classification: "package-metadata",
    mimeType: "application/json",
    payloadKind: "external_execution_checksums",
    content: JSON.stringify(checksumsJson, null, 2),
    summary: "Deterministic checksums for packaged staged outputs, handoff files, and export metadata.",
  });

  const entries = [...baseEntries, ...packageEntries, indexEntry, checksumsEntry]
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `external-package-${input.job.id}`,
    version: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    rootFolderName: input.stagingBundle.rootFolderName,
    rootRelativePath,
    sourceSignature: input.handoffBundle.deferredWriterInput.sourceSignature,
    reviewSignature: input.handoffBundle.deferredWriterInput.reviewSignature,
    deliveryPackageSignature: input.handoffBundle.deferredWriterInput.deliveryPackageSignature,
    status,
    entries,
    manifestJson,
    indexJson,
    summaryJson,
    checksumsJson,
    deferredInputsJson,
    generatedArtifactIndexJson,
    summary: `External execution package status is ${status} with ${entries.length} packaged entries and ${input.handoffBundle.deferredWriterInput.artifacts.length} deferred writer contract(s).`,
  };
}

export async function prepareExternalExecutionPackage(input: ExternalExecutionPackageInput): Promise<ExternalExecutionPackage> {
  return prepareExternalExecutionPackageSync(input);
}
