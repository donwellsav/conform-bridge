import type { ExternalExecutionPackage, ExternalExecutionStatus } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function statusVariant(status: ExternalExecutionStatus) {
  switch (status) {
    case "ready":
      return "accent" as const;
    case "partial":
      return "warning" as const;
    case "blocked":
      return "danger" as const;
  }
}

function classificationVariant(classification: ExternalExecutionPackage["entries"][number]["classification"]) {
  switch (classification) {
    case "generated":
      return "accent" as const;
    case "deferred-contract":
      return "warning" as const;
    case "package-metadata":
      return "neutral" as const;
  }
}

export function ExternalExecutionPackagePreview({ packageBundle }: { packageBundle: ExternalExecutionPackage }) {
  const generatedCount = packageBundle.entries.filter((entry) => entry.classification === "generated").length;
  const deferredCount = packageBundle.entries.filter((entry) => entry.classification === "deferred-contract").length;
  const packageMetadataCount = packageBundle.entries.filter((entry) => entry.layer === "package").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Package status</p>
          <div className="mt-2">
            <Badge variant={statusVariant(packageBundle.status)}>{packageBundle.status}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Generated members</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{generatedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deferred contracts</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{deferredCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Package metadata</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{packageMetadataCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">External execution summary</p>
          <Badge variant="neutral">{packageBundle.rootRelativePath}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{packageBundle.summaryJson.note}</p>
        <p className="mt-2 text-xs text-muted">
          source signature {packageBundle.sourceSignature} / review signature {packageBundle.reviewSignature}
        </p>
        {packageBundle.summaryJson.reasons.length > 0 ? (
          <div className="mt-3 space-y-1 text-xs text-muted">
            {packageBundle.summaryJson.reasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {packageBundle.entries.map((entry) => (
          <div key={entry.relativePath} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{entry.relativePath}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{entry.layer}</Badge>
                <Badge variant={classificationVariant(entry.classification)}>{entry.classification}</Badge>
                {entry.writerReadinessStatus ? <Badge variant={entry.writerReadinessStatus === "blocked" ? "danger" : entry.writerReadinessStatus === "ready-for-writer" ? "accent" : "warning"}>{entry.writerReadinessStatus}</Badge> : null}
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{entry.summary}</p>
            <p className="mt-2 text-xs text-muted">checksum {entry.checksum.value} / {entry.byteSize} bytes / {entry.payloadKind}</p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-border/60 bg-surface px-3 py-3 text-xs leading-6 text-muted whitespace-pre-wrap">
              {entry.content}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
