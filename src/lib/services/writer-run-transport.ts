import {
  aggregateDispatchStatus,
  createCancellationState,
  createRetryState,
  joinPath,
  sortAuditEvents,
  sortBlockedReasons,
  stableToken,
} from "./writer-run-audit";
import type {
  DeliveryHandoffBundle,
  ExternalExecutionPackage,
  WriterAdapterBundle,
  WriterRunAuditEvent,
  WriterRunAuditRecord,
  WriterRunAttemptHistory,
  WriterRunBlockedReason,
  WriterRunBundle,
  WriterRunDispatchRecord,
  WriterRunDispatchStatus,
  WriterRunTransportBundle,
  WriterRunTransportEntry,
  WriterRunTransportEnvelope,
  WriterRunTransportFailure,
  WriterRunTransportId,
  WriterRunTransportReceipt,
  WriterRunTransportResponse,
} from "../types";

const REFERENCE_TRANSPORT_ID: WriterRunTransportId = "reference-noop-transport";

export interface WriterRunTransportService {
  prepareBundle(
    packageBundle: ExternalExecutionPackage,
    handoffBundle: DeliveryHandoffBundle,
    adapterBundle: WriterAdapterBundle,
    runBundle: WriterRunBundle,
  ): Promise<WriterRunTransportBundle>;
}

export interface WriterRunTransportScenario {
  transportFailedArtifactIds?: string[];
  retryableFailureArtifactIds?: string[];
  timedOutArtifactIds?: string[];
  cancelledArtifactIds?: string[];
  expiredArtifactIds?: string[];
  supersededBy?: {
    sourceSignature: ExternalExecutionPackage["sourceSignature"];
    reviewSignature: ExternalExecutionPackage["reviewSignature"];
  };
}

function makeFailure(
  code: WriterRunTransportFailure["code"],
  artifactId: string,
  message: string,
  retryable: boolean,
): WriterRunTransportFailure {
  return {
    code,
    artifactId,
    message,
    retryable,
  };
}

function isReadyRequest(status: WriterRunBundle["request"]["requests"][number]["requestReadiness"]) {
  return status === "ready";
}

function createCorrelationId(
  requestId: string,
  artifactId: string,
  sourceSignature: string,
  reviewSignature: string,
) {
  return `writer-run-correlation-${artifactId}-${stableToken(requestId, sourceSignature, reviewSignature)}`;
}

function createEnvelopeStatus(
  artifactId: string,
  requestReadiness: WriterRunBundle["request"]["requests"][number]["requestReadiness"],
  scenario: WriterRunTransportScenario,
): WriterRunDispatchStatus {
  if (scenario.supersededBy || scenario.cancelledArtifactIds?.includes(artifactId) || scenario.expiredArtifactIds?.includes(artifactId)) {
    return "cancelled";
  }

  if (scenario.transportFailedArtifactIds?.includes(artifactId) || scenario.timedOutArtifactIds?.includes(artifactId)) {
    return "transport-failed";
  }

  if (!isReadyRequest(requestReadiness)) {
    return requestReadiness === "unsupported" ? "transport-failed" : "runner-blocked";
  }

  return "ready-to-dispatch";
}

function createDispatchReason(status: WriterRunDispatchStatus, fileName: string) {
  switch (status) {
    case "ready-to-dispatch":
      return `${fileName} is fully runnable through the current writer-runner and can be packaged for external dispatch.`;
    case "runner-blocked":
      return `${fileName} is not dispatchable because the runner contract is still blocked or partial.`;
    case "transport-failed":
      return `${fileName} cannot be dispatched through the current transport path in this phase.`;
    case "cancelled":
      return `${fileName} is not dispatchable because the request is cancelled, expired, or superseded.`;
    default:
      return `${fileName} is tracked by the writer-run transport layer.`;
  }
}

function createBlockedReasons(
  request: WriterRunBundle["request"]["requests"][number],
  envelopeStatus: WriterRunDispatchStatus,
): WriterRunBlockedReason[] {
  if (envelopeStatus === "ready-to-dispatch") {
    return [];
  }

  if (request.blockedReasons.length > 0) {
    return sortBlockedReasons(request.blockedReasons);
  }

  return sortBlockedReasons([
    {
      code: envelopeStatus === "transport-failed" ? "runner_not_available" : "artifact_blocked",
      artifactId: request.artifactId,
      message: createDispatchReason(envelopeStatus, request.fileName),
    },
  ]);
}

