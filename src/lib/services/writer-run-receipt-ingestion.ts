import { aggregateDispatchStatus, joinPath, sortAuditEvents, stableToken } from "./writer-run-audit";
import type {
  ExternalExecutionPackage,
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

function parseReceiptSource(source: WriterRunReceiptSourceFile): { envelope?: WriterRunReceiptEnvelope; errors: string[] } {
  try {
    const parsed = JSON.parse(source.content) as Record<string, unknown>;
    const errors: string[] = [];

    if (parsed.version !== 1) {
      errors.push(`Unsupported receipt version ${String(parsed.version)}.`);
    }

    const requiredStringFields = [
      "id",
      "adapterId",
      "transportId",
      "dispatchId",
      "correlationId",
      "packageId",
      "requestId",
      "artifactId",
      "fileName",
      "sourceSignature",
      "reviewSignature",
      "deliveryPackageSignature",
      "source",
      "status",
      "note",
    ] as const;

    requiredStringFields.forEach((field) => {
      if (typeof parsed[field] !== "string" || parsed[field].length === 0) {
        errors.push(`Receipt field ${field} must be a non-empty string.`);
      }
    });

    if (typeof parsed.receiptSequence !== "number") {
      errors.push("Receipt field receiptSequence must be a number.");
    }

    if (typeof parsed.payload !== "object" || parsed.payload === null || Array.isArray(parsed.payload)) {
      errors.push("Receipt field payload must be an object.");
    }

    if (errors.length > 0) {
      return { errors };
    }

    return {
      envelope: {
        version: 1,
        id: parsed.id as string,
        adapterId: parsed.adapterId as WriterRunReceiptEnvelope["adapterId"],
        transportId: parsed.transportId as WriterRunReceiptEnvelope["transportId"],
        dispatchId: parsed.dispatchId as string,
        correlationId: parsed.correlationId as string,
        packageId: parsed.packageId as string,
        requestId: parsed.requestId as string,
        artifactId: parsed.artifactId as string,
        fileName: parsed.fileName as string,
        sourceSignature: parsed.sourceSignature as string,
        reviewSignature: parsed.reviewSignature as string,
        deliveryPackageSignature: parsed.deliveryPackageSignature as string,
        source: parsed.source as WriterRunReceiptEnvelope["source"],
        receiptSequence: parsed.receiptSequence as number,
        status: parsed.status as WriterRunReceiptEnvelope["status"],
        note: parsed.note as string,
        payload: parsed.payload as Record<string, unknown>,
      },
      errors: [],
    };
  } catch (error) {
    return {
      errors: [error instanceof Error ? error.message : "Receipt content is not valid JSON."],
    };
  }
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

function appendHistoryStatus(historyItem: WriterRunAttemptHistory, status: WriterRunDispatchStatus, note: string) {
  const statusTrail = [...historyItem.statusTrail, status];

  return {
    ...historyItem,
    currentStatus: status,
    statusTrail,
    note,
  };
}

function aggregateReceiptStatus(results: WriterRunReceiptIngestionResult[], history: WriterRunAttemptHistory[], fallbackStatus: WriterRunDispatchStatus) {
  if (results.length === 0) {
    return fallbackStatus;
  }

  const statuses = results.map((result) => result.dispatchStatus);
  return aggregateDispatchStatus([...statuses, ...history.map((item) => item.currentStatus)]);
}

function createImportResult(
  source: WriterRunReceiptSourceFile,
  importStatus: WriterRunReceiptImportStatus,
  dispatchStatus: WriterRunDispatchStatus,
  note: string,
  errors: string[],
  envelope?: WriterRunReceiptEnvelope,
): WriterRunReceiptIngestionResult {
  return {
    id: `writer-run-receipt-import-${source.id}`,
    sourceFileName: source.fileName,
    sourcePath: source.absolutePath,
    importStatus,
    matchStatus: importStatus === "receipt-imported"
      ? "matched"
      : importStatus === "receipt-duplicate"
        ? "duplicate"
        : importStatus === "receipt-stale"
          ? "stale"
          : importStatus === "receipt-unmatched"
            ? "unmatched"
            : "unmatched",
    validationStatus: importStatus === "receipt-invalid"
      ? "invalid"
      : importStatus === "receipt-stale"
        ? "signature-mismatch"
        : "valid",
    dispatchStatus,
    correlationId: envelope?.correlationId,
    dispatchId: envelope?.dispatchId,
    artifactId: envelope?.artifactId,
    note,
    errors,
  };
}

function createReceiptEvent(
  envelope: WriterRunReceiptEnvelope,
  sequence: number,
  resultStatus: WriterRunDispatchStatus,
  note: string,
): WriterRunAuditEvent[] {
  const importedEvent = baseAuditEvent(envelope, sequence, "receipt-imported", "receipt-imported", `Imported receipt for ${envelope.fileName}.`);

  switch (resultStatus) {
    case "completed":
      return [
        importedEvent,
        baseAuditEvent(envelope, sequence + 1, "completed", "completed", note),
      ];
    case "partial":
      return [
        importedEvent,
        baseAuditEvent(envelope, sequence + 1, "partial", "partial", note),
      ];
    case "failed":
      return [
        importedEvent,
        baseAuditEvent(envelope, sequence + 1, "failed", "failed", note),
      ];
    case "stale":
      return [baseAuditEvent(envelope, sequence, "receipt-stale", "stale", note)];
    case "duplicate":
      return [baseAuditEvent(envelope, sequence, "receipt-duplicate", "duplicate", note)];
    case "unmatched":
      return [baseAuditEvent(envelope, sequence, "receipt-unmatched", "unmatched", note)];
    case "invalid":
      return [baseAuditEvent(envelope, sequence, "receipt-invalid", "invalid", note)];
    default:
      return [baseAuditEvent(envelope, sequence, "receipt-imported", resultStatus, note)];
  }
}

function createTransportReceipt(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  history: WriterRunAttemptHistory[],
  results: WriterRunReceiptIngestionResult[],
  status: WriterRunDispatchStatus,
): WriterRunTransportReceipt {
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
    receiptImportedCount: results.filter((item) => item.importStatus === "receipt-imported").length,
    completedCount: history.filter((item) => item.currentStatus === "completed").length,
    partialCount: history.filter((item) => item.currentStatus === "partial").length,
    staleCount: results.filter((item) => item.importStatus === "receipt-stale").length,
    duplicateCount: results.filter((item) => item.importStatus === "receipt-duplicate").length,
    unmatchedCount: results.filter((item) => item.importStatus === "receipt-unmatched").length,
    invalidCount: results.filter((item) => item.importStatus === "receipt-invalid").length,
    note: status === "completed"
      ? "Receipt ingestion imported matched external execution receipts for every runnable dispatch."
      : status === "partial"
        ? "Receipt ingestion imported a mix of completed and partial receipts."
        : status === "failed"
          ? "Receipt ingestion recorded one or more failure receipts."
          : status === "stale"
            ? "Receipt ingestion detected stale receipts that no longer match the active source or review signature."
            : status === "duplicate"
              ? "Receipt ingestion detected duplicate receipts for an already imported dispatch."
              : status === "unmatched"
                ? "Receipt ingestion detected receipts with no matching transport dispatch."
                : status === "invalid"
                  ? "Receipt ingestion detected invalid receipt payloads."
                  : "Receipt ingestion preserved the existing transport state without importing new external receipts.",
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
    summary: status === "completed"
      ? "Transport audit includes imported external receipts and completed execution outcomes."
      : status === "partial"
        ? "Transport audit includes imported external receipts with partial outcomes."
        : status === "failed"
          ? "Transport audit includes imported failure receipts."
          : status === "stale"
            ? "Transport audit includes stale receipt events that no longer match the active signatures."
            : status === "duplicate"
              ? "Transport audit includes duplicate receipt events."
              : status === "unmatched"
                ? "Transport audit includes unmatched external receipt payloads."
                : status === "invalid"
                  ? "Transport audit includes invalid receipt payloads."
                  : transportBundle.auditRecord.summary,
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
): WriterRunReceiptIngestionBundle {
  const sortedSources = sortReceiptSources(receiptSources);
  const normalizedReceipts: WriterRunReceiptEnvelope[] = [];
  const results: WriterRunReceiptIngestionResult[] = [];
  const historyMap = new Map(cloneHistory(transportBundle.history).map((item) => [item.correlationId, item]));
  const dispatchMap = new Map(adapterBundle.dispatchResults.map((item) => [item.correlationId, item]));
  const dispatchByArtifactId = new Map(adapterBundle.dispatchResults.map((item) => [item.artifactId, item]));
  const historyByArtifactId = new Map(cloneHistory(transportBundle.history).map((item) => [item.artifactId, item]));
  const seenCorrelations = new Set<string>();
  const auditEvents = [...transportBundle.auditRecord.events];
  let sequenceBase = auditEvents.reduce((highest, event) => Math.max(highest, event.sequence), 0) + 1;

  sortedSources.forEach((source) => {
    const parsed = parseReceiptSource(source);
    if (!parsed.envelope) {
      const result = createImportResult(
        source,
        "receipt-invalid",
        "invalid",
        "Receipt payload could not be parsed or validated.",
        parsed.errors,
      );
      results.push(result);
      auditEvents.push(baseAuditEvent(undefined, sequenceBase, "receipt-invalid", "invalid", `${source.fileName} is invalid.`));
      sequenceBase += 1;
      return;
    }

    const envelope = parsed.envelope;
    normalizedReceipts.push(envelope);

    const matchingDispatch = dispatchMap.get(envelope.correlationId) ?? dispatchByArtifactId.get(envelope.artifactId);
    const historyItem = historyMap.get(envelope.correlationId) ?? historyByArtifactId.get(envelope.artifactId);

    if (!matchingDispatch || !historyItem) {
      const note = `No dispatch record matched receipt ${source.fileName}.`;
      results.push(createImportResult(source, "receipt-unmatched", "unmatched", note, [], envelope));
      auditEvents.push(...createReceiptEvent(envelope, sequenceBase, "unmatched", note));
      sequenceBase += 1;
      return;
    }

    if (
      envelope.packageId !== packageBundle.id
      || envelope.sourceSignature !== packageBundle.sourceSignature
      || envelope.reviewSignature !== packageBundle.reviewSignature
      || envelope.deliveryPackageSignature !== packageBundle.deliveryPackageSignature
    ) {
      const note = `Receipt ${source.fileName} is stale for the active package or review signature.`;
      results.push(createImportResult(source, "receipt-stale", "stale", note, [], envelope));
      auditEvents.push(...createReceiptEvent(envelope, sequenceBase, "stale", note));
      sequenceBase += 1;
      return;
    }

    if (seenCorrelations.has(envelope.correlationId)) {
      const note = `Receipt ${source.fileName} duplicates an already imported correlation id.`;
      results.push(createImportResult(source, "receipt-duplicate", "duplicate", note, [], envelope));
      auditEvents.push(...createReceiptEvent(envelope, sequenceBase, "duplicate", note));
      sequenceBase += 1;
      return;
    }

    seenCorrelations.add(envelope.correlationId);

    const nextStatus = envelope.status === "completed"
      ? "completed"
      : envelope.status === "partial"
        ? "partial"
        : "failed";
    const note = envelope.note || `Imported ${envelope.status} receipt for ${envelope.fileName}.`;
    historyMap.set(envelope.correlationId, appendHistoryStatus(historyItem, nextStatus, note));
    results.push(createImportResult(source, "receipt-imported", nextStatus, note, [], envelope));
    auditEvents.push(...createReceiptEvent(envelope, sequenceBase, nextStatus, note));
    sequenceBase += 2;
  });

  const history = [...historyMap.values()].sort((left, right) => left.fileName.localeCompare(right.fileName));
  const status = aggregateReceiptStatus(results, history, transportBundle.status);
  const transportReceipt = createTransportReceipt(packageBundle, transportBundle, history, results, status);
  const auditRecord = createAuditRecord(packageBundle, transportBundle, auditEvents, status);
  const entries = [
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
      "Receipt ingestion results covering matched, duplicate, stale, unmatched, and invalid inbound receipts.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-receipt-audit-log.json"),
      "writer-run-receipt-audit-log.json",
      "writer_run_receipt_audit_log",
      JSON.stringify(auditRecord, null, 2),
      "Updated transport audit log after receipt ingestion.",
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
    receipts: normalizedReceipts,
    results,
    auditRecord,
    history,
    transportReceipt,
    status,
    entries,
    summary: status === "completed"
      ? `Inbound receipt ingestion completed for ${packageBundle.rootFolderName}.`
      : status === "partial"
        ? `Inbound receipt ingestion completed with partial outcomes for ${packageBundle.rootFolderName}.`
        : status === "failed"
          ? `Inbound receipt ingestion recorded failure outcomes for ${packageBundle.rootFolderName}.`
          : status === "stale"
            ? `Inbound receipt ingestion detected stale receipts for ${packageBundle.rootFolderName}.`
            : status === "duplicate"
              ? `Inbound receipt ingestion detected duplicate receipts for ${packageBundle.rootFolderName}.`
              : status === "unmatched"
                ? `Inbound receipt ingestion detected unmatched receipts for ${packageBundle.rootFolderName}.`
                : status === "invalid"
                  ? `Inbound receipt ingestion detected invalid receipt payloads for ${packageBundle.rootFolderName}.`
                  : `No inbound receipts were imported for ${packageBundle.rootFolderName}.`,
  };
}
