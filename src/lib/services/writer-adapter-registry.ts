import type {
  WriterAdapter,
  WriterAdapterArtifactInput,
  WriterAdapterCapability,
  WriterAdapterDryRunResult,
  WriterAdapterId,
  WriterAdapterInput,
  WriterAdapterReadiness,
  WriterAdapterUnsupportedReason,
  WriterAdapterValidationResult,
} from "../types";

function sortReasons(reasons: WriterAdapterUnsupportedReason[]) {
  return [...reasons].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.capability ?? ""}:${left.message}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.capability ?? ""}:${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function baseArtifactReadiness(input: WriterAdapterInput, artifact: WriterAdapterArtifactInput): WriterAdapterReadiness {
  if (input.packageStatus === "blocked" || artifact.writerReadinessStatus === "blocked") {
    return "blocked";
  }

  if (
    input.packageStatus === "partial"
    || artifact.writerReadinessStatus === "partial"
    || artifact.writerReadinessStatus === "deferred-with-known-gaps"
  ) {
    return "partial";
  }

  return "ready";
}

function collectImplementedReasons(input: WriterAdapterInput, artifact: WriterAdapterArtifactInput) {
  const reasons: WriterAdapterUnsupportedReason[] = [];

  if (input.packageStatus === "blocked") {
    reasons.push({
      code: "package_blocked",
      artifactId: artifact.artifactId,
      capability: artifact.requiredWriterCapability,
      message: "External execution package is blocked by unresolved staged or handoff prerequisites.",
    });
  }

  if (artifact.writerReadinessStatus === "blocked") {
    reasons.push({
      code: "artifact_blocked",
      artifactId: artifact.artifactId,
      capability: artifact.requiredWriterCapability,
      message: artifact.blockers[0] ?? `${artifact.fileName} remains blocked by deferred-writer prerequisites.`,
    });
  }

  if (
    input.packageStatus === "partial"
    || artifact.writerReadinessStatus === "partial"
    || artifact.writerReadinessStatus === "deferred-with-known-gaps"
  ) {
    reasons.push({
      code: "dependency_gap",
      artifactId: artifact.artifactId,
      capability: artifact.requiredWriterCapability,
      message: artifact.blockers[0] ?? `${artifact.fileName} still has known gaps or review-dependent inputs.`,
    });
  }

  return sortReasons(reasons);
}

function readinessFromSteps(steps: WriterAdapterDryRunResult["executionPlan"]["steps"]): WriterAdapterReadiness {
  if (steps.some((step) => step.readiness === "blocked")) {
    return "blocked";
  }

  if (steps.some((step) => step.readiness === "unsupported")) {
    return "unsupported";
  }

  if (steps.some((step) => step.readiness === "partial")) {
    return "partial";
  }

  return "ready";
}

function implementedAdapter(id: WriterAdapterId, label: string, capabilities: WriterAdapterCapability[]): WriterAdapter {
  return {
    id,
    version: 1,
    label,
    capabilities,
    validate(input: WriterAdapterInput): WriterAdapterValidationResult {
      const matchingArtifacts = input.artifactInputs.filter((artifact) => capabilities.includes(artifact.requiredWriterCapability));
      const diagnostics = matchingArtifacts.length > 0
        ? [`${matchingArtifacts.length} deferred artifact contract(s) match this adapter.`]
        : ["No deferred artifact contracts in this package match this adapter."];
      const unsupportedReasons = sortReasons(matchingArtifacts.flatMap((artifact) => collectImplementedReasons(input, artifact)));
      const readiness = matchingArtifacts.length === 0
        ? "unsupported"
        : unsupportedReasons.some((reason) => reason.code === "package_blocked" || reason.code === "artifact_blocked")
          ? "blocked"
          : unsupportedReasons.some((reason) => reason.code === "dependency_gap")
            ? "partial"
            : "ready";

      return {
        adapterId: id,
        readiness,
        diagnostics,
        supportedArtifactIds: matchingArtifacts.map((artifact) => artifact.artifactId).sort((left, right) => left.localeCompare(right)),
        unsupportedReasons,
      };
    },
    dryRun(input: WriterAdapterInput): WriterAdapterDryRunResult {
      const validation = this.validate(input);
      const steps = input.artifactInputs
        .filter((artifact) => capabilities.includes(artifact.requiredWriterCapability))
        .map((artifact) => {
          const readiness = baseArtifactReadiness(input, artifact);

          return {
            artifactId: artifact.artifactId,
            fileName: artifact.fileName,
            plannedOutputPath: artifact.plannedOutputPath,
            requiredCapability: artifact.requiredWriterCapability,
            readiness,
            summary: readiness === "ready"
              ? `${label} can consume ${artifact.fileName} through the packaged deferred-writer contract without reaching back into app state.`
              : readiness === "partial"
                ? `${label} can inspect ${artifact.fileName}, but known dependency gaps still affect future writer execution.`
                : `${label} cannot proceed with ${artifact.fileName} until blocked package or artifact prerequisites are cleared.`,
            blockers: [...artifact.blockers].sort((left, right) => left.localeCompare(right)),
          };
        })
        .sort((left, right) => left.fileName.localeCompare(right.fileName));
      const readiness = readinessFromSteps(steps);

      return {
        adapterId: id,
        adapterLabel: label,
        validation,
        executionPlan: {
          adapterId: id,
          readiness,
          steps,
          dependencySummary: {
            totalArtifacts: steps.length,
            readyCount: steps.filter((step) => step.readiness === "ready").length,
            partialCount: steps.filter((step) => step.readiness === "partial").length,
            blockedCount: steps.filter((step) => step.readiness === "blocked").length,
            unsupportedCount: steps.filter((step) => step.readiness === "unsupported").length,
          },
          note: readiness === "ready"
            ? `${label} can consume every matching deferred contract in a deterministic dry run.`
            : readiness === "partial"
              ? `${label} can inspect every matching deferred contract, but some still carry known gaps.`
              : `${label} is blocked by current package or artifact readiness, even though the adapter contract is defined.`,
        },
      };
    },
  };
}

function placeholderAdapter(id: WriterAdapterId, label: string, capabilities: WriterAdapterCapability[], explanation: string): WriterAdapter {
  return {
    id,
    version: 1,
    label,
    capabilities,
    validate(input: WriterAdapterInput): WriterAdapterValidationResult {
      const matchingArtifacts = input.artifactInputs.filter((artifact) => capabilities.includes(artifact.requiredWriterCapability));
      const diagnostics = matchingArtifacts.length > 0
        ? [`${matchingArtifacts.length} deferred artifact contract(s) match this future adapter placeholder.`]
        : ["No deferred artifact contracts in this package match this future adapter placeholder."];
      const unsupportedReasons = sortReasons(matchingArtifacts.map((artifact) => ({
        code: "adapter_not_implemented" as const,
        artifactId: artifact.artifactId,
        capability: artifact.requiredWriterCapability,
        message: `${label} is not implemented yet. ${explanation}`,
      })));

      return {
        adapterId: id,
        readiness: matchingArtifacts.length > 0 ? "unsupported" : "unsupported",
        diagnostics,
        supportedArtifactIds: matchingArtifacts.map((artifact) => artifact.artifactId).sort((left, right) => left.localeCompare(right)),
        unsupportedReasons,
      };
    },
    dryRun(input: WriterAdapterInput): WriterAdapterDryRunResult {
      const validation = this.validate(input);
      const steps = input.artifactInputs
        .filter((artifact) => capabilities.includes(artifact.requiredWriterCapability))
        .map((artifact) => ({
          artifactId: artifact.artifactId,
          fileName: artifact.fileName,
          plannedOutputPath: artifact.plannedOutputPath,
          requiredCapability: artifact.requiredWriterCapability,
          readiness: "unsupported" as const,
          summary: `${label} advertises ${artifact.requiredWriterCapability}, but still remains a contract-only placeholder.`,
          blockers: [...artifact.blockers, explanation].sort((left, right) => left.localeCompare(right)),
        }))
        .sort((left, right) => left.fileName.localeCompare(right.fileName));

      return {
        adapterId: id,
        adapterLabel: label,
        validation,
        executionPlan: {
          adapterId: id,
          readiness: steps.length > 0 ? "unsupported" : "unsupported",
          steps,
          dependencySummary: {
            totalArtifacts: steps.length,
            readyCount: 0,
            partialCount: 0,
            blockedCount: 0,
            unsupportedCount: steps.length,
          },
          note: `${label} only proves the future capability boundary. It does not execute a writer yet.`,
        },
      };
    },
  };
}

export function createDefaultWriterAdapters(): WriterAdapter[] {
  return [
    implementedAdapter(
      "reference-noop-writer-adapter",
      "Reference no-op adapter",
      ["aaf_delivery_writer", "reference_video_handoff", "native_nuendo_session_writer"],
    ),
    placeholderAdapter(
      "future-nuendo-aaf-writer",
      "Future Nuendo AAF writer",
      ["aaf_delivery_writer"],
      "The real Nuendo-ready AAF writer remains out of scope for this phase.",
    ),
    placeholderAdapter(
      "future-reference-video-handoff",
      "Future reference video handoff",
      ["reference_video_handoff"],
      "Reference video binary handoff is still deferred behind a later writer/media boundary.",
    ),
  ];
}
