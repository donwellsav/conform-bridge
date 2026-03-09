import { evaluateReceiptCompatibility } from "./receipt-compatibility";
import { normalizeReceiptSource } from "./receipt-normalization";
import { aggregateDispatchStatus, joinPath, sortAuditEvents, stableToken } from "./writer-run-audit";
import type {
  ExecutorCompatibilityBundle,
  ExternalExecutionPackage,
  ReceiptNormalizationResult,
  WriterRunAuditEvent,
  WriterRunAuditRecord,
  WriterRunAttemptHistory,
  WriterRunDispatchStatus,
  WriterRunReceiptEnvelope,
  WriterRunReceiptImportStatus,
  WriterRunReceiptIngestionBundle,
  WriterRunReceiptIngestionEntry,
  WriterRunReceiptIngestionResult,
  WriterRunReceiptSourceFile,
  WriterRunTransportAdapterBundle,
  WriterRunTransportBundle,
  WriterRunTransportReceipt,
} from "../types";

function sortReceiptSources(sources: WriterRunReceiptSourceFile[]) {
  return [...sources].sort((left, right) => left.fileName.localeCompare(right.fileName) || left.id.localeCompare(right.id));
}

function cloneHistory(history: WriterRunAttemptHistory[]): WriterRunAttemptHistory[] {
  return history.map((item) => ({
    ...item,
    statusTrail: [...item.statusTrail],
    retryState: { ...item.retryState },
    cancellationState: { ...item.cancellationState },
    failure: item.failure ? { ...item.failure } : undefined,
  }));
}

function createEventId(suffix: string, correlationId: string, sequence: number) {
  return `writer-run-receipt-audit-${suffix}-${stableToken(correlationId, String(sequence))}`;
}

function baseAuditEvent(
  envelope: WriterRunReceiptEnvelope | undefined,
  sequence: number,
  eventType: WriterRunAuditEvent["eventType"],
  status: WriterRunDispatchStatus,
  note: string,
): WriterRunAuditEvent {
  const correlationId = envelope?.correlationId ?? `receipt-correlation-${stableToken(eventType, note, String(sequence))}`;

  return {
    id: createEventId(eventType, correlationId, sequence),
    correlationId,
    artifactId: envelope?.artifactId,
    sequence,
    eventType,
    status,
    requestId: envelope?.requestId ?? "unknown-request",
    responseId: envelope ? `transport-receipt-response-${envelope.dispatchId}` : "unknown-response",
    receiptId: envelope?.id ?? `unknown-receipt-${stableToken(note, String(sequence))}`,
    sourceSignature: envelope?.sourceSignature ?? "unknown-source-signature",
    reviewSignature: envelope?.reviewSignature ?? "unknown-review-signature",
    note,
  };
}

function createReceiptEvents(
  normalization: ReceiptNormalizationResult,
  result: WriterRunReceiptIngestionResult,
  sequenceBase: number,
): WriterRunAuditEvent[] {
  const envelope = normalization.envelope;
  const events: WriterRunAuditEvent[] = [];
  let sequence = sequenceBase;

  if (normalization.status === "normalized" || normalization.status === "partially-compatible") {
    events.push(baseAuditEvent(envelope, sequence, "receipt-normalized", "receipt-normalized", normalization.note));
    sequence += 1;
  } else if (normalization.status === "migrated") {
    events.push(baseAuditEvent(envelope, sequence, "receipt-migrated", "receipt-migrated", normalization.note));
    sequence += 1;
  }

  if (result.matchStatus === "matched" || result.matchStatus === "partial-match") {
    events.push(baseAuditEvent(envelope, sequence, "receipt-matched", "receipt-matched", result.note));
    sequence += 1;
  }

  switch (result.importStatus) {
    case "receipt-imported":
    case "receipt-migrated":
    case "receipt-partial":
      events.push(baseAuditEvent(envelope, sequence, "receipt-imported", "receipt-imported", result.note));
      sequence += 1;
      if (result.dispatchStatus === "completed") {
        events.push(baseAuditEvent(envelope, sequence, "completed", "completed", result.note));
      } else if (result.dispatchStatus === "partial") {
        events.push(baseAuditEvent(envelope, sequence, "partial", "partial", result.note));
      } else if (result.dispatchStatus === "failed") {
        events.push(baseAuditEvent(envelope, sequence, "failed", "failed", result.note));
      }
      break;
    case "receipt-duplicate":
      events.push(baseAuditEvent(envelope, sequence, "receipt-duplicate", "duplicate", result.note));
      break;
    case "receipt-stale":
      events.push(baseAuditEvent(envelope, sequence, "receipt-stale", "stale", result.note));
      break;
    case "receipt-superseded":
      events.push(baseAuditEvent(envelope, sequence, "superseded", "superseded", result.note));
      break;
    case "receipt-unmatched":
      events.push(baseAuditEvent(envelope, sequence, "receipt-unmatched", "unmatched", result.note));
      break;
    case "receipt-incompatible":
      events.push(baseAuditEvent(envelope, sequence, "receipt-incompatible", "incompatible", result.note));
      break;
    case "receipt-invalid":
      events.push(baseAuditEvent(envelope, sequence, "receipt-invalid", "invalid", result.note));
      break;
  }

  return events;
}

