import { createDefaultWriterRunners } from "./writer-runner-registry";
import type {
  ExternalExecutionPackage,
  WriterAdapterBundle,
  WriterAdapterReadiness,
  WriterRunArtifactRequest,
  WriterRunBlockedReason,
  WriterRunBundle,
  WriterRunEntry,
  WriterRunReceipt,
  WriterRunReceiptArtifact,
  WriterRunRequest,
  WriterRunResponse,
  WriterRunner,
  WriterRunnerArtifactInput,
  WriterRunnerInput,
  WriterRunnerReadiness,
} from "../types";

export interface WriterRunnerService {
  prepareBundle(packageBundle: ExternalExecutionPackage, adapterBundle: WriterAdapterBundle): Promise<WriterRunBundle>;
}

function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

function readinessRank(readiness: WriterAdapterReadiness | WriterRunnerReadiness) {
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

function sortBlockedReasons(reasons: WriterRunBlockedReason[]) {
  return [...reasons].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.message}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function aggregateReadiness(values: WriterRunnerReadiness[]) {
  if (values.some((value) => value === "blocked")) {
    return "blocked" as const;
  }

  if (values.some((value) => value === "partial")) {
    return "partial" as const;
  }

  if (values.some((value) => value === "unsupported")) {
    return "unsupported" as const;
  }

  return "ready" as const;
}

function baseBlockedReason(
  artifactId: string,
  status: WriterRunnerReadiness,
  message: string,
): WriterRunBlockedReason {
  return {
    code: status === "blocked"
      ? "artifact_blocked"
      : status === "partial"
        ? "dependency_gap"
        : "unsupported_capability",
    artifactId,
    message,
  };
}

function findBestAdapterId(bundle: WriterAdapterBundle, artifactId: string) {
  const results = bundle.adapters
    .map((adapter) => ({
      id: adapter.id,
      step: adapter.dryRun.executionPlan.steps.find((step) => step.artifactId === artifactId),
    }))
    .filter((item): item is { id: WriterAdapterBundle["adapters"][number]["id"]; step: NonNullable<typeof item.step> } => Boolean(item.step))
    .sort((left, right) => readinessRank(left.step.readiness) - readinessRank(right.step.readiness) || left.id.localeCompare(right.id));

  return results[0]?.id;
}

function mapArtifactInputs(packageBundle: ExternalExecutionPackage, adapterBundle: WriterAdapterBundle): WriterRunnerArtifactInput[] {
  return adapterBundle.input.artifactInputs.map((artifact) => {
    const match = adapterBundle.artifactMatches.find((candidate) => candidate.artifactId === artifact.artifactId);
    const runnerReadiness = (match?.status ?? "unsupported") as WriterRunnerReadiness;
    const blockerReasons = runnerReadiness === "ready"
      ? []
      : sortBlockedReasons([
          ...artifact.blockers.map((message) => baseBlockedReason(artifact.artifactId, runnerReadiness, message)),
          ...(match ? [baseBlockedReason(artifact.artifactId, runnerReadiness, match.reason)] : []),
        ]);

    return {
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      artifactKind: artifact.artifactKind,
      requiredCapability: artifact.requiredWriterCapability,
      plannedOutputPath: artifact.plannedOutputPath,
      relativePath: artifact.relativePath,
      packageStatus: packageBundle.status,
      adapterId: findBestAdapterId(adapterBundle, artifact.artifactId),
      adapterReadiness: match?.status ?? "unsupported",
      runnerReadiness,
      blockerReasons,
      dependencyIds: [...artifact.dependencyIds].sort((left, right) => left.localeCompare(right)),
      payload: artifact.payload,
    };
  }).sort((left, right) => left.fileName.localeCompare(right.fileName));
}

export function normalizeWriterRunnerInput(
  packageBundle: ExternalExecutionPackage,
  adapterBundle: WriterAdapterBundle,
): WriterRunnerInput {
  return {
    version: 1,
    id: `writer-runner-input-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    packageStatus: packageBundle.status,
    sourceSignature: packageBundle.sourceSignature,
    reviewSignature: packageBundle.reviewSignature,
    deliveryPackageSignature: packageBundle.deliveryPackageSignature,
    packageRoot: joinPath(packageBundle.rootRelativePath, "package"),
    handoffRoot: packageBundle.manifestJson.handoffRoot,
    adapterBundleId: adapterBundle.id,
    artifactInputs: mapArtifactInputs(packageBundle, adapterBundle),
  };
}

function matchingRunnerForArtifact(runners: WriterRunner[], artifact: WriterRunnerArtifactInput) {
  return runners
    .filter((runner) => runner.capabilities.includes(artifact.requiredCapability))
    .sort((left, right) => left.label.localeCompare(right.label))[0];
}

function requestReadiness(artifact: WriterRunnerArtifactInput, runner?: WriterRunner): WriterRunnerReadiness {
  if (!runner) {
    return "unsupported";
  }

  if (artifact.runnerReadiness !== "ready") {
    return artifact.runnerReadiness;
  }

  return "ready";
}

function requestBlockedReasons(artifact: WriterRunnerArtifactInput, runner?: WriterRunner) {
  if (runner) {
    return artifact.blockerReasons;
  }

  return sortBlockedReasons([
    ...artifact.blockerReasons,
    {
      code: "runner_not_available",
      artifactId: artifact.artifactId,
      message: `No registered writer runner currently supports ${artifact.requiredCapability}.`,
    },
  ]);
}

function createRequest(input: WriterRunnerInput, runners: WriterRunner[]): WriterRunRequest {
  const requests: WriterRunArtifactRequest[] = input.artifactInputs.map((artifact) => {
    const runner = matchingRunnerForArtifact(runners, artifact);
    const readiness = requestReadiness(artifact, runner);

    return {
      id: `writer-run-artifact-request-${artifact.artifactId}`,
      artifactId: artifact.artifactId,
      fileName: artifact.fileName,
      artifactKind: artifact.artifactKind,
      requiredCapability: artifact.requiredCapability,
      adapterId: artifact.adapterId,
      runnerId: runner?.id,
      requestReadiness: readiness,
      plannedOutputPath: artifact.plannedOutputPath,
      relativePath: artifact.relativePath,
      dependencyIds: artifact.dependencyIds,
      blockedReasons: requestBlockedReasons(artifact, runner),
      payload: {
        version: 1,
        artifactId: artifact.artifactId,
        sourceSignature: input.sourceSignature,
        reviewSignature: input.reviewSignature,
        deliveryPackageSignature: input.deliveryPackageSignature,
        adapterBundleId: input.adapterBundleId,
        adapterId: artifact.adapterId,
        runnerId: runner?.id,
        plannedOutputPath: artifact.plannedOutputPath,
      },
    };
  }).sort((left, right) => left.fileName.localeCompare(right.fileName));
  const readiness = aggregateReadiness(requests.map((artifact) => artifact.requestReadiness));

  return {
    version: 1,
    id: `writer-run-request-${input.jobId}`,
    jobId: input.jobId,
    deliveryPackageId: input.deliveryPackageId,
    packageStatus: input.packageStatus,
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    deliveryPackageSignature: input.deliveryPackageSignature,
    requestSequence: 1,
    requests,
    readiness,
    summary: readiness === "ready"
      ? `All deferred artifacts in ${input.jobId} are normalized into runnable writer requests.`
      : readiness === "partial"
        ? `At least one deferred artifact request in ${input.jobId} still has known gaps.`
        : readiness === "blocked"
          ? `Deferred artifact requests in ${input.jobId} remain blocked by current prerequisites.`
          : `At least one deferred artifact request in ${input.jobId} has no supported runnable path yet.`,
  };
}

function selectPrimaryRunner(request: WriterRunRequest, runners: WriterRunner[]) {
  const runnerIds = request.requests
    .map((artifact) => artifact.runnerId)
    .filter((runnerId): runnerId is NonNullable<typeof runnerId> => Boolean(runnerId));

  const firstRunnerId = [...new Set(runnerIds)].sort((left, right) => left.localeCompare(right))[0];
  return runners.find((runner) => runner.id === firstRunnerId) ?? runners[0];
}

function createReceipt(request: WriterRunRequest, response: WriterRunResponse, input: WriterRunnerInput): WriterRunReceipt {
  const artifacts: WriterRunReceiptArtifact[] = request.requests.map((artifactRequest) => {
    const attempt = response.attempts.find((candidate) => candidate.requestArtifactId === artifactRequest.id);
    const responseStatus = attempt?.responseStatus ?? "unsupported";

    return {
      artifactId: artifactRequest.artifactId,
      fileName: artifactRequest.fileName,
      adapterId: artifactRequest.adapterId,
      runnerId: artifactRequest.runnerId,
      requestReadiness: artifactRequest.requestReadiness,
      responseStatus,
      outcome: responseStatus,
      note: attempt?.note ?? `No runner response was recorded for ${artifactRequest.fileName}.`,
      blockedReasons: attempt?.blockedReasons ?? artifactRequest.blockedReasons,
    };
  }).sort((left, right) => left.fileName.localeCompare(right.fileName));

  const summary = {
    totalArtifacts: artifacts.length,
    runnableCount: artifacts.filter((artifact) => artifact.requestReadiness === "ready").length,
    simulatedCount: artifacts.filter((artifact) => artifact.responseStatus === "simulated-noop").length,
    partialCount: artifacts.filter((artifact) => artifact.responseStatus === "partial").length,
    blockedCount: artifacts.filter((artifact) => artifact.responseStatus === "blocked").length,
    unsupportedCount: artifacts.filter((artifact) => artifact.responseStatus === "unsupported").length,
    note: response.status === "simulated-noop"
      ? "Every runnable deferred artifact completed a deterministic no-op run."
      : response.status === "partial"
        ? "At least one deferred artifact produced a deterministic no-op response while others remained blocked or unsupported."
        : response.status === "blocked"
          ? "No deferred artifact run was attempted because current prerequisites remain blocked."
          : "No deferred artifact run was attempted because no supported runnable path exists yet.",
  };

  return {
    version: 1,
    id: `writer-run-receipt-${input.jobId}`,
    requestId: request.id,
    responseId: response.id,
    jobId: input.jobId,
    deliveryPackageId: input.deliveryPackageId,
    packageStatus: input.packageStatus,
    sourceSignature: input.sourceSignature,
    reviewSignature: input.reviewSignature,
    deliveryPackageSignature: input.deliveryPackageSignature,
    runnerReadiness: request.readiness,
    runnerId: response.runnerId,
    sequence: 1,
    summary,
    artifacts,
  };
}

function createEntry(
  rootRelativePath: string,
  fileName: WriterRunEntry["fileName"],
  payloadKind: WriterRunEntry["payloadKind"],
  content: string,
  summary: string,
): WriterRunEntry {
  return {
    kind: "writer_run_entry",
    relativePath: joinPath(rootRelativePath, "handoff", fileName),
    fileName,
    payloadKind,
    mimeType: "application/json",
    content,
    summary,
  };
}

export function prepareWriterRunBundleSync(
  packageBundle: ExternalExecutionPackage,
  adapterBundle: WriterAdapterBundle,
  runners: WriterRunner[] = createDefaultWriterRunners(),
): WriterRunBundle {
  const input = normalizeWriterRunnerInput(packageBundle, adapterBundle);
  const primaryRunner = runners[0];
  if (!primaryRunner) {
    throw new Error("At least one writer runner must be registered.");
  }

  const validation = primaryRunner.validate(input);
  const request = createRequest(input, runners);
  const runner = selectPrimaryRunner(request, runners);
  const response = runner.run(request);
  const receipt = createReceipt(request, response, input);
  const entries = [
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-requests.json",
      "writer_run_requests",
      JSON.stringify(request, null, 2),
      "Generated deterministic writer-run requests for packaged deferred artifacts.",
    ),
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-responses.json",
      "writer_run_responses",
      JSON.stringify(response, null, 2),
      "Generated deterministic writer-run responses from the reference no-op runner.",
    ),
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-receipts.json",
      "writer_run_receipts",
      JSON.stringify(receipt, null, 2),
      "Generated deterministic writer-run receipts summarizing runnable, blocked, and unsupported deferred artifacts.",
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const readiness = aggregateReadiness([request.readiness, validation.readiness]);

  return {
    id: `writer-run-bundle-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    rootRelativePath: joinPath(packageBundle.rootRelativePath, "handoff"),
    input,
    validation,
    request,
    response,
    receipt,
    entries,
    readiness,
    summary: readiness === "ready"
      ? `Deferred artifact requests for ${packageBundle.rootFolderName} are runnable through the reference no-op runner.`
      : readiness === "partial"
        ? `Deferred artifact requests for ${packageBundle.rootFolderName} include a mix of runnable and non-runnable items.`
        : readiness === "blocked"
          ? `Deferred artifact requests for ${packageBundle.rootFolderName} remain blocked by current prerequisites.`
          : `Deferred artifact requests for ${packageBundle.rootFolderName} remain unsupported by the current runner registry.`,
  };
}

export async function prepareWriterRunBundle(
  packageBundle: ExternalExecutionPackage,
  adapterBundle: WriterAdapterBundle,
): Promise<WriterRunBundle> {
  return prepareWriterRunBundleSync(packageBundle, adapterBundle);
}
