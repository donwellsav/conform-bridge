import type { DeferredWriterArtifact, DeliveryHandoffBundle, WriterReadinessStatus } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function readinessVariant(status: WriterReadinessStatus) {
  switch (status) {
    case "ready-for-writer":
      return "accent" as const;
    case "blocked":
      return "danger" as const;
    case "partial":
      return "warning" as const;
    case "deferred-with-known-gaps":
      return "neutral" as const;
  }
}

function dependencyVariant(status: DeferredWriterArtifact["dependencies"][number]["status"]) {
  switch (status) {
    case "present":
      return "accent" as const;
    case "optional":
      return "neutral" as const;
    case "missing":
      return "warning" as const;
    case "blocked":
      return "danger" as const;
  }
}

export function DeliveryHandoffPreview({ handoffBundle }: { handoffBundle: DeliveryHandoffBundle }) {
  const deferredArtifacts = handoffBundle.deferredWriterInput.artifacts;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Handoff status</p>
          <div className="mt-2">
            <Badge variant={readinessVariant(handoffBundle.summaryJson.readinessStatus)}>{handoffBundle.summaryJson.readinessStatus}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Ready</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{handoffBundle.summaryJson.readyForWriterCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Partial</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{handoffBundle.summaryJson.partialCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{handoffBundle.summaryJson.blockedArtifactCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <p className="text-sm font-semibold text-foreground">Handoff summary</p>
        <p className="mt-2 text-sm text-muted">{handoffBundle.summaryJson.note}</p>
        <p className="mt-2 font-mono text-xs text-muted">{handoffBundle.rootRelativePath}</p>
      </div>

      <div className="space-y-3">
        {deferredArtifacts.map((artifact) => (
          <div key={artifact.artifactId} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={readinessVariant(artifact.readinessStatus)}>{artifact.readinessStatus}</Badge>
                <Badge variant="neutral">{artifact.requiredWriterCapability}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{artifact.explanation}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{artifact.artifactKind.replaceAll("_", " ")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {artifact.dependencies.map((dependency) => (
                <Badge key={dependency.id} variant={dependencyVariant(dependency.status)}>
                  {dependency.label}
                </Badge>
              ))}
            </div>
            {artifact.blockers.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-muted">
                {artifact.blockers.map((blocker) => (
                  <p key={`${artifact.artifactId}-${blocker}`}>{blocker}</p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {handoffBundle.entries.map((entry) => (
          <div key={entry.relativePath} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{entry.relativePath}</p>
              <Badge variant="accent">{entry.payloadKind.replaceAll("_", " ")}</Badge>
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
