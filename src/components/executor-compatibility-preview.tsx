import type { ExecutorCompatibilityBundle, ExecutorPackageReadiness } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function readinessVariant(status: ExecutorPackageReadiness) {
  switch (status) {
    case "compatible":
      return "accent" as const;
    case "compatible-with-warnings":
    case "partial":
      return "warning" as const;
    case "incompatible":
    case "blocked":
      return "danger" as const;
    case "unsupported":
      return "neutral" as const;
  }
}

export function ExecutorCompatibilityPreview({ bundle }: { bundle: ExecutorCompatibilityBundle }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Executor profile</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{bundle.profile.label}</p>
            <Badge variant={readinessVariant(bundle.status)}>{bundle.status}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Transport profile</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{bundle.profileResolution.selectedTransportProfile}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Expected receipt</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{bundle.profileResolution.expectedReceiptProfile}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Issues</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{bundle.result.issues.length}</p>
          <p className="mt-2 text-xs text-muted">{bundle.result.summary.blockingCount} blocking / {bundle.result.summary.warningCount} warnings</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Executor compatibility summary</p>
          <Badge variant={readinessVariant(bundle.result.readiness)}>{bundle.result.readiness}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{bundle.summary}</p>
        <p className="mt-2 text-xs text-muted">
          accepted receipts {bundle.profileResolution.acceptedReceiptProfiles.join(" / ")}
        </p>
        <p className="mt-2 text-xs text-muted">
          source signature {bundle.sourceSignature} / review signature {bundle.reviewSignature}
        </p>
      </div>

      <div className="space-y-3">
        {bundle.result.artifactResults.map((artifact) => (
          <div key={artifact.artifactId} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
              <Badge variant={readinessVariant(artifact.readiness)}>{artifact.readiness}</Badge>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">
              {artifact.artifactKind.replaceAll("_", " ")} / {artifact.requiredWriterCapability.replaceAll("_", " ")}
            </p>
            {artifact.warnings.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {artifact.warnings.map((warning) => (
                  <p key={`${artifact.artifactId}-${warning}`}>{warning}</p>
                ))}
              </div>
            ) : null}
            {artifact.issues.filter((issue) => issue.severity !== "warning").length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {artifact.issues.filter((issue) => issue.severity !== "warning").map((issue) => (
                  <p key={issue.id}>{issue.message}</p>
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