function createTransportFailure(
  request: WriterRunBundle["request"]["requests"][number],
  envelopeStatus: WriterRunDispatchStatus,
  scenario: WriterRunTransportScenario,
): WriterRunTransportFailure | undefined {
  if (scenario.supersededBy) {
    return makeFailure(
      "superseded",
      request.artifactId,
      `${request.fileName} is superseded by a newer source/review signature.`,
      false,
    );
  }

  if (scenario.cancelledArtifactIds?.includes(request.artifactId)) {
    return makeFailure("cancelled", request.artifactId, `${request.fileName} was cancelled before dispatch.`, false);
  }

  if (scenario.expiredArtifactIds?.includes(request.artifactId)) {
    return makeFailure("expired", request.artifactId, `${request.fileName} expired before dispatch.`, false);
  }

  if (scenario.timedOutArtifactIds?.includes(request.artifactId)) {
    return makeFailure("timeout", request.artifactId, `${request.fileName} timed out in the reference transport flow.`, true);
  }

  if (scenario.transportFailedArtifactIds?.includes(request.artifactId)) {
    return makeFailure(
      "transport_unavailable",
      request.artifactId,
      `${request.fileName} hit a simulated transport-path failure.`,
      Boolean(scenario.retryableFailureArtifactIds?.includes(request.artifactId)),
    );
  }

  if (envelopeStatus === "runner-blocked") {
    return makeFailure(
      "runner_blocked",
      request.artifactId,
      request.blockedReasons[0]?.message ?? `${request.fileName} is blocked before dispatch.`,
      false,
    );
  }

  if (envelopeStatus === "transport-failed") {
    return makeFailure(
      "unsupported_request",
      request.artifactId,
      request.blockedReasons[0]?.message ?? `${request.fileName} has no supported dispatch path in this phase.`,
      false,
    );
  }

  return undefined;
}

function createRetryAndCancellationState(
  request: WriterRunBundle["request"]["requests"][number],
  envelopeStatus: WriterRunDispatchStatus,
  failure: WriterRunTransportFailure | undefined,
  scenario: WriterRunTransportScenario,
) {
  if (scenario.supersededBy) {
    return {
      retryState: createRetryState("non-retryable", "This request has been superseded by a newer source/review signature."),
      cancellationState: createCancellationState(
        "superseded",
        "This request is stale because a newer source/review signature exists.",
        scenario.supersededBy,
      ),
    };
  }

  if (scenario.cancelledArtifactIds?.includes(request.artifactId)) {
    return {
      retryState: createRetryState("non-retryable", "This request was cancelled before dispatch."),
      cancellationState: createCancellationState("cancelled", "Operator or system cancellation was recorded before dispatch."),
    };
  }

  if (scenario.expiredArtifactIds?.includes(request.artifactId)) {
    return {
      retryState: createRetryState("non-retryable", "This request expired before it could be dispatched."),
      cancellationState: createCancellationState("expired", "The request is stale and should not be retried."),
    };
  }

  if (scenario.timedOutArtifactIds?.includes(request.artifactId)) {
    return {
      retryState: createRetryState("retryable", "This request timed out and can be retried deterministically.", 1, 3),
      cancellationState: createCancellationState("timed-out", "The request timed out before a receipt could be finalized."),
    };
  }

  if (failure?.retryable) {
    return {
      retryState: createRetryState("retryable", failure.message, 1, 3),
      cancellationState: createCancellationState("active", "The request remains eligible for retry."),
    };
  }

  if (envelopeStatus === "ready-to-dispatch") {
    return {
      retryState: createRetryState("not-needed", "The request is fully dispatchable in the reference transport flow."),
      cancellationState: createCancellationState("active", "The request is active."),
    };
  }

  return {
    retryState: createRetryState("non-retryable", failure?.message ?? "The request is not dispatchable in the current state."),
    cancellationState: createCancellationState("active", "The request remains tracked but is not cancelled."),
  };
}

