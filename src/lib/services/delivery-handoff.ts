import type {
  DeferredWriterArtifact,
  DeferredWriterArtifactKind,
  DeferredWriterInput,
  DeliveryArtifact,
  DeliveryExecutionPlan,
  DeliveryHandoffArtifact,
  DeliveryHandoffBundle,
  DeliveryHandoffEntry,
  DeliveryHandoffManifest,
  DeliveryHandoffSummary,
  DeliveryPackage,
  DeliveryReviewSignature,
  DeliverySourceSignature,
  DeliveryStagingBundle,
  DeliveryStagingReviewInfluence,
  DeferredBinaryArtifactPayload,
  FileRole,
  PreservationIssue,
  SourceBundle,
  TranslationJob,
  TranslationModel,
  WriterCapability,
  WriterDependency,
  WriterReadinessStatus,
} from "../types";

export interface DeliveryHandoffInput {
  job: TranslationJob;
  bundle: SourceBundle;
  translationModel: TranslationModel;
  deliveryPackage: DeliveryPackage;
  exportArtifacts: DeliveryArtifact[];
  executionPlan: DeliveryExecutionPlan;
  stagingBundle: DeliveryStagingBundle;
  preservationIssues: PreservationIssue[];
  sourceSignature: DeliverySourceSignature;
  reviewSignature: DeliveryReviewSignature;
}

export interface DeliveryHandoffService {
  prepareHandoff(input: DeliveryHandoffInput): Promise<DeliveryHandoffBundle>;
}

function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

function buildDeliveryPackageSignature(deliveryPackage: DeliveryPackage, exportArtifacts: DeliveryArtifact[]) {
  return [
    deliveryPackage.id,
    deliveryPackage.name,
    deliveryPackage.includeReferenceVideo ? "ref" : "no-ref",
    deliveryPackage.includeHandles ? "handles" : "no-handles",
    ...[...exportArtifacts]
      .sort((left, right) => left.fileName.localeCompare(right.fileName))
      .map((artifact) => `${artifact.id}:${artifact.fileName}:${artifact.fileRole}:${artifact.status}`),
  ].join("::");
}

function artifactKind(artifact: DeliveryArtifact): DeferredWriterArtifactKind {
  if (artifact.fileRole === "timeline_exchange" && artifact.fileKind === "aaf") {
    return "nuendo_ready_aaf";
  }

  if (artifact.fileRole === "reference_video") {
    return "reference_video_handoff";
  }

  if (artifact.fileRole === "timeline_exchange") {
    return "native_nuendo_session";
  }

  return "unknown_deferred_artifact";
}

function requiredWriterCapability(kind: DeferredWriterArtifactKind): WriterCapability {
  switch (kind) {
    case "nuendo_ready_aaf":
      return "aaf_delivery_writer";
    case "reference_video_handoff":
      return "reference_video_handoff";
    case "native_nuendo_session":
      return "native_nuendo_session_writer";
    case "unknown_deferred_artifact":
      return "unsupported_writer_capability";
  }
}

function relevantScopesForArtifact(fileRole: FileRole) {
  if (fileRole === "timeline_exchange") {
    return new Set(["delivery", "timeline", "tracks", "clips", "metadata", "field_recorder"]);
  }

  if (fileRole === "reference_video") {
    return new Set(["delivery", "intake", "reconform"]);
  }

  return new Set(["delivery"]);
}

function relevantIssues(artifact: DeliveryArtifact, issues: PreservationIssue[]) {
  const relevantScopes = relevantScopesForArtifact(artifact.fileRole);
  return issues
    .filter((issue) =>
      issue.targetArtifactId === artifact.id
      || issue.targetArtifactName === artifact.fileName
      || (relevantScopes.has(issue.scope) && (!issue.targetArtifactId || issue.targetArtifactId === artifact.id)),
    )
    .sort((left, right) => left.code.localeCompare(right.code) || left.title.localeCompare(right.title));
}

function findStagedEntry(stagingBundle: DeliveryStagingBundle, suffix: string) {
  return stagingBundle.entries.find((entry) => entry.relativePath.endsWith(suffix));
}

