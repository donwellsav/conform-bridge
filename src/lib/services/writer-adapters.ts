import { createDefaultWriterAdapters } from "./writer-adapter-registry";
import type {
  ExternalExecutionPackage,
  WriterAdapter,
  WriterAdapterArtifactInput,
  WriterAdapterArtifactMatch,
  WriterAdapterBundle,
  WriterAdapterInput,
  WriterAdapterReadiness,
  WriterAdapterResult,
} from "../types";

export interface WriterAdapterService {
  prepareBundle(packageBundle: ExternalExecutionPackage): Promise<WriterAdapterBundle>;
}

function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

function basename(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(index + 1) : filePath;
}

function readinessRank(readiness: WriterAdapterReadiness) {
  switch (readiness) {
    case "ready":
      return 0;
    case "partial":
      return 1;
    case "blocked":
      return 2;
    case "unsupported":
      return 3;
  }
}

function matchReason(
  artifact: WriterAdapterArtifactInput,
  status: WriterAdapterReadiness,
  matchingResults: WriterAdapterResult[],
) {
  const bestResult = [...matchingResults].sort((left, right) => {
    const leftStep = left.dryRun.executionPlan.steps.find((step) => step.artifactId === artifact.artifactId);
    const rightStep = right.dryRun.executionPlan.steps.find((step) => step.artifactId === artifact.artifactId);
    return readinessRank(leftStep?.readiness ?? "unsupported") - readinessRank(rightStep?.readiness ?? "unsupported");
  })[0];
  const bestStep = bestResult?.dryRun.executionPlan.steps.find((step) => step.artifactId === artifact.artifactId);

  if (!bestStep) {
    return `No registered writer adapter currently matches ${artifact.requiredWriterCapability}.`;
  }

  if (status === "unsupported") {
    return bestResult?.validation.unsupportedReasons.find((reason) => reason.artifactId === artifact.artifactId)?.message
      ?? bestStep.summary;
  }

  return bestStep.summary;
}

function artifactMatchStatus(artifact: WriterAdapterArtifactInput, matchingResults: WriterAdapterResult[]): WriterAdapterReadiness {
  const matchingReadiness = matchingResults
    .map((result) => result.dryRun.executionPlan.steps.find((step) => step.artifactId === artifact.artifactId)?.readiness)
    .filter((readiness): readiness is WriterAdapterReadiness => Boolean(readiness))
    .sort((left, right) => readinessRank(left) - readinessRank(right));

  return matchingReadiness[0] ?? "unsupported";
}

function bundleReadiness(matches: WriterAdapterArtifactMatch[]): WriterAdapterReadiness {
  if (matches.some((match) => match.status === "blocked")) {
    return "blocked";
  }

  if (matches.some((match) => match.status === "unsupported")) {
    return "unsupported";
  }

  if (matches.some((match) => match.status === "partial")) {
    return "partial";
  }

  return "ready";
}

function normalizeArtifactInputs(packageBundle: ExternalExecutionPackage): WriterAdapterArtifactInput[] {
  return packageBundle.deferredInputsJson.inputs
    .map((input) => ({
      artifactId: input.artifactId,
      artifactKind: input.artifactKind,
      fileName: basename(input.plannedOutputPath),
      relativePath: input.relativePath,
      deferredDescriptorPath: input.relativePath,
      plannedOutputPath: input.plannedOutputPath,
      requiredWriterCapability: input.requiredWriterCapability,
      packageStatus: packageBundle.status,
      writerReadinessStatus: input.readinessStatus,
      blockers: [...input.blockers].sort((left, right) => left.localeCompare(right)),
      dependencyIds: [...input.dependencyIds].sort((left, right) => left.localeCompare(right)),
      payload: input.payload,
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

export function normalizeWriterAdapterInput(packageBundle: ExternalExecutionPackage): WriterAdapterInput {
  return {
    version: 1,
    id: `writer-adapter-input-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    packageStatus: packageBundle.status,
    sourceSignature: packageBundle.sourceSignature,
    reviewSignature: packageBundle.reviewSignature,
    deliveryPackageSignature: packageBundle.deliveryPackageSignature,
    packageRoot: joinPath(packageBundle.rootRelativePath, "package"),
    stagedRoot: packageBundle.manifestJson.stagedRoot,
    handoffRoot: packageBundle.manifestJson.handoffRoot,
    artifactInputs: normalizeArtifactInputs(packageBundle),
  };
}

function applicableAdapters(input: WriterAdapterInput, adapters: WriterAdapter[]) {
  return adapters.filter((adapter) =>
    input.artifactInputs.some((artifact) => adapter.capabilities.includes(artifact.requiredWriterCapability)),
  );
}

function createArtifactMatches(input: WriterAdapterInput, adapterResults: WriterAdapterResult[]): WriterAdapterArtifactMatch[] {
  return input.artifactInputs.map((artifact) => {
    const matchingResults = adapterResults.filter((result) =>
      result.capabilities.includes(artifact.requiredWriterCapability),
    );
    const status = artifactMatchStatus(artifact, matchingResults);

    return {
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      artifactKind: artifact.artifactKind,
      requiredCapability: artifact.requiredWriterCapability,
      matchedAdapterIds: matchingResults.map((result) => result.id).sort((left, right) => left.localeCompare(right)),
      status,
      reason: matchReason(artifact, status, matchingResults),
    };
  });
}

export function prepareWriterAdapterBundleSync(
  packageBundle: ExternalExecutionPackage,
  adapters: WriterAdapter[] = createDefaultWriterAdapters(),
): WriterAdapterBundle {
  const input = normalizeWriterAdapterInput(packageBundle);
  const applicable = applicableAdapters(input, adapters);
  const adapterResults: WriterAdapterResult[] = applicable
    .map((adapter) => ({
      id: adapter.id,
      version: adapter.version,
      label: adapter.label,
      capabilities: [...adapter.capabilities].sort((left, right) => left.localeCompare(right)),
      validation: adapter.validate(input),
      dryRun: adapter.dryRun(input),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
  const artifactMatches = createArtifactMatches(input, adapterResults);
  const readiness = bundleReadiness(artifactMatches);

  return {
    id: `writer-adapter-bundle-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    packageStatus: packageBundle.status,
    input,
    adapters: adapterResults,
    artifactMatches,
    readiness,
    summary: readiness === "ready"
      ? `Every deferred artifact in ${packageBundle.rootFolderName} has a matching adapter contract and passes dry-run validation.`
      : readiness === "partial"
        ? `Deferred artifacts in ${packageBundle.rootFolderName} have matching adapters, but at least one still has dependency gaps.`
        : readiness === "blocked"
          ? `Deferred artifacts in ${packageBundle.rootFolderName} remain blocked by current package or handoff prerequisites.`
          : `At least one deferred artifact in ${packageBundle.rootFolderName} still has no usable writer adapter path.`,
  };
}

export async function prepareWriterAdapterBundle(packageBundle: ExternalExecutionPackage): Promise<WriterAdapterBundle> {
  return prepareWriterAdapterBundleSync(packageBundle);
}