function createTransportEnvelope(
  packageBundle: ExternalExecutionPackage,
  handoffBundle: DeliveryHandoffBundle,
  adapterBundle: WriterAdapterBundle,
  runBundle: WriterRunBundle,
  request: WriterRunBundle["request"]["requests"][number],
  scenario: WriterRunTransportScenario,
): WriterRunTransportEnvelope {
  const correlationId = createCorrelationId(
    request.id,
    request.artifactId,
    runBundle.input.sourceSignature,
    runBundle.input.reviewSignature,
  );
  const envelopeStatus = createEnvelopeStatus(request.artifactId, request.requestReadiness, scenario);
  const blockedReasons = createBlockedReasons(request, envelopeStatus);
  const failure = createTransportFailure(request, envelopeStatus, scenario);
  const states = createRetryAndCancellationState(request, envelopeStatus, failure, scenario);
  const transportToken = stableToken(
    packageBundle.id,
    request.id,
    correlationId,
    runBundle.input.sourceSignature,
    runBundle.input.reviewSignature,
  );

  return {
    version: 1,
    id: `writer-run-transport-envelope-${request.artifactId}-${transportToken}`,
    transportId: REFERENCE_TRANSPORT_ID,
    correlationId,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    externalExecutionPackageId: packageBundle.id,
    handoffBundleId: handoffBundle.id,
    writerRunBundleId: runBundle.id,
    requestId: runBundle.request.id,
    requestArtifactId: request.id,
    responseId: runBundle.response.id,
    receiptId: runBundle.receipt.id,
    artifactId: request.artifactId,
    fileName: request.fileName,
    artifactKind: request.artifactKind,
    requiredCapability: request.requiredCapability,
    packageStatus: packageBundle.status,
    requestReadiness: request.requestReadiness,
    sourceSignature: runBundle.input.sourceSignature,
    reviewSignature: runBundle.input.reviewSignature,
    deliveryPackageSignature: runBundle.input.deliveryPackageSignature,
    adapterId: request.adapterId,
    runnerId: request.runnerId,
    plannedOutputPath: request.plannedOutputPath,
    relativePath: request.relativePath,
    envelopeStatus,
    dispatchable: envelopeStatus === "ready-to-dispatch",
    dispatchReason: createDispatchReason(envelopeStatus, request.fileName),
    dependencyIds: [...request.dependencyIds].sort((left, right) => left.localeCompare(right)),
    blockedReasons,
    retryState: states.retryState,
    cancellationState: states.cancellationState,
    payload: {
      ...request.payload,
      handoffArtifactId: handoffBundle.deferredWriterInput.artifacts.find((artifact) => artifact.artifactId === request.artifactId)?.artifactId,
      matchedAdapterIds: adapterBundle.artifactMatches.find((artifact) => artifact.artifactId === request.artifactId)?.matchedAdapterIds ?? [],
      transportId: REFERENCE_TRANSPORT_ID,
      correlationId,
    },
  };
}

