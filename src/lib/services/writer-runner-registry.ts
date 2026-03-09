import type {
  WriterRunAttempt,
  WriterRunRequest,
  WriterRunResponse,
  WriterRunResponseStatus,
  WriterRunner,
  WriterRunnerCapability,
  WriterRunnerId,
  WriterRunnerInput,
  WriterRunnerReadiness,
  WriterRunnerUnsupportedReason,
  WriterRunnerValidationResult,
} from "../types";

function sortUnsupportedReasons(reasons: WriterRunnerUnsupportedReason[]) {
  return [...reasons].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.capability ?? ""}:${left.message}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.capability ?? ""}:${right.message}`;
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

function aggregateResponseStatus(statuses: WriterRunResponseStatus[]) {
  if (statuses.length === 0) {
    return "unsupported" as const;
  }

  const simulatedCount = statuses.filter((status) => status === "simulated-noop").length;
  if (simulatedCount === statuses.length) {
    return "simulated-noop" as const;
  }

  if (simulatedCount > 0) {
    return "partial" as const;
  }

  if (statuses.some((status) => status === "blocked")) {
    return "blocked" as const;
  }

  if (statuses.some((status) => status === "partial")) {
    return "partial" as const;
  }

  return "unsupported" as const;
}

function referenceRunner(id: WriterRunnerId, label: string, capabilities: WriterRunnerCapability[]): WriterRunner {
  return {
    id,
    version: 1,
    label,
    capabilities,
    validate(input: WriterRunnerInput): WriterRunnerValidationResult {
      const matchingArtifacts = input.artifactInputs.filter((artifact) => capabilities.includes(artifact.requiredCapability));
      const runnableArtifactIds = matchingArtifacts
        .filter((artifact) => artifact.runnerReadiness === "ready")
        .map((artifact) => artifact.artifactId)
        .sort((left, right) => left.localeCompare(right));
      const unsupportedReasons = sortUnsupportedReasons(
        matchingArtifacts
          .filter((artifact) => artifact.runnerReadiness !== "ready")
          .map((artifact) => ({
            code: artifact.runnerReadiness === "unsupported"
              ? "unsupported_capability"
              : "runner_not_implemented",
            artifactId: artifact.artifactId,
            capability: artifact.requiredCapability,
            message: artifact.blockerReasons[0]?.message
              ?? `${artifact.fileName} is not runnable through ${label} yet.`,
          })),
      );

      return {
        runnerId: id,
        readiness: aggregateReadiness(matchingArtifacts.map((artifact) => artifact.runnerReadiness)),
        diagnostics: matchingArtifacts.length > 0
          ? [`${matchingArtifacts.length} deferred artifact contract(s) match this runner.`]
          : ["No deferred artifact contracts match this runner."],
        runnableArtifactIds,
        unsupportedReasons,
      };
    },
    run(request: WriterRunRequest): WriterRunResponse {
      const attempts: WriterRunAttempt[] = request.requests.map((artifactRequest) => {
        const responseStatus: WriterRunResponseStatus = artifactRequest.requestReadiness === "ready"
          ? "simulated-noop"
          : artifactRequest.requestReadiness === "partial"
            ? "partial"
            : artifactRequest.requestReadiness === "blocked"
              ? "blocked"
              : "unsupported";

        return {
          artifactId: artifactRequest.artifactId,
          requestArtifactId: artifactRequest.id,
          attemptSequence: 1,
          adapterId: artifactRequest.adapterId,
          runnerId: artifactRequest.runnerId,
          requestReadiness: artifactRequest.requestReadiness,
          responseStatus,
          simulated: responseStatus === "simulated-noop",
          note: responseStatus === "simulated-noop"
            ? `${label} accepted ${artifactRequest.fileName} and recorded a deterministic no-op execution receipt.`
            : responseStatus === "partial"
              ? `${label} inspected ${artifactRequest.fileName}, but the request still has known gaps.`
              : responseStatus === "blocked"
                ? `${label} could not run ${artifactRequest.fileName} because prerequisites remain blocked.`
                : `${label} could not run ${artifactRequest.fileName} because no runnable path is available in this phase.`,
          blockedReasons: artifactRequest.blockedReasons,
        };
      });
      const status = aggregateResponseStatus(attempts.map((attempt) => attempt.responseStatus));

      return {
        version: 1,
        id: `writer-run-response-${request.jobId}-${id}`,
        requestId: request.id,
        runnerId: id,
        status,
        attempts,
        summary: status === "simulated-noop"
          ? `${label} produced deterministic no-op responses for every runnable deferred artifact request.`
          : status === "partial"
            ? `${label} produced a mixed result: at least one request was simulated while other deferred requests remained blocked or unsupported.`
            : status === "blocked"
              ? `${label} could not run because current deferred artifact requests are still blocked.`
              : `${label} found no runnable deferred artifact requests in this phase.`,
      };
    },
  };
}

export function createDefaultWriterRunners(): WriterRunner[] {
  return [
    referenceRunner(
      "reference-noop-writer-runner",
      "Reference no-op runner",
      ["aaf_delivery_writer", "reference_video_handoff", "native_nuendo_session_writer"],
    ),
  ];
}
