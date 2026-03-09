import type { DeliveryStagingBundle, StagedDeliveryEntry } from "@/lib/types";

import { Badge } from "@/components/ui/badge";

function entryVariant(entry: StagedDeliveryEntry) {
  switch (entry.kind) {
    case "generated_file":
    case "summary_file":
      return "accent" as const;
    case "deferred_descriptor":
      return "warning" as const;
  }
}

function entryLabel(entry: StagedDeliveryEntry) {
  switch (entry.kind) {
    case "generated_file":
      return "Generated file";
    case "summary_file":
      return "Staging summary";
    case "deferred_descriptor":
      return "Deferred descriptor";
  }
}

export function DeliveryStagingPreview({ stagingBundle }: { stagingBundle: DeliveryStagingBundle }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Stage root</p>
          <p className="mt-2 font-mono text-xs text-foreground">{stagingBundle.rootRelativePath}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Generated files</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stagingBundle.generatedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deferred records</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stagingBundle.deferredCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unresolved blockers</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{stagingBundle.unresolvedBlockerCount}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Review influence</p>
          <Badge variant={stagingBundle.reviewInfluence.hasSavedState ? "warning" : "neutral"}>
            {stagingBundle.reviewInfluence.mode === "saved_review_overlay" ? "Saved overlay" : "Imported base"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted">{stagingBundle.reviewInfluence.note}</p>
        <p className="mt-2 text-xs text-muted">
          operator edits {stagingBundle.reviewInfluence.operatorEditedCount} / validation acknowledged {stagingBundle.reviewInfluence.validationAcknowledgedCount} / reconform reviewed {stagingBundle.reviewInfluence.reconformReviewedCount}
        </p>
      </div>

      <div className="space-y-3">
        {stagingBundle.entries.map((entry) => (
          <div key={entry.relativePath} className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-xs text-muted">{entry.relativePath}</p>
              <Badge variant={entryVariant(entry)}>{entryLabel(entry)}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{entry.summary}</p>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl border border-border/60 bg-surface px-3 py-3 text-xs leading-6 text-muted whitespace-pre-wrap">
              {entry.content}
            </pre>
          </div>
        ))}
      </div>

      {stagingBundle.unavailableArtifacts.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-panel p-4">
          <p className="text-sm font-semibold text-foreground">Unavailable artifacts</p>
          <div className="mt-3 space-y-3">
            {stagingBundle.unavailableArtifacts.map((artifact) => (
              <div key={artifact.artifactId} className="rounded-2xl border border-border/70 bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
                  <Badge variant={artifact.artifactStatus === "blocked" ? "danger" : "warning"}>{artifact.artifactStatus}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{artifact.summary}</p>
                <p className="mt-2 text-xs text-muted">{artifact.reason}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