function createStagedDependency(
  id: string,
  label: string,
  reference: string,
  required: boolean,
  present: boolean,
  reason: string,
): WriterDependency {
  return {
    id,
    type: "staged_file",
    label,
    reference,
    status: present ? "present" : "missing",
    required,
    reason,
  };
}

function createIntakeAssetDependency(
  id: string,
  label: string,
  reference: string,
  required: boolean,
  present: boolean,
  reason: string,
): WriterDependency {
  return {
    id,
    type: "intake_asset",
    label,
    reference,
    status: present ? "present" : "missing",
    required,
    reason,
  };
}

function createIssueDependency(issue: PreservationIssue): WriterDependency {
  const blocked = issue.severity === "critical" || issue.code === "DELIVERY_ARTIFACT_BLOCKED";
  return {
    id: `issue-${issue.id}`,
    type: "preservation_issue",
    label: issue.title,
    reference: issue.code,
    status: blocked ? "blocked" : "optional",
    required: blocked,
    reason: issue.recommendedAction,
  };
}

function createReviewDependency(reviewInfluence: DeliveryStagingReviewInfluence, artifactId: string): WriterDependency | undefined {
  if (reviewInfluence.openReviewCount === 0) {
    return undefined;
  }

  return {
    id: `review-${artifactId}`,
    type: "review_state",
    label: "Saved review overlay",
    reference: reviewInfluence.mode,
    status: "blocked",
    required: false,
    reason: `${reviewInfluence.openReviewCount} review item(s) remain open and may change deferred writer inputs.`,
  };
}

function determineDependencySet(
  artifact: DeliveryArtifact,
  stagingBundle: DeliveryStagingBundle,
  bundle: SourceBundle,
  issues: PreservationIssue[],
) {
  const dependencies: WriterDependency[] = [];
  const manifestEntry = findStagedEntry(stagingBundle, "/manifest.json");
  const readmeEntry = findStagedEntry(stagingBundle, "/README_NUENDO_IMPORT.txt");
  const metadataEntry = stagingBundle.entries.find((entry) => entry.relativePath.includes("/metadata/") && entry.relativePath.endsWith(".csv"));
  const referenceAsset = bundle.assets.find((asset) => asset.fileRole === "reference_video" && asset.status === "present");
  const timelineAsset = bundle.assets.find((asset) => asset.fileRole === "timeline_exchange" && asset.status === "present");

  dependencies.push(
    createStagedDependency(
      `dep-${artifact.id}-manifest`,
      "Staged manifest",
      manifestEntry?.relativePath ?? joinPath(stagingBundle.rootRelativePath, "manifest.json"),
      true,
      Boolean(manifestEntry),
      "The handoff manifest must be staged before deferred writer execution can begin.",
    ),
    createStagedDependency(
      `dep-${artifact.id}-readme`,
      "Staged README",
      readmeEntry?.relativePath ?? joinPath(stagingBundle.rootRelativePath, "README_NUENDO_IMPORT.txt"),
      true,
      Boolean(readmeEntry),
      "Operator import instructions must remain attached to the deferred handoff.",
    ),
  );

  if (artifact.fileRole === "timeline_exchange") {
    dependencies.push(
      createStagedDependency(
        `dep-${artifact.id}-metadata`,
        "Staged metadata CSV",
        metadataEntry?.relativePath ?? joinPath(stagingBundle.rootRelativePath, "metadata", `${bundle.sequenceName}_METADATA.csv`),
        true,
        Boolean(metadataEntry),
        "Nuendo-ready AAF handoff depends on staged clip metadata output.",
      ),
      createIntakeAssetDependency(
        `dep-${artifact.id}-timeline-source`,
        "Intake timeline exchange source",
        timelineAsset?.relativePath ?? bundle.sequenceName,
        true,
        Boolean(timelineAsset),
        "The original intake timeline exchange asset must remain available for writer verification.",
      ),
    );
  }

  if (artifact.fileRole === "reference_video") {
    dependencies.push(
      createIntakeAssetDependency(
        `dep-${artifact.id}-reference-source`,
        "Intake reference video",
        referenceAsset?.relativePath ?? artifact.fileName,
        true,
        Boolean(referenceAsset),
        "Reference video handoff requires a present intake reference asset.",
      ),
    );
  }

  dependencies.push(...issues.map(createIssueDependency));

  const reviewDependency = createReviewDependency(stagingBundle.reviewInfluence, artifact.id);
  if (reviewDependency) {
    dependencies.push(reviewDependency);
  }

  return dependencies.sort((left, right) => left.id.localeCompare(right.id));
}

