import type { WriterAdapterBundle, WriterAdapterReadiness } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function readinessVariant(status: WriterAdapterReadiness) {
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

export function WriterAdapterPreview({ bundle }: { bundle: WriterAdapterBundle }) {
  const unsupportedMatches = bundle.artifactMatches.filter((match) => match.status === "unsupported").length;
  const blockedMatches = bundle.artifactMatches.filter((match) => match.status === "blocked").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Adapter readiness</p>
          <div className="mt-2">
            <Badge variant={readinessVariant(bundle.readiness)}>{bundle.readiness}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deferred artifacts</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{bundle.input.artifactInputs.length}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked matches</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{blockedMatches}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unsupported</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{unsupportedMatches}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Writer adapter summary</p>
          <Badge variant="neutral">{bundle.packageStatus}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{bundle.summary}</p>
        <p className="mt-2 text-xs text-muted">
          source signature {bundle.input.sourceSignature} / review signature {bundle.input.reviewSignature}
        </p>
      </div>

      <div className="space-y-3">
        {bundle.artifactMatches.map((match) => (
          <div key={match.artifactId} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{match.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={readinessVariant(match.status)}>{match.status}</Badge>
                <Badge variant="neutral">{match.requiredCapability}</Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{match.reason}</p>
            <p className="mt-2 text-xs text-muted">
              matched adapters {match.matchedAdapterIds.length > 0 ? match.matchedAdapterIds.join(", ") : "none"}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {bundle.adapters.map((adapter) => (
          <div key={adapter.id} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{adapter.label}</p>
                <p className="mt-1 text-xs text-muted">{adapter.capabilities.join(", ")}</p>
              </div>
              <Badge variant={readinessVariant(adapter.validation.readiness)}>{adapter.validation.readiness}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{adapter.dryRun.executionPlan.note}</p>
            {adapter.validation.unsupportedReasons.length > 0 ? (
              <div className="mt-3 space-y-1 text-xs text-muted">
                {adapter.validation.unsupportedReasons.map((reason) => (
                  <p key={`${adapter.id}-${reason.code}-${reason.artifactId ?? reason.message}`}>
                    {reason.code}: {reason.message}
                  </p>
                ))}
              </div>
            ) : null}
            <div className="mt-3 space-y-2">
              {adapter.dryRun.executionPlan.steps.map((step) => (
                <div key={`${adapter.id}-${step.artifactId}`} className="rounded-xl border border-border/60 bg-surface px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-xs text-muted">{step.fileName}</p>
                    <Badge variant={readinessVariant(step.readiness)}>{step.readiness}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{step.summary}</p>
                  {step.blockers.length > 0 ? (
                    <div className="mt-2 space-y-1 text-xs text-muted">
                      {step.blockers.map((blocker) => (
                        <p key={`${step.artifactId}-${blocker}`}>{blocker}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