function createAuditEvents(
  envelope: WriterRunTransportEnvelope,
  responseStatus: WriterRunBundle["response"]["status"],
  failure: WriterRunTransportFailure | undefined,
  baseSequence: number,
): WriterRunAuditEvent[] {
  const events: WriterRunAuditEvent[] = [
    {
      id: `writer-run-audit-${envelope.artifactId}-envelope`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence,
      eventType: "envelope-generated",
      status: envelope.envelopeStatus,
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: envelope.dispatchReason,
    },
  ];

  if (envelope.cancellationState.mode === "superseded") {
    events.push({
      id: `writer-run-audit-${envelope.artifactId}-superseded`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 1,
      eventType: "superseded",
      status: "cancelled",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: envelope.cancellationState.reason,
      failure,
    });
    return sortAuditEvents(events);
  }

  if (envelope.cancellationState.mode === "cancelled" || envelope.cancellationState.mode === "expired") {
    events.push({
      id: `writer-run-audit-${envelope.artifactId}-cancelled`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 1,
      eventType: envelope.cancellationState.mode === "expired" ? "expired" : "cancelled",
      status: "cancelled",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: envelope.cancellationState.reason,
      failure,
    });
    return sortAuditEvents(events);
  }

  if (failure?.code === "timeout") {
    events.push(
      {
        id: `writer-run-audit-${envelope.artifactId}-dispatch`,
        correlationId: envelope.correlationId,
        artifactId: envelope.artifactId,
        sequence: baseSequence + 1,
        eventType: "dispatch-created",
        status: "dispatched",
        requestId: envelope.requestId,
        responseId: envelope.responseId,
        receiptId: envelope.receiptId,
        sourceSignature: envelope.sourceSignature,
        reviewSignature: envelope.reviewSignature,
        note: `Reference transport submitted ${envelope.fileName}.`,
      },
      {
        id: `writer-run-audit-${envelope.artifactId}-timeout`,
        correlationId: envelope.correlationId,
        artifactId: envelope.artifactId,
        sequence: baseSequence + 2,
        eventType: "timed-out",
        status: "transport-failed",
        requestId: envelope.requestId,
        responseId: envelope.responseId,
        receiptId: envelope.receiptId,
        sourceSignature: envelope.sourceSignature,
        reviewSignature: envelope.reviewSignature,
        note: failure.message,
        failure,
      },
      {
        id: `writer-run-audit-${envelope.artifactId}-retry`,
        correlationId: envelope.correlationId,
        artifactId: envelope.artifactId,
        sequence: baseSequence + 3,
        eventType: "retry-marked",
        status: "transport-failed",
        requestId: envelope.requestId,
        responseId: envelope.responseId,
        receiptId: envelope.receiptId,
        sourceSignature: envelope.sourceSignature,
        reviewSignature: envelope.reviewSignature,
        note: envelope.retryState.note,
        failure,
      },
    );
    return sortAuditEvents(events);
  }

  if (envelope.envelopeStatus === "transport-failed") {
    events.push({
      id: `writer-run-audit-${envelope.artifactId}-failed`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 1,
      eventType: "transport-failed",
      status: "transport-failed",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: failure?.message ?? `Reference transport cannot dispatch ${envelope.fileName}.`,
      failure,
    });
    return sortAuditEvents(events);
  }

  if (envelope.envelopeStatus === "runner-blocked") {
    events.push({
      id: `writer-run-audit-${envelope.artifactId}-blocked`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 1,
      eventType: "dispatch-blocked",
      status: "runner-blocked",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: envelope.blockedReasons[0]?.message ?? `Reference transport blocked ${envelope.fileName} before dispatch.`,
      failure,
    });
    return sortAuditEvents(events);
  }

  events.push(
    {
      id: `writer-run-audit-${envelope.artifactId}-dispatch`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 1,
      eventType: "dispatch-created",
      status: "dispatched",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: `Reference transport submitted ${envelope.fileName}.`,
    },
    {
      id: `writer-run-audit-${envelope.artifactId}-ack`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 2,
      eventType: "dispatch-acknowledged",
      status: "acknowledged",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: `Reference transport acknowledged ${envelope.fileName} for the ${responseStatus} runner path.`,
    },
    {
      id: `writer-run-audit-${envelope.artifactId}-runner-complete`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 3,
      eventType: "runner-complete",
      status: "runner-complete",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: `Runner receipt data for ${envelope.fileName} is attached to the transport flow.`,
    },
    {
      id: `writer-run-audit-${envelope.artifactId}-receipt`,
      correlationId: envelope.correlationId,
      artifactId: envelope.artifactId,
      sequence: baseSequence + 4,
      eventType: "receipt-recorded",
      status: "receipt-recorded",
      requestId: envelope.requestId,
      responseId: envelope.responseId,
      receiptId: envelope.receiptId,
      sourceSignature: envelope.sourceSignature,
      reviewSignature: envelope.reviewSignature,
      note: `Reference transport recorded the runner receipt for ${envelope.fileName}.`,
    },
  );

  return sortAuditEvents(events);
}

