import type { WriterRunBundle, WriterRunnerReadiness } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function readinessVariant(status: WriterRunnerReadiness) {
  switch (status) {
    case "ready":
      return "accent" as const;
    case "partial":
      return "warning" as const;
    case "blocked":
      return "danger" as const;
    case "unsupported":
      return "neutral" as const;
  }
}

export function WriterRunnerPreview({ bundle }: { bundle: WriterRunBundle }) {
  const runnableCount = bundle.request.requests.filter((request) => request.requestReadiness === "ready").length;
  const blockedCount = bundle.receipt.artifacts.filter((artifact) => artifact.responseStatus === "blocked").length;
  const unsupportedCount = bundle.receipt.artifacts.filter((artifact) => artifact.responseStatus === "unsupported").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Runner readiness</p>
          <div className="mt-2">
            <Badge variant={readinessVariant(bundle.readiness)}>{bundle.readiness}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Runnable requests</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{runnableCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{blockedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unsupported</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{unsupportedCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Writer runner summary</p>
          <Badge variant="neutral">{bundle.response.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{bundle.summary}</p>
        <p className="mt-2 text-xs text-muted">
          source signature {bundle.input.sourceSignature} / review signature {bundle.input.reviewSignature}
        </p>
      </div>

      <div className="space-y-3">
        {bundle.receipt.artifacts.map((artifact) => (
          <div key={artifact.artifactId} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={readinessVariant(artifact.requestReadiness)}>{artifact.requestReadiness}</Badge>
                <Badge variant={artifact.responseStatus === "simulated-noop" ? "accent" : artifact.responseStatus === "partial" ? "warning" : artifact.responseStatus === "blocked" ? "danger" : "neutral"}>
                  {artifact.responseStatus}
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{artifact.note}</p>
            <p className="mt-2 text-xs text-muted">
              adapter {artifact.adapterId ?? "none"} / runner {artifact.runnerId ?? "none"}
            </p>
            {artifact.blockedReasons.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {artifact.blockedReasons.map((reason) => (
                  <p key={`${artifact.artifactId}-${reason.code}-${reason.message}`}>
                    {reason.code}: {reason.message}
                  </p>
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