function determineReadinessStatus(
  kind: DeferredWriterArtifactKind,
  artifact: DeliveryArtifact,
  dependencies: WriterDependency[],
) {
  if (kind === "unknown_deferred_artifact") {
    return "deferred-with-known-gaps" as const;
  }

  if (artifact.status === "blocked") {
    return "blocked" as const;
  }

  if (dependencies.some((dependency) => dependency.required && dependency.status !== "present")) {
    return "blocked" as const;
  }

  if (dependencies.some((dependency) => dependency.type === "preservation_issue" && dependency.status === "blocked")) {
    return "blocked" as const;
  }

  if (dependencies.some((dependency) => !dependency.required && dependency.status === "blocked")) {
    return "partial" as const;
  }

  if (dependencies.some((dependency) => dependency.status === "optional")) {
    return "partial" as const;
  }

  return "ready-for-writer" as const;
}

function explanationForReadiness(status: WriterReadinessStatus, artifact: DeliveryArtifact, blockers: string[], gaps: string[]) {
  switch (status) {
    case "ready-for-writer":
      return `${artifact.fileName} has stable staged prerequisites and no unresolved handoff blockers.`;
    case "blocked":
      return blockers.join(" ");
    case "partial":
      return gaps.join(" ");
    case "deferred-with-known-gaps":
      return `${artifact.fileName} has a deferred contract, but its writer capability is not formally supported yet.`;
  }
}

function plannedOutputPath(stagingBundle: DeliveryStagingBundle, artifact: DeliveryArtifact) {
  return joinPath(stagingBundle.rootRelativePath, artifact.fileName);
}

function createDeferredWriterArtifact(
  artifact: DeliveryArtifact,
  deferredPayload: DeferredBinaryArtifactPayload,
  stagingBundle: DeliveryStagingBundle,
  issues: PreservationIssue[],
  bundle: SourceBundle,
  deliveryPackageSignature: string,
  sourceSignature: DeliverySourceSignature,
  reviewSignature: DeliveryReviewSignature,
): DeferredWriterArtifact {
  const kind = artifactKind(artifact);
  const capability = requiredWriterCapability(kind);
  const dependencies = determineDependencySet(artifact, stagingBundle, bundle, issues);
  const blockerReasons = [
    ...(artifact.status === "blocked" ? [`${artifact.fileName} is blocked in delivery planning.`] : []),
    ...dependencies
      .filter((dependency) => dependency.required && dependency.status !== "present")
      .map((dependency) => dependency.reason),
    ...dependencies
      .filter((dependency) => dependency.type === "preservation_issue" && dependency.status === "blocked")
      .map((dependency) => dependency.reason),
  ];
  const gapReasons = [
    ...dependencies
      .filter((dependency) => !dependency.required && dependency.status === "blocked")
      .map((dependency) => dependency.reason),
    ...dependencies
      .filter((dependency) => dependency.status === "optional")
      .map((dependency) => dependency.reason),
    ...(kind === "unknown_deferred_artifact" ? ["No supported writer capability is defined for this deferred artifact kind."] : []),
  ];
  const readinessStatus = determineReadinessStatus(kind, artifact, dependencies);

  return {
    artifactId: artifact.id,
    deferredDescriptorPath: joinPath(stagingBundle.rootRelativePath, "deferred", `${artifact.fileName}.deferred.json`),
    artifactKind: kind,
    fileName: artifact.fileName,
    fileRole: artifact.fileRole,
    fileKind: artifact.fileKind,
    artifactStatus: artifact.status,
    plannedOutputPath: plannedOutputPath(stagingBundle, artifact),
    requiredWriterCapability: capability,
    readinessStatus,
    explanation: explanationForReadiness(readinessStatus, artifact, blockerReasons, gapReasons),
    blockers: readinessStatus === "blocked" ? blockerReasons : gapReasons,
    dependencies,
    payload: {
      version: 1,
      artifactId: artifact.id,
      artifactKind: kind,
      deliveryPackageSignature,
      sourceSignature,
      reviewSignature,
      deferredExecutionReason: deferredPayload.reason,
      requiredWriterCapability: capability,
      plannedOutputPath: plannedOutputPath(stagingBundle, artifact),
      stagedDescriptorPath: joinPath(stagingBundle.rootRelativePath, "deferred", `${artifact.fileName}.deferred.json`),
      dependencyIds: dependencies.map((dependency) => dependency.id),
    },
  };
}