function createDispatchRecord(
  envelope: WriterRunTransportEnvelope,
  responseStatus: WriterRunBundle["response"]["status"],
  failure: WriterRunTransportFailure | undefined,
  sequence: number,
): WriterRunDispatchRecord {
  let status: WriterRunDispatchStatus;
  let note: string;

  switch (envelope.envelopeStatus) {
    case "ready-to-dispatch":
      status = failure ? "transport-failed" : "acknowledged";
      note = failure
        ? failure.message
        : `Reference transport acknowledged ${envelope.fileName} without material binary output.`;
      break;
    case "runner-blocked":
      status = "runner-blocked";
      note = envelope.blockedReasons[0]?.message ?? `Reference transport blocked ${envelope.fileName} before dispatch.`;
      break;
    case "transport-failed":
      status = "transport-failed";
      note = failure?.message ?? `Reference transport could not dispatch ${envelope.fileName}.`;
      break;
    case "cancelled":
      status = "cancelled";
      note = envelope.cancellationState.reason;
      break;
    default:
      status = envelope.envelopeStatus;
      note = createDispatchReason(envelope.envelopeStatus, envelope.fileName);
      break;
  }

  return {
    id: `writer-run-dispatch-${envelope.artifactId}-${stableToken(envelope.id, String(sequence), status)}`,
    transportId: envelope.transportId,
    correlationId: envelope.correlationId,
    requestId: envelope.requestId,
    requestArtifactId: envelope.requestArtifactId,
    responseId: envelope.responseId,
    receiptId: envelope.receiptId,
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    adapterId: envelope.adapterId,
    runnerId: envelope.runnerId,
    status,
    transportSequence: sequence,
    requestReadiness: envelope.requestReadiness,
    responseStatus,
    note,
    failure,
  };
}

function createHistory(
  envelope: WriterRunTransportEnvelope,
  dispatchRecord: WriterRunDispatchRecord,
  auditEvents: WriterRunAuditEvent[],
): WriterRunAttemptHistory {
  const statusTrail = auditEvents.map((event) => event.status);
  const currentStatus = statusTrail[statusTrail.length - 1] ?? dispatchRecord.status;

  return {
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    correlationId: envelope.correlationId,
    transportId: envelope.transportId,
    adapterId: envelope.adapterId,
    runnerId: envelope.runnerId,
    requestReadiness: envelope.requestReadiness,
    responseStatus: dispatchRecord.responseStatus,
    dispatchable: envelope.dispatchable,
    currentStatus,
    statusTrail,
    retryState: envelope.retryState,
    cancellationState: envelope.cancellationState,
    failure: dispatchRecord.failure,
    note: dispatchRecord.note,
  };
}

function createTransportResponse(
  packageBundle: ExternalExecutionPackage,
  runBundle: WriterRunBundle,
  dispatchRecords: WriterRunDispatchRecord[],
): WriterRunTransportResponse {
  const statuses = dispatchRecords.map((record) => record.status);
  const status = aggregateDispatchStatus(statuses);

  return {
    version: 1,
    id: `writer-run-transport-response-${packageBundle.jobId}-${stableToken(runBundle.request.id, packageBundle.id)}`,
    transportId: REFERENCE_TRANSPORT_ID,
    packageId: packageBundle.id,
    requestId: runBundle.request.id,
    runnerResponseId: runBundle.response.id,
    runnerReceiptId: runBundle.receipt.id,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    sourceSignature: runBundle.input.sourceSignature,
    reviewSignature: runBundle.input.reviewSignature,
    deliveryPackageSignature: runBundle.input.deliveryPackageSignature,
    status,
    dispatchedCount: dispatchRecords.filter((record) => record.status === "acknowledged").length,
    acknowledgedCount: dispatchRecords.filter((record) => record.status === "acknowledged").length,
    blockedCount: dispatchRecords.filter((record) => record.status === "runner-blocked").length,
    failedCount: dispatchRecords.filter((record) => record.status === "transport-failed").length,
    cancelledCount: dispatchRecords.filter((record) => record.status === "cancelled").length,
    note: status === "acknowledged"
      ? "Reference transport acknowledged every dispatchable writer-run request."
      : status === "runner-blocked"
        ? "Reference transport found blocked writer-run requests before dispatch."
        : status === "transport-failed"
          ? "Reference transport recorded at least one transport-path failure."
          : status === "cancelled"
            ? "Reference transport recorded cancelled or superseded requests."
            : "Reference transport produced deterministic transport status output.",
  };
}

