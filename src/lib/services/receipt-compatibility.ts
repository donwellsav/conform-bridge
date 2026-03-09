import type {
  ExternalExecutionPackage,
  ReceiptNormalizationResult,
  WriterRunAttemptHistory,
  WriterRunDispatchStatus,
  WriterRunReceiptIngestionResult,
  WriterRunTransportAdapterBundle,
  WriterRunTransportBundle,
} from "../types";

export interface ReceiptCompatibilityContext {
  packageBundle: ExternalExecutionPackage;
  transportBundle: WriterRunTransportBundle;
  adapterBundle: WriterRunTransportAdapterBundle;
  importedCorrelations: Set<string>;
  importedFingerprints: Set<string>;
}

export interface ReceiptCompatibilityEvaluation {
  result: WriterRunReceiptIngestionResult;
  nextStatus?: WriterRunDispatchStatus;
  historyItem?: WriterRunAttemptHistory;
}

function createBaseResult(normalization: ReceiptNormalizationResult): WriterRunReceiptIngestionResult {
  return {
    id: `writer-run-receipt-import-${normalization.id}`,
    sourceFileName: normalization.sourceFileName,
    sourcePath: normalization.sourcePath,
    normalizationStatus: normalization.status,
    compatibilityProfile: normalization.compatibilityProfile,
    payloadSource: normalization.payloadSource,
    payloadFingerprint: normalization.payloadFingerprint,
    importStatus: normalization.status === "migrated"
      ? "receipt-migrated"
      : normalization.status === "partially-compatible"
        ? "receipt-partial"
        : normalization.status === "invalid"
          ? "receipt-invalid"
          : normalization.status === "incompatible"
            ? "receipt-incompatible"
            : "receipt-imported",
    matchStatus: "unmatched",
    validationStatus: normalization.status === "invalid"
      ? "invalid"
      : normalization.status === "incompatible"
        ? "incompatible"
        : normalization.status === "partially-compatible"
          ? "partially-compatible"
          : normalization.schemaMatch.status === "unknown-version"
            ? "version-mismatch"
            : "valid",
    signatureMatch: "unmatched",
    correlationMatch: "unmatched",
    dispatchStatus: normalization.status === "invalid"
      ? "invalid"
      : normalization.status === "incompatible"
        ? "incompatible"
        : "unmatched",
    note: normalization.note,
    warnings: normalization.warnings.map((warning) => warning.message),
    errors: normalization.problems.map((problem) => problem.message),
  };
}

function cloneHistoryItem(historyItem: WriterRunAttemptHistory) {
  return {
    ...historyItem,
    statusTrail: [...historyItem.statusTrail],
    retryState: { ...historyItem.retryState },
    cancellationState: { ...historyItem.cancellationState },
    failure: historyItem.failure ? { ...historyItem.failure } : undefined,
  };
}

function appendHistoryStatus(historyItem: WriterRunAttemptHistory, status: WriterRunDispatchStatus, note: string): WriterRunAttemptHistory {
  return {
    ...cloneHistoryItem(historyItem),
    currentStatus: status,
    statusTrail: [...historyItem.statusTrail, status],
    note,
  };
}