function createDeferredWriterInput(
  input: DeliveryHandoffInput,
  deferredArtifacts: DeferredWriterArtifact[],
  deliveryPackageSignature: string,
): DeferredWriterInput {
  return {
    version: 1,
    id: `writer-input-${input.job.id}`,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    deliveryPackageSignature,
    artifacts: deferredArtifacts,
  };
}

function createHandoffArtifact(relativePath: string, fileName: string, state: DeliveryHandoffArtifact["state"], summary: string, artifactId: string) {
  return {
    artifactId,
    fileName,
    relativePath,
    state,
    summary,
  };
}

function createManifest(
  input: DeliveryHandoffInput,
  deferredWriterInput: DeferredWriterInput,
  deliveryPackageSignature: string,
): DeliveryHandoffManifest {
  const generatedArtifacts = input.stagingBundle.entries
    .filter((entry) => entry.kind === "generated_file" || entry.kind === "summary_file")
    .map((entry) => createHandoffArtifact(entry.relativePath, entry.fileName, "staged", entry.summary, entry.relativePath))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const deferredArtifacts = deferredWriterInput.artifacts
    .filter((artifact) => artifact.readinessStatus !== "blocked")
    .map((artifact) => createHandoffArtifact(artifact.deferredDescriptorPath, artifact.fileName, "deferred-contract", artifact.explanation, artifact.artifactId))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const blockedArtifacts = deferredWriterInput.artifacts
    .filter((artifact) => artifact.readinessStatus === "blocked")
    .map((artifact) => createHandoffArtifact(artifact.deferredDescriptorPath, artifact.fileName, "blocked", artifact.explanation, artifact.artifactId))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    deliveryPackageSignature,
    stagingRoot: input.stagingBundle.rootRelativePath,
    reviewInfluence: input.stagingBundle.reviewInfluence,
    generatedArtifacts,
    deferredArtifacts,
    blockedArtifacts,
  };
}

function overallReadinessStatus(artifacts: DeferredWriterArtifact[]): WriterReadinessStatus {
  if (artifacts.some((artifact) => artifact.readinessStatus === "blocked")) {
    return "blocked";
  }

  if (artifacts.some((artifact) => artifact.readinessStatus === "partial")) {
    return "partial";
  }

  if (artifacts.some((artifact) => artifact.readinessStatus === "deferred-with-known-gaps")) {
    return "deferred-with-known-gaps";
  }

  return "ready-for-writer";
}

function createSummary(
  input: DeliveryHandoffInput,
  deferredWriterInput: DeferredWriterInput,
  manifest: DeliveryHandoffManifest,
  deliveryPackageSignature: string,
): DeliveryHandoffSummary {
  const blockedArtifactCount = deferredWriterInput.artifacts.filter((artifact) => artifact.readinessStatus === "blocked").length;
  const readyForWriterCount = deferredWriterInput.artifacts.filter((artifact) => artifact.readinessStatus === "ready-for-writer").length;
  const partialCount = deferredWriterInput.artifacts.filter((artifact) => artifact.readinessStatus === "partial").length;
  const deferredWithKnownGapsCount = deferredWriterInput.artifacts.filter((artifact) => artifact.readinessStatus === "deferred-with-known-gaps").length;
  const unresolvedBlockers = deferredWriterInput.artifacts
    .flatMap((artifact) => artifact.readinessStatus === "blocked" ? artifact.blockers : [])
    .sort((left, right) => left.localeCompare(right));
  const readinessStatus = overallReadinessStatus(deferredWriterInput.artifacts);

  return {
    schemaVersion: 1,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    deliveryPackageSignature,
    stagedArtifactCount: manifest.generatedArtifacts.length,
    deferredArtifactCount: deferredWriterInput.artifacts.length,
    blockedArtifactCount,
    readyForWriterCount,
    partialCount,
    deferredWithKnownGapsCount,
    readinessStatus,
    unresolvedBlockers,
    note: readinessStatus === "ready-for-writer"
      ? "Deferred artifact contracts are complete and ready for a future writer boundary."
      : readinessStatus === "blocked"
        ? "Deferred artifact contracts remain blocked by missing prerequisites or blocked preservation findings."
        : readinessStatus === "partial"
          ? "Deferred artifact contracts are present, but saved review gaps or non-critical issues still affect writer readiness."
          : "Deferred artifact contracts exist, but at least one artifact kind remains outside the supported future-writer capability set.",
  };
}

