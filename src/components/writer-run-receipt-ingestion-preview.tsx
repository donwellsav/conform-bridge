import type { WriterRunDispatchStatus, WriterRunReceiptImportStatus, WriterRunReceiptIngestionBundle } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function statusVariant(status: WriterRunDispatchStatus) {
  switch (status) {
    case "completed":
    case "receipt-imported":
    case "receipt-normalized":
    case "receipt-matched":
    case "acknowledged":
    case "runner-complete":
    case "receipt-recorded":
      return "accent" as const;
    case "receipt-migrated":
    case "partial":
    case "duplicate":
    case "stale":
    case "superseded":
      return "warning" as const;
    case "failed":
    case "incompatible":
    case "invalid":
    case "unmatched":
    case "transport-failed":
    case "runner-blocked":
      return "danger" as const;
    case "ready-to-dispatch":
    case "dispatched":
    case "cancelled":
      return "neutral" as const;
  }
}

function importVariant(status: WriterRunReceiptImportStatus) {
  switch (status) {
    case "receipt-imported":
    case "receipt-migrated":
      return "accent" as const;
    case "receipt-duplicate":
    case "receipt-stale":
    case "receipt-superseded":
    case "receipt-partial":
      return "warning" as const;
    case "receipt-unmatched":
    case "receipt-invalid":
    case "receipt-incompatible":
      return "danger" as const;
  }
}

export function WriterRunReceiptIngestionPreview({ bundle }: { bundle: WriterRunReceiptIngestionBundle }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Receipt state</p>
          <div className="mt-2">
            <Badge variant={statusVariant(bundle.status)}>{bundle.status}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Normalized</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{bundle.transportReceipt.receiptNormalizedCount + bundle.transportReceipt.receiptMigratedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Imported</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{bundle.transportReceipt.receiptImportedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Compatibility gaps</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{bundle.transportReceipt.staleCount + bundle.transportReceipt.supersededCount + bundle.transportReceipt.incompatibleCount + bundle.transportReceipt.invalidCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Receipt ingestion summary</p>
          <Badge variant={statusVariant(bundle.transportReceipt.status)}>{bundle.transportReceipt.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{bundle.summary}</p>
        <p className="mt-2 text-xs text-muted">
          source signature {bundle.sourceSignature} / review signature {bundle.reviewSignature}
        </p>
        <p className="mt-2 text-xs text-muted">
          executor {bundle.executorProfileId} / expected {bundle.expectedReceiptProfile} / accepted {bundle.acceptedReceiptProfiles.join(" / ")}
        </p>
      </div>

      <div className="space-y-3">
        {bundle.results.map((result) => (
          <div key={result.id} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{result.sourceFileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={importVariant(result.importStatus)}>{result.importStatus}</Badge>
                <Badge variant={statusVariant(result.dispatchStatus)}>{result.dispatchStatus}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{result.note}</p>
            <p className="mt-2 text-xs text-muted">
              executor {result.executorProfileId} / expected {result.expectedReceiptProfile}
            </p>
            <p className="mt-2 text-xs text-muted">
              profile {result.compatibilityProfile} / normalization {result.normalizationStatus} / validation {result.validationStatus}
            </p>
            <p className="mt-2 text-xs text-muted">
              correlation {result.correlationId ?? "none"} / artifact {result.artifactId ?? "none"} / fingerprint {result.payloadFingerprint}
            </p>
            <p className="mt-2 text-xs text-muted">
              match {result.matchStatus} / signatures {result.signatureMatch} / correlation path {result.correlationMatch}
            </p>
            {result.warnings.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {result.warnings.map((warning) => (
                  <p key={`${result.id}-warning-${warning}`}>{warning}</p>
                ))}
              </div>
            ) : null}
            {result.errors.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {result.errors.map((error) => (
                  <p key={`${result.id}-${error}`}>{error}</p>
                ))}
              </div>
            ) : null}
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
