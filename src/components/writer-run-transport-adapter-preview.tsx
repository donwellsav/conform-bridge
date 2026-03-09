import type { WriterRunDispatchResultStatus, WriterRunTransportAdapterBundle, WriterRunTransportAdapterReadiness } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function readinessVariant(status: WriterRunTransportAdapterReadiness) {
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

function dispatchVariant(status: WriterRunDispatchResultStatus) {
  switch (status) {
    case "dispatched":
      return "accent" as const;
    case "blocked":
      return "warning" as const;
    case "dispatch-failed":
      return "danger" as const;
  }
}

export function WriterRunTransportAdapterPreview({ bundle }: { bundle: WriterRunTransportAdapterBundle }) {
  const dispatchedCount = bundle.dispatchResults.filter((result) => result.status === "dispatched").length;
  const failedCount = bundle.dispatchResults.filter((result) => result.status === "dispatch-failed").length;

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
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Active adapter</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{bundle.activeAdapterId}</p>
          <p className="mt-2 text-xs text-muted">{bundle.declaredReceiptProfiles[0]?.profile ?? "no declared profile"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Dispatch packages</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{dispatchedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked or failed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{failedCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        {bundle.adapters.map((adapter) => (
          <div key={adapter.id} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{adapter.label}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={readinessVariant(adapter.validation.readiness)}>{adapter.validation.readiness}</Badge>
                <Badge variant={adapter.id === bundle.activeAdapterId ? "accent" : "neutral"}>
                  {adapter.id === bundle.activeAdapterId ? "active" : "available"}
                </Badge>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              endpoint {adapter.endpoint.outboundPath} / inbound {adapter.endpoint.inboundPath}
            </p>
            <p className="mt-2 text-xs text-muted">
              receipt profiles {adapter.receiptCompatibilityProfiles.join(" / ")}
            </p>
            {adapter.validation.diagnostics.length > 0 ? (
              <div className="mt-2 space-y-1 text-xs text-muted">
                {adapter.validation.diagnostics.map((diagnostic) => (
                  <p key={`${adapter.id}-${diagnostic}`}>{diagnostic}</p>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {bundle.dispatchResults.map((result) => (
          <div key={result.id} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{result.relativeOutboundRoot}</p>
              <Badge variant={dispatchVariant(result.status)}>{result.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{result.note}</p>
            <p className="mt-2 text-xs text-muted">correlation {result.correlationId} / adapter {result.adapterId}</p>
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