function createEntry(
  rootRelativePath: string,
  fileName: DeliveryHandoffEntry["fileName"],
  payloadKind: DeliveryHandoffEntry["payloadKind"],
  content: string,
  summary: string,
): DeliveryHandoffEntry {
  return {
    kind: "handoff_file",
    relativePath: joinPath(rootRelativePath, "handoff", fileName),
    fileName,
    mimeType: "application/json",
    payloadKind,
    content,
    summary,
  };
}

export function prepareDeliveryHandoffSync(input: DeliveryHandoffInput): DeliveryHandoffBundle {
  const deliveryPackageSignature = buildDeliveryPackageSignature(input.deliveryPackage, input.exportArtifacts);
  const deferredPayloads = input.executionPlan.preparedArtifacts
    .filter((artifact): artifact is DeferredBinaryArtifactPayload => artifact.executionStatus === "deferred")
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
  const deferredWriterArtifacts = deferredPayloads.map((payload) => {
    const artifact = input.exportArtifacts.find((candidate) => candidate.id === payload.artifactId);
    if (!artifact) {
      throw new Error(`Deferred payload ${payload.artifactId} does not match a planned delivery artifact.`);
    }

    return createDeferredWriterArtifact(
      artifact,
      payload,
      input.stagingBundle,
      relevantIssues(artifact, input.preservationIssues),
      input.bundle,
      deliveryPackageSignature,
      input.sourceSignature,
      input.reviewSignature,
    );
  });
  const deferredWriterInput = createDeferredWriterInput(input, deferredWriterArtifacts, deliveryPackageSignature);
  const manifest = createManifest(input, deferredWriterInput, deliveryPackageSignature);
  const summaryJson = createSummary(input, deferredWriterInput, manifest, deliveryPackageSignature);
  const entries = [
    createEntry(
      input.stagingBundle.rootRelativePath,
      "deferred-writer-inputs.json",
      "deferred_writer_inputs",
      JSON.stringify(deferredWriterInput, null, 2),
      "Generated stable deferred-writer input contracts for all staged deferred artifacts.",
    ),
    createEntry(
      input.stagingBundle.rootRelativePath,
      "delivery-handoff-manifest.json",
      "delivery_handoff_manifest",
      JSON.stringify(manifest, null, 2),
      "Generated delivery handoff manifest that links staged outputs to deferred writer contracts.",
    ),
    createEntry(
      input.stagingBundle.rootRelativePath,
      "delivery-handoff-summary.json",
      "delivery_handoff_summary",
      JSON.stringify(summaryJson, null, 2),
      "Generated delivery handoff summary with readiness counts and unresolved blocker detail.",
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `handoff-${input.job.id}`,
    jobId: input.job.id,
    deliveryPackageId: input.deliveryPackage.id,
    rootRelativePath: joinPath(input.stagingBundle.rootRelativePath, "handoff"),
    entries,
    deferredWriterInput,
    manifest,
    summaryJson,
    summary: `Handoff contracts cover ${deferredWriterArtifacts.length} deferred artifact(s) with overall readiness ${summaryJson.readinessStatus}.`,
  };
}

export async function prepareDeliveryHandoff(input: DeliveryHandoffInput): Promise<DeliveryHandoffBundle> {
  return prepareDeliveryHandoffSync(input);
}
