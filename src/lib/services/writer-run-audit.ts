import type {
  DeliveryReviewSignature,
  DeliverySourceSignature,
  WriterRunAuditEvent,
  WriterRunBlockedReason,
  WriterRunCancellationMode,
  WriterRunCancellationState,
  WriterRunDispatchStatus,
  WriterRunRetryMode,
  WriterRunRetryState,
  WriterRunTransportFailure,
} from "../types";

export function joinPath(...parts: string[]) {
  return parts.filter((part) => part.length > 0).join("/");
}

export function stableToken(...parts: string[]) {
  const input = parts.join("::");
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function sortBlockedReasons(reasons: WriterRunBlockedReason[]) {
  return [...reasons].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.message}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}

export function sortTransportFailures(failures: WriterRunTransportFailure[]) {
  return [...failures].sort((left, right) => {
    const leftKey = `${left.code}:${left.artifactId ?? ""}:${left.message}:${left.retryable}`;
    const rightKey = `${right.code}:${right.artifactId ?? ""}:${right.message}:${right.retryable}`;
    return leftKey.localeCompare(rightKey);
  });
}

export function sortAuditEvents(events: WriterRunAuditEvent[]) {
  return [...events].sort((left, right) =>
    left.sequence - right.sequence
    || left.correlationId.localeCompare(right.correlationId)
    || left.id.localeCompare(right.id),
  );
}

export function aggregateDispatchStatus(statuses: WriterRunDispatchStatus[]): WriterRunDispatchStatus {
  if (statuses.length === 0) {
    return "runner-blocked";
  }

  if (statuses.some((status) => status === "transport-failed")) {
    return "transport-failed";
  }

  if (statuses.some((status) => status === "cancelled")) {
    return "cancelled";
  }

  if (statuses.some((status) => status === "runner-blocked")) {
    return "runner-blocked";
  }

  if (statuses.every((status) => status === "receipt-recorded")) {
    return "receipt-recorded";
  }

  if (statuses.every((status) => status === "runner-complete" || status === "receipt-recorded")) {
    return "runner-complete";
  }

  if (statuses.every((status) => status === "acknowledged" || status === "runner-complete" || status === "receipt-recorded")) {
    return "acknowledged";
  }

  if (statuses.some((status) => status === "dispatched")) {
    return "dispatched";
  }

  if (statuses.some((status) => status === "ready-to-dispatch")) {
    return "ready-to-dispatch";
  }

  return "runner-blocked";
}

export function createRetryState(
  mode: WriterRunRetryMode,
  note: string,
  attemptCount = 0,
  maxAttempts = 3,
): WriterRunRetryState {
  return {
    mode,
    attemptCount,
    maxAttempts,
    note,
  };
}

export function createCancellationState(
  mode: WriterRunCancellationMode,
  reason: string,
  supersededBy?: {
    sourceSignature: DeliverySourceSignature;
    reviewSignature: DeliveryReviewSignature;
  },
): WriterRunCancellationState {
  return {
    mode,
    reason,
    supersededBySourceSignature: supersededBy?.sourceSignature,
    supersededByReviewSignature: supersededBy?.reviewSignature,
  };
}