function createTransportReceipt(
  packageBundle: ExternalExecutionPackage,
  runBundle: WriterRunBundle,
  history: WriterRunAttemptHistory[],
): WriterRunTransportReceipt {
  const statuses = history.map((item) => item.currentStatus);
  const status = aggregateDispatchStatus(statuses);

  return {
    version: 1,
    id: `writer-run-transport-receipt-${packageBundle.jobId}-${stableToken(runBundle.receipt.id, packageBundle.id)}`,
    transportId: REFERENCE_TRANSPORT_ID,
    packageId: packageBundle.id,
    requestId: runBundle.request.id,
    runnerResponseId: runBundle.response.id,
    runnerReceiptId: runBundle.receipt.id,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    sourceSignature: runBundle.input.sourceSignature,
    reviewSignature: runBundle.input.reviewSignature,
    deliveryPackageSignature: runBundle.input.deliveryPackageSignature,
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
    failedCount: history.filter((item) => item.currentStatus === "transport-failed").length,
    cancelledCount: history.filter((item) => item.currentStatus === "cancelled").length,
    receiptRecordedCount: history.filter((item) => item.currentStatus === "receipt-recorded").length,
    receiptImportedCount: 0,
    completedCount: 0,
    partialCount: 0,
    staleCount: 0,
    duplicateCount: 0,
    unmatchedCount: 0,
    invalidCount: 0,
    note: status === "receipt-recorded"
      ? "Reference transport completed deterministic no-op dispatch plus receipt recording for every dispatchable artifact."
      : status === "runner-blocked"
        ? "Reference transport receipt output is blocked by unresolved writer-run prerequisites."
        : status === "transport-failed"
          ? "Reference transport receipt output includes transport-path failures."
          : status === "cancelled"
            ? "Reference transport receipt output includes cancelled, expired, or superseded requests."
            : "Reference transport produced deterministic receipt output.",
  };
}

function createAuditRecord(
  packageBundle: ExternalExecutionPackage,
  runBundle: WriterRunBundle,
  transportResponse: WriterRunTransportResponse,
  events: WriterRunAuditEvent[],
): WriterRunAuditRecord {
  return {
    id: `writer-run-audit-${packageBundle.jobId}-${stableToken(runBundle.request.id, transportResponse.id)}`,
    transportId: REFERENCE_TRANSPORT_ID,
    packageId: packageBundle.id,
    requestId: runBundle.request.id,
    runnerResponseId: runBundle.response.id,
    runnerReceiptId: runBundle.receipt.id,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    sourceSignature: runBundle.input.sourceSignature,
    reviewSignature: runBundle.input.reviewSignature,
    deliveryPackageSignature: runBundle.input.deliveryPackageSignature,
    events: sortAuditEvents(events),
    summary: transportResponse.status === "acknowledged"
      ? "Reference transport audit shows deterministic dispatch, acknowledgement, runner-complete, and receipt-recorded events."
      : transportResponse.status === "runner-blocked"
        ? "Reference transport audit shows blocked requests before dispatch."
        : transportResponse.status === "transport-failed"
          ? "Reference transport audit shows deterministic failure events."
          : transportResponse.status === "cancelled"
            ? "Reference transport audit shows cancelled, expired, or superseded request state."
            : "Reference transport audit captured deterministic transport events.",
  };
}

function createEntry(
  rootRelativePath: string,
  fileName: WriterRunTransportEntry["fileName"],
  payloadKind: WriterRunTransportEntry["payloadKind"],
  content: string,
  summary: string,
): WriterRunTransportEntry {
  return {
    kind: "writer_run_transport_entry",
    relativePath: joinPath(rootRelativePath, "handoff", fileName),
    fileName,
    payloadKind,
    mimeType: "application/json",
    content,
    summary,
  };
}

