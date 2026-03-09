import type {
  WriterRunTransportAdapter,
  WriterRunTransportAdapterId,
  WriterRunTransportAdapterReadiness,
  WriterRunTransportAdapterUnsupportedReason,
  WriterRunTransportAdapterValidationResult,
  WriterRunTransportBundle,
  WriterRunTransportCapability,
  WriterRunTransportEndpoint,
} from "../types";

function sortReasons(reasons: WriterRunTransportAdapterUnsupportedReason[]) {
  return [...reasons].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.capability ?? ""}:${left.message}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.capability ?? ""}:${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

function readinessFromCounts(
  supportedCount: number,
  dispatchableCount: number,
  blockedCount: number,
): WriterRunTransportAdapterReadiness {
  if (supportedCount === 0) {
    return "unsupported";
  }

  if (dispatchableCount === supportedCount) {
    return "ready";
  }

  if (dispatchableCount > 0) {
    return "partial";
  }

  return blockedCount > 0 ? "blocked" : "unsupported";
}

function createEndpoint(jobId: string): WriterRunTransportEndpoint {
  const rootPath = `transport/${jobId}`;

  return {
    kind: "filesystem",
    label: "Filesystem transport root",
    rootPath,
    outboundPath: `${rootPath}/outbound`,
    inboundPath: `${rootPath}/inbound`,
  };
}

function createValidation(
  adapterId: WriterRunTransportAdapterId,
  capabilities: WriterRunTransportCapability[],
  bundle: WriterRunTransportBundle,
  implemented: boolean,
): WriterRunTransportAdapterValidationResult {
  const diagnostics: string[] = [];
  const supportedArtifactIds = bundle.envelopes.map((envelope) => envelope.artifactId).sort((left, right) => left.localeCompare(right));
  const unsupportedReasons: WriterRunTransportAdapterUnsupportedReason[] = [];

  if (!implemented) {
    supportedArtifactIds.forEach((artifactId) => {
      const envelope = bundle.envelopes.find((candidate) => candidate.artifactId === artifactId);
      if (!envelope) {
        return;
      }

      unsupportedReasons.push({
        code: "adapter_not_implemented",
        artifactId,
        capability: capabilities[0],
        message: `${adapterId} is currently a contract-only compatibility path.`,
      });
    });

    return {
      adapterId,
      readiness: supportedArtifactIds.length > 0 ? "unsupported" : "unsupported",
      diagnostics: supportedArtifactIds.length > 0
        ? [`${supportedArtifactIds.length} transport envelope(s) match this compatibility adapter.`]
        : ["No transport envelopes are available for this compatibility adapter."],
      supportedArtifactIds,
      unsupportedReasons: sortReasons(unsupportedReasons),
    };
  }

  const dispatchableCount = bundle.envelopes.filter((envelope) => envelope.dispatchable).length;
  const blockedCount = bundle.envelopes.length - dispatchableCount;

  if (dispatchableCount > 0) {
    diagnostics.push(`${dispatchableCount} transport envelope(s) are dispatchable through ${adapterId}.`);
  }

  if (blockedCount > 0) {
    diagnostics.push(`${blockedCount} transport envelope(s) remain blocked before dispatch.`);
  }

  bundle.envelopes.forEach((envelope) => {
    if (envelope.dispatchable) {
      return;
    }

    unsupportedReasons.push({
      code: "artifact_not_dispatchable",
      artifactId: envelope.artifactId,
      capability: capabilities[0],
      message: envelope.blockedReasons[0]?.message ?? `${envelope.fileName} cannot be dispatched in the current state.`,
    });
  });

  return {
    adapterId,
    readiness: readinessFromCounts(bundle.envelopes.length, dispatchableCount, blockedCount),
    diagnostics: diagnostics.length > 0 ? diagnostics : ["No transport envelopes are available for dispatch."],
    supportedArtifactIds,
    unsupportedReasons: sortReasons(unsupportedReasons),
  };
}

function createAdapter(
  id: WriterRunTransportAdapterId,
  label: string,
  capabilities: WriterRunTransportCapability[],
  endpoint: WriterRunTransportEndpoint,
  implemented: boolean,
): WriterRunTransportAdapter {
  return {
    id,
    version: 1,
    label,
    capabilities,
    endpoint,
    validate(bundle) {
      return createValidation(id, capabilities, bundle, implemented);
    },
  };
}

export function createDefaultWriterRunTransportAdapters(jobId: string): WriterRunTransportAdapter[] {
  const endpoint = createEndpoint(jobId);

  return [
    createAdapter(
      "filesystem-transport-adapter",
      "Filesystem transport adapter",
      ["filesystem_dispatch", "receipt_ingestion"],
      endpoint,
      true,
    ),
    createAdapter(
      "reference-noop-transport-adapter",
      "Reference no-op transport adapter",
      ["reference_noop_dispatch"],
      endpoint,
      false,
    ),
  ];
}