export function evaluateReceiptCompatibility(
  context: ReceiptCompatibilityContext,
  normalization: ReceiptNormalizationResult,
): ReceiptCompatibilityEvaluation {
  const result = createBaseResult(normalization);

  if (!normalization.envelope) {
    return { result };
  }

  const envelope = normalization.envelope;
  const directEnvelope = context.adapterBundle.dispatchEnvelopes.find((candidate) => candidate.correlationId === envelope.correlationId);
  const dispatchIdEnvelope = directEnvelope ?? context.adapterBundle.dispatchEnvelopes.find((candidate) => candidate.dispatchId === envelope.dispatchId);
  const artifactEnvelope = dispatchIdEnvelope ?? context.adapterBundle.dispatchEnvelopes.find((candidate) => candidate.artifactId === envelope.artifactId);
  const matchedEnvelope = artifactEnvelope;
  const directHistory = context.transportBundle.history.find((candidate) => candidate.correlationId === envelope.correlationId);
  const dispatchIdHistory = directHistory ?? context.transportBundle.history.find((candidate) => candidate.artifactId === envelope.artifactId);
  const matchedHistory = dispatchIdHistory;

  result.correlationId = envelope.correlationId;
  result.dispatchId = envelope.dispatchId;
  result.artifactId = envelope.artifactId;

  if (!matchedEnvelope || !matchedHistory) {
    result.importStatus = "receipt-unmatched";
    result.matchStatus = "unmatched";
    result.validationStatus = result.validationStatus === "invalid" ? "invalid" : result.validationStatus;
    result.signatureMatch = "unmatched";
    result.correlationMatch = "unmatched";
    result.dispatchStatus = "unmatched";
    result.note = `No dispatch record matched receipt ${normalization.sourceFileName}.`;
    return { result };
  }

  result.correlationMatch = directEnvelope
    ? "matched"
    : dispatchIdEnvelope && dispatchIdEnvelope.dispatchId === envelope.dispatchId
      ? "dispatch-id-fallback"
      : artifactEnvelope && artifactEnvelope.artifactId === envelope.artifactId
        ? "artifact-fallback"
        : "partial-match";
  result.matchStatus = result.correlationMatch === "matched" ? "matched" : "partial-match";

  if (result.correlationMatch === "dispatch-id-fallback") {
    result.warnings.push("Receipt matched by dispatch id after correlation-id drift.");
  } else if (result.correlationMatch === "artifact-fallback") {
    result.warnings.push("Receipt matched by artifact id after correlation-id drift.");
  }

  if (context.importedFingerprints.has(envelope.payloadFingerprint)) {
    result.importStatus = "receipt-duplicate";
    result.matchStatus = "duplicate";
    result.dispatchStatus = "duplicate";
    result.note = `Receipt ${normalization.sourceFileName} duplicates a previously imported payload fingerprint.`;
    return { result };
  }

  const packageMatches = matchedEnvelope.packageId === envelope.packageId && context.packageBundle.id === envelope.packageId;
  const sourceMatches = context.packageBundle.sourceSignature === envelope.sourceSignature;
  const reviewMatches = context.packageBundle.reviewSignature === envelope.reviewSignature;
  const deliveryMatches = context.packageBundle.deliveryPackageSignature === envelope.deliveryPackageSignature;

  if (packageMatches && sourceMatches && reviewMatches && deliveryMatches) {
    result.signatureMatch = "matched";
  } else if (matchedEnvelope.artifactId === envelope.artifactId && (sourceMatches || reviewMatches)) {
    result.signatureMatch = "drifted";
  } else if (matchedEnvelope.artifactId === envelope.artifactId) {
    result.signatureMatch = "superseded";
  } else {
    result.signatureMatch = "stale";
  }

  if (result.signatureMatch === "superseded") {
    result.importStatus = "receipt-superseded";
    result.matchStatus = "superseded";
    result.validationStatus = "signature-mismatch";
    result.dispatchStatus = "superseded";
    result.note = `Receipt ${normalization.sourceFileName} targets an earlier dispatch revision and has been superseded by the active package signatures.`;
    return { result };
  }

  if (result.signatureMatch === "stale" || result.signatureMatch === "drifted") {
    result.importStatus = "receipt-stale";
    result.validationStatus = "signature-mismatch";
    result.dispatchStatus = "stale";
    result.note = result.signatureMatch === "drifted"
      ? `Receipt ${normalization.sourceFileName} matched the active dispatch envelope but drifted from the current source or review signature.`
      : `Receipt ${normalization.sourceFileName} is stale for the active package and review signatures.`;
    return { result };
  }

  if (context.importedCorrelations.has(envelope.correlationId)) {
    result.importStatus = "receipt-duplicate";
    result.matchStatus = "duplicate";
    result.dispatchStatus = "duplicate";
    result.note = `Receipt ${normalization.sourceFileName} duplicates an already imported correlation id for the active package signatures.`;
    return { result };
  }

  const nextStatus = envelope.status === "completed"
    ? "completed"
    : envelope.status === "partial"
      ? "partial"
      : "failed";
  const note = envelope.note || `Imported ${envelope.status} receipt for ${envelope.fileName}.`;

  result.dispatchStatus = nextStatus;
  result.note = note;

  return {
    result,
    nextStatus,
    historyItem: appendHistoryStatus(matchedHistory, nextStatus, note),
  };
}