export function prepareWriterRunTransportBundleSync(
  packageBundle: ExternalExecutionPackage,
  handoffBundle: DeliveryHandoffBundle,
  adapterBundle: WriterAdapterBundle,
  runBundle: WriterRunBundle,
  scenario: WriterRunTransportScenario = {},
): WriterRunTransportBundle {
  const requestMap = new Map(runBundle.request.requests.map((request) => [request.artifactId, request]));
  const envelopes = runBundle.request.requests
    .map((request) => createTransportEnvelope(packageBundle, handoffBundle, adapterBundle, runBundle, request, scenario))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
  const dispatchRecords = envelopes.map((envelope, index) => {
    const request = requestMap.get(envelope.artifactId);
    if (!request) {
      throw new Error(`Missing writer-run request for transport envelope ${envelope.artifactId}.`);
    }

    const failure = createTransportFailure(request, envelope.envelopeStatus, scenario);
    return createDispatchRecord(envelope, runBundle.response.status, failure, index + 1);
  });
  const auditEvents = envelopes.flatMap((envelope, index) => {
    const dispatchRecord = dispatchRecords.find((record) => record.artifactId === envelope.artifactId);
    return createAuditEvents(envelope, dispatchRecord?.responseStatus ?? runBundle.response.status, dispatchRecord?.failure, index * 10 + 1);
  });
  const history = envelopes.map((envelope) => {
    const dispatchRecord = dispatchRecords.find((record) => record.artifactId === envelope.artifactId);
    const artifactEvents = auditEvents.filter((event) => event.artifactId === envelope.artifactId);
    if (!dispatchRecord) {
      throw new Error(`Missing transport dispatch record for ${envelope.artifactId}.`);
    }

    return createHistory(envelope, dispatchRecord, artifactEvents);
  }).sort((left, right) => left.fileName.localeCompare(right.fileName));
  const transportResponse = createTransportResponse(packageBundle, runBundle, dispatchRecords);
  const transportReceipt = createTransportReceipt(packageBundle, runBundle, history);
  const auditRecord = createAuditRecord(packageBundle, runBundle, transportResponse, auditEvents);
  const entries = [
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-transport-envelopes.json",
      "writer_run_transport_envelopes",
      JSON.stringify({
        version: 1,
        transportId: REFERENCE_TRANSPORT_ID,
        packageId: packageBundle.id,
        requestId: runBundle.request.id,
        sourceSignature: runBundle.input.sourceSignature,
        reviewSignature: runBundle.input.reviewSignature,
        envelopes,
      }, null, 2),
      "Generated deterministic external transport envelopes for writer-run requests.",
    ),
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-dispatch-records.json",
      "writer_run_dispatch_records",
      JSON.stringify({
        version: 1,
        transportId: REFERENCE_TRANSPORT_ID,
        response: transportResponse,
        dispatchRecords,
      }, null, 2),
      "Generated deterministic dispatch records and transport acknowledgement summary.",
    ),
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-audit-log.json",
      "writer_run_audit_log",
      JSON.stringify(auditRecord, null, 2),
      "Generated deterministic audit events for transport, acknowledgement, and receipt state.",
    ),
    createEntry(
      packageBundle.rootRelativePath,
      "writer-run-history.json",
      "writer_run_history",
      JSON.stringify({
        version: 1,
        transportReceipt,
        history,
      }, null, 2),
      "Generated deterministic writer-run transport history with retry and cancellation state.",
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `writer-run-transport-bundle-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    rootRelativePath: joinPath(packageBundle.rootRelativePath, "handoff"),
    transportId: REFERENCE_TRANSPORT_ID,
    sourceSignature: runBundle.input.sourceSignature,
    reviewSignature: runBundle.input.reviewSignature,
    deliveryPackageSignature: runBundle.input.deliveryPackageSignature,
    envelopes,
    dispatchRecords,
    transportResponse,
    transportReceipt,
    auditRecord,
    history,
    entries,
    status: transportReceipt.status,
    summary: transportReceipt.status === "receipt-recorded"
      ? `Reference transport completed deterministic no-op dispatch and receipt recording for ${packageBundle.rootFolderName}.`
      : transportReceipt.status === "runner-blocked"
        ? `Reference transport could not dispatch every deferred artifact for ${packageBundle.rootFolderName}.`
        : transportReceipt.status === "transport-failed"
          ? `Reference transport recorded deterministic failure state for ${packageBundle.rootFolderName}.`
          : transportReceipt.status === "cancelled"
            ? `Reference transport recorded cancelled, expired, or superseded requests for ${packageBundle.rootFolderName}.`
            : `Reference transport recorded deterministic external execution state for ${packageBundle.rootFolderName}.`,
  };
}

export async function prepareWriterRunTransportBundle(
  packageBundle: ExternalExecutionPackage,
  handoffBundle: DeliveryHandoffBundle,
  adapterBundle: WriterAdapterBundle,
  runBundle: WriterRunBundle,
): Promise<WriterRunTransportBundle> {
  return prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle);
}
