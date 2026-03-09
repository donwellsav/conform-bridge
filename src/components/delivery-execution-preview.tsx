import type { DeliveryExecutionArtifactPayload, DeliveryExecutionPlan } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function executionVariant(artifact: DeliveryExecutionArtifactPayload) {
  switch (artifact.executionStatus) {
    case "generated":
      return "accent" as const;
    case "deferred":
      return "warning" as const;
    case "unavailable":
      return "neutral" as const;
  }
}

function artifactVariant(status: DeliveryExecutionArtifactPayload["artifactStatus"]) {
  switch (status) {
    case "planned":
      return "accent" as const;
    case "blocked":
      return "danger" as const;
    case "placeholder":
      return "warning" as const;
  }
}

function previewLabel(artifact: DeliveryExecutionArtifactPayload) {
  switch (artifact.payloadKind) {
    case "manifest_json":
      return "manifest.json";
    case "readme_text":
      return "README";
    case "marker_csv":
      return "Marker CSV";
    case "marker_edl":
      return "Marker EDL";
    case "metadata_csv":
      return "Metadata CSV";
    case "field_recorder_report":
      return "Field recorder report";
    case "reference_video_instruction":
      return "Reference instruction";
    case "deferred_binary":
      return "Deferred binary";
    case "unavailable":
      return "Unavailable";
  }
}

function generatedPreviewContent(artifact: DeliveryExecutionArtifactPayload) {
  if (artifact.executionStatus !== "generated") {
    return null;
  }

  return artifact.content;
}

export function DeliveryExecutionPreview({ executionPlan }: { executionPlan: DeliveryExecutionPlan }) {
  const generatedArtifacts = executionPlan.preparedArtifacts.filter((artifact) => artifact.executionStatus === "generated");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Generated</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{executionPlan.generatedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deferred</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{executionPlan.deferredCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unavailable</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{executionPlan.unavailableCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Summary</p>
          <p className="mt-2 text-sm text-foreground">{executionPlan.summary}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {executionPlan.preparedArtifacts.map((artifact) => (
          <div key={artifact.artifactId} className="rounded-2xl border border-border/70 bg-panel p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={artifactVariant(artifact.artifactStatus)}>{artifact.artifactStatus}</Badge>
                <Badge variant={executionVariant(artifact)}>{artifact.executionStatus}</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{previewLabel(artifact)} / {artifact.fileRole.replaceAll("_", " ")}</p>
            <p className="mt-2 text-sm text-muted">{artifact.summary}</p>
            {artifact.executionStatus === "deferred" ? (
              <p className="mt-2 text-xs text-muted">{artifact.reason}</p>
            ) : null}
            {artifact.executionStatus === "unavailable" ? (
              <p className="mt-2 text-xs text-muted">{artifact.reason}</p>
            ) : null}
          </div>
        ))}
      </div>

      {generatedArtifacts.length > 0 ? (
        <div className="space-y-3">
          {generatedArtifacts.map((artifact) => (
            <div key={`${artifact.artifactId}-preview`} className="rounded-2xl border border-border/70 bg-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{artifact.fileName}</p>
                <Badge variant="accent">payload available</Badge>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{previewLabel(artifact)}</p>
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-border/60 bg-surface px-3 py-3 text-xs leading-6 text-muted whitespace-pre-wrap">
                {generatedPreviewContent(artifact)}
              </pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