function aggregateReceiptStatus(
  results: WriterRunReceiptIngestionResult[],
  history: WriterRunAttemptHistory[],
  fallbackStatus: WriterRunDispatchStatus,
) {
  if (results.length === 0) {
    return fallbackStatus;
  }

  return aggregateDispatchStatus([
    ...results.map((result) => result.dispatchStatus),
    ...history.map((item) => item.currentStatus),
  ]);
}

function buildTransportReceiptNote(status: WriterRunDispatchStatus) {
  switch (status) {
    case "completed":
      return "Receipt ingestion imported matched external execution receipts for every runnable dispatch.";
    case "partial":
      return "Receipt ingestion imported a mix of completed and partial receipts.";
    case "failed":
      return "Receipt ingestion recorded one or more failure receipts.";
    case "stale":
      return "Receipt ingestion detected stale receipts that no longer match the active source or review signature.";
    case "superseded":
      return "Receipt ingestion detected receipts for superseded dispatch revisions.";
    case "duplicate":
      return "Receipt ingestion detected duplicate receipts for an already imported dispatch.";
    case "unmatched":
      return "Receipt ingestion detected receipts with no matching transport dispatch.";
    case "incompatible":
      return "Receipt ingestion detected receipts that matched a known profile but remain incompatible with the active transport contract.";
    case "invalid":
      return "Receipt ingestion detected invalid receipt payloads.";
    default:
      return "Receipt ingestion preserved the existing transport state without importing new external receipts.";
  }
}

function createTransportReceipt(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  history: WriterRunAttemptHistory[],
  results: WriterRunReceiptIngestionResult[],
  status: WriterRunDispatchStatus,
): WriterRunTransportReceipt {
  const importedStatuses: WriterRunReceiptImportStatus[] = ["receipt-imported", "receipt-migrated", "receipt-partial"];

  return {
    ...transportBundle.transportReceipt,
    id: `writer-run-transport-receipt-import-${packageBundle.jobId}-${stableToken(transportBundle.transportReceipt.id, status)}`,
    status,
    dispatchableCount: history.filter((item) => item.dispatchable).length,
    dispatchedCount: history.filter((item) =>
      item.statusTrail.includes("dispatched")
      || item.statusTrail.includes("acknowledged")
      || item.statusTrail.includes("runner-complete")
      || item.statusTrail.includes("receipt-recorded"),
    ).length,
    acknowledgedCount: history.filter((item) =>
      item.statusTrail.includes("acknowledged")
      || item.statusTrail.includes("runner-complete")
      || item.statusTrail.includes("receipt-recorded"),
    ).length,
    blockedCount: history.filter((item) => item.currentStatus === "runner-blocked").length,
    failedCount: history.filter((item) => item.currentStatus === "failed" || item.currentStatus === "transport-failed").length,
    cancelledCount: history.filter((item) => item.currentStatus === "cancelled").length,
    receiptRecordedCount: history.filter((item) => item.statusTrail.includes("receipt-recorded")).length,
    receiptNormalizedCount: results.filter((item) => item.normalizationStatus === "normalized" || item.normalizationStatus === "partially-compatible").length,
    receiptMigratedCount: results.filter((item) => item.normalizationStatus === "migrated").length,
    receiptImportedCount: results.filter((item) => importedStatuses.includes(item.importStatus)).length,
    completedCount: history.filter((item) => item.currentStatus === "completed").length,
    partialCount: history.filter((item) => item.currentStatus === "partial").length,
    staleCount: results.filter((item) => item.importStatus === "receipt-stale").length,
    supersededCount: results.filter((item) => item.importStatus === "receipt-superseded").length,
    duplicateCount: results.filter((item) => item.importStatus === "receipt-duplicate").length,
    unmatchedCount: results.filter((item) => item.importStatus === "receipt-unmatched").length,
    incompatibleCount: results.filter((item) => item.importStatus === "receipt-incompatible").length,
    partialCompatibilityCount: results.filter((item) => item.validationStatus === "partially-compatible").length,
    invalidCount: results.filter((item) => item.importStatus === "receipt-invalid").length,
    note: buildTransportReceiptNote(status),
  };
}

