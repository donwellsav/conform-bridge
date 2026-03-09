import type { WriterRunDispatchStatus, WriterRunTransportBundle } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function statusVariant(status: WriterRunDispatchStatus) {
  switch (status) {
    case "ready-to-dispatch":
    case "dispatched":
    case "acknowledged":
    case "runner-complete":
    case "receipt-recorded":
    case "receipt-normalized":
    case "receipt-matched":
    case "receipt-imported":
    case "completed":
      return "accent" as const;
    case "receipt-migrated":
    case "partial":
    case "duplicate":
    case "stale":
    case "superseded":
      return "warning" as const;
    case "runner-blocked":
    case "failed":
    case "incompatible":
    case "invalid":
    case "unmatched":
      return "danger" as const;
    case "transport-failed":
      return "warning" as const;
    case "cancelled":
      return "neutral" as const;
  }
}

export function WriterRunTransportPreview({ bundle }: { bundle: WriterRunTransportBundle }) {
  const dispatchableCount = bundle.envelopes.filter((envelope) => envelope.dispatchable).length;
  const blockedCount = bundle.history.filter((item) => item.currentStatus === "runner-blocked").length;
  const receiptRecordedCount = bundle.history.filter((item) => item.currentStatus === "receipt-recorded").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Transport status</p>
          <div className="mt-2">
            <Badge variant={statusVariant(bundle.status)}>{bundle.status}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Dispatchable</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{dispatchableCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{blockedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Receipt recorded</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{receiptRecordedCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Writer-run transport summary</p>
          <Badge variant={statusVariant(bundle.transportReceipt.status)}>{bundle.transportReceipt.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{bundle.summary}</p>
        <p className="mt-2 text-xs text-muted">
          transport {bundle.transportId} / source signature {bundle.sourceSignature} / review signature {bundle.reviewSignature}
        </p>
      </div>

      <div className="space-y-3">
        {bundle.history.map((item) => (
          <div key={item.correlationId} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{item.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariant(item.currentStatus)}>{item.currentStatus}</Badge>
                <Badge variant={item.dispatchable ? "accent" : "neutral"}>{item.dispatchable ? "dispatchable" : "not dispatchable"}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{item.note}</p>
            <p className="mt-2 text-xs text-muted">
              correlation {item.correlationId} / adapter {item.adapterId ?? "none"} / runner {item.runnerId ?? "none"}
            </p>
            <p className="mt-2 text-xs text-muted">
              retry {item.retryState.mode} / cancel {item.cancellationState.mode}
            </p>
            {item.failure ? (
              <p className="mt-2 text-xs text-muted">
                failure {item.failure.code}: {item.failure.message}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">status trail {item.statusTrail.join(" -> ")}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {bundle.entries.map((entry) => (
          <div key={entry.relativePath} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{entry.relativePath}</p>
              <Badge variant="neutral">{entry.payloadKind.replaceAll("_", " ")}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{entry.summary}</p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-border/60 bg-surface px-3 py-3 text-xs leading-6 text-muted whitespace-pre-wrap">
              {entry.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