function createAuditRecord(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  events: WriterRunAuditEvent[],
  status: WriterRunDispatchStatus,
): WriterRunAuditRecord {
  return {
    ...transportBundle.auditRecord,
    id: `writer-run-receipt-audit-${packageBundle.jobId}-${stableToken(transportBundle.auditRecord.id, status)}`,
    events: sortAuditEvents(events),
    summary: buildTransportReceiptNote(status),
  };
}

function createEntry(
  relativePath: string,
  fileName: WriterRunReceiptIngestionEntry["fileName"],
  payloadKind: WriterRunReceiptIngestionEntry["payloadKind"],
  content: string,
  summary: string,
): WriterRunReceiptIngestionEntry {
  return {
    kind: "writer_run_receipt_ingestion_entry",
    relativePath,
    fileName,
    payloadKind,
    mimeType: "application/json",
    content,
    summary,
  };
}

export function ingestWriterRunReceiptsSync(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  adapterBundle: WriterRunTransportAdapterBundle,
  receiptSources: WriterRunReceiptSourceFile[],
  executorCompatibilityBundle?: ExecutorCompatibilityBundle,
): WriterRunReceiptIngestionBundle {
  const sortedSources = sortReceiptSources(receiptSources);
  const normalizationResults = sortedSources.map((source) => normalizeReceiptSource(source));
  const normalizedReceipts = normalizationResults
    .map((result) => result.envelope)
    .filter((result): result is WriterRunReceiptEnvelope => Boolean(result))
    .sort((left, right) => left.fileName.localeCompare(right.fileName) || left.id.localeCompare(right.id));
  const results: WriterRunReceiptIngestionResult[] = [];
  const historyMap = new Map(cloneHistory(transportBundle.history).map((item) => [item.correlationId, item]));
  const historyByArtifactId = new Map(cloneHistory(transportBundle.history).map((item) => [item.artifactId, item]));
  const auditEvents = [...transportBundle.auditRecord.events];
  const importedCorrelations = new Set<string>();
  const importedFingerprints = new Set<string>();
  let sequenceBase = auditEvents.reduce((highest, event) => Math.max(highest, event.sequence), 0) + 1;

  normalizationResults.forEach((normalization) => {
    const evaluation = evaluateReceiptCompatibility({
      packageBundle,
      transportBundle,
      adapterBundle,
      executorProfileId: executorCompatibilityBundle?.profile.id ?? adapterBundle.executorProfileId,
      expectedReceiptProfile: executorCompatibilityBundle?.profileResolution.expectedReceiptProfile ?? adapterBundle.dispatchEnvelopes[0]?.expectedReceiptProfile ?? "canonical-filesystem-transport-v1",
      acceptedReceiptProfiles: executorCompatibilityBundle?.profileResolution.acceptedReceiptProfiles ?? adapterBundle.dispatchEnvelopes[0]?.acceptedReceiptProfiles ?? ["canonical-filesystem-transport-v1"],
      importedCorrelations,
      importedFingerprints,
    }, normalization);

    const { result, historyItem, nextStatus } = evaluation;
    results.push(result);

    if (normalization.envelope && (result.importStatus === "receipt-imported" || result.importStatus === "receipt-migrated" || result.importStatus === "receipt-partial")) {
      importedCorrelations.add(normalization.envelope.correlationId);
      importedFingerprints.add(normalization.payloadFingerprint);

      if (historyItem && nextStatus) {
        historyMap.set(normalization.envelope.correlationId, historyItem);
        historyByArtifactId.set(normalization.envelope.artifactId, historyItem);
      }
    }

    const events = createReceiptEvents(normalization, result, sequenceBase);
    auditEvents.push(...events);
    sequenceBase += events.length;
  });

  const history = [...new Map([...historyMap.values(), ...historyByArtifactId.values()].map((item) => [item.correlationId, item])).values()]
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
  const status = aggregateReceiptStatus(results, history, transportBundle.status);
  const transportReceipt = createTransportReceipt(packageBundle, transportBundle, history, results, status);
  const auditRecord = createAuditRecord(packageBundle, transportBundle, auditEvents, status);
  const entries = [
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-compatibility-profiles.json"),
      "writer-run-receipt-compatibility-profiles.json",
      "writer_run_receipt_compatibility_profiles",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        executorProfileId: executorCompatibilityBundle?.profile.id ?? adapterBundle.executorProfileId,
        expectedReceiptProfile: executorCompatibilityBundle?.profileResolution.expectedReceiptProfile ?? adapterBundle.dispatchEnvelopes[0]?.expectedReceiptProfile ?? "canonical-filesystem-transport-v1",
        acceptedReceiptProfiles: executorCompatibilityBundle?.profileResolution.acceptedReceiptProfiles ?? adapterBundle.dispatchEnvelopes[0]?.acceptedReceiptProfiles ?? ["canonical-filesystem-transport-v1"],
        profiles: adapterBundle.declaredReceiptProfiles,
      }, null, 2),
      "Declared receipt compatibility profiles and supported schema versions for inbound receipt ingestion.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-normalization.json"),
      "writer-run-receipt-normalization.json",
      "writer_run_receipt_normalization",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        normalizationResults,
      }, null, 2),
      "Receipt normalization and compatibility results before dispatch matching.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-envelopes.json"),
      "writer-run-receipt-envelopes.json",
      "writer_run_receipt_envelopes",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        receipts: normalizedReceipts,
      }, null, 2),
      "Normalized receipt envelopes discovered from inbound transport receipt files.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-import-results.json"),
      "writer-run-receipt-import-results.json",
      "writer_run_receipt_import_results",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        results,
      }, null, 2),
      "Receipt ingestion results covering normalized, migrated, duplicate, stale, superseded, unmatched, incompatible, and invalid inbound receipts.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-audit-log.json"),
      "writer-run-receipt-audit-log.json",
      "writer_run_receipt_audit_log",
      JSON.stringify(auditRecord, null, 2),
      "Updated transport audit log after receipt normalization and ingestion.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-history.json"),
      "writer-run-receipt-history.json",
      "writer_run_receipt_history",
      JSON.stringify({
        version: 1,
        transportReceipt,
        history,
      }, null, 2),
      "Updated transport history and aggregate receipt state after inbound receipt ingestion.",
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `writer-run-receipt-ingestion-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    rootRelativePath: joinPath(packageBundle.rootRelativePath, "handoff"),
    packageId: packageBundle.id,
    sourceSignature: packageBundle.sourceSignature,
    reviewSignature: packageBundle.reviewSignature,
    deliveryPackageSignature: packageBundle.deliveryPackageSignature,
    executorProfileId: executorCompatibilityBundle?.profile.id ?? adapterBundle.executorProfileId,
    expectedReceiptProfile: executorCompatibilityBundle?.profileResolution.expectedReceiptProfile ?? adapterBundle.dispatchEnvelopes[0]?.expectedReceiptProfile ?? "canonical-filesystem-transport-v1",
    acceptedReceiptProfiles: executorCompatibilityBundle?.profileResolution.acceptedReceiptProfiles ?? adapterBundle.dispatchEnvelopes[0]?.acceptedReceiptProfiles ?? ["canonical-filesystem-transport-v1"],
    normalizationResults,
    compatibilityProfiles: adapterBundle.declaredReceiptProfiles,
    receipts: normalizedReceipts,
    results,
    auditRecord,
    history,
    transportReceipt,
    status,
    entries,
    summary: buildTransportReceiptNote(status),
  };
}
