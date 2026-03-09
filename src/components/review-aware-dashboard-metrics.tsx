"use client";

import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { createEmptyReviewStateStore, readStoredReviewStateStore, resolveStoredReviewState, subscribeToReviewStates } from "@/lib/local-review-state";
import { buildReviewOverlay, createEmptyReviewState, createReviewStateSourceSignature, type ReviewJobContext } from "@/lib/review-state";

function padMetric(value: number) {
  return value.toString().padStart(2, "0");
}

export function ReviewAwareDashboardMetrics({
  contexts,
  mode,
}: {
  contexts: ReviewJobContext[];
  mode: "imported" | "mock";
}) {
  const store = useSyncExternalStore(
    subscribeToReviewStates,
    readStoredReviewStateStore,
    createEmptyReviewStateStore,
  );

  const overlays = contexts.map((context) => {
    const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
    const defaultState = createEmptyReviewState(context.job.id, sourceSignature);
    return buildReviewOverlay(context, resolveStoredReviewState(defaultState, store));
  });

  const intakePackageCount = contexts.length;
  const canonicalTimelineCount = contexts.length;
  const plannedDeliveryCount = overlays.reduce((total, overlay) => total + overlay.previewPlan.exportArtifacts.length, 0);
  const openReviewCount = overlays.reduce((total, overlay) => total + overlay.reviewCounts.totalOpenCount, 0);
  const highRiskIssueCount = overlays.reduce((total, overlay) => total + overlay.previewReport.highRiskCount, 0);
  const missingIntakeCount = contexts.reduce(
    (total, context) => total + context.bundle.assets.filter((asset) => asset.status === "missing").length,
    0,
  );
  const validationOpenCount = overlays.reduce((total, overlay) => total + overlay.reviewCounts.validationOpenCount, 0);
  const reconformOpenCount = overlays.reduce((total, overlay) => total + overlay.reviewCounts.reconformOpenCount, 0);

  const metrics = [
    {
      label: "Intake packages",
      value: padMetric(intakePackageCount),
      note: "Real fixture folders scanned from disk through the importer pipeline.",
      tone: "neutral" as const,
    },
    {
      label: "Canonical timelines",
      value: padMetric(canonicalTimelineCount),
      note: "Normalized timelines are hydrated from imported timeline exchange, AAF, EDL, or metadata fallback depending on source coverage.",
      tone: "accent" as const,
    },
    {
      label: "Planned delivery files",
      value: padMetric(plannedDeliveryCount),
      note: "Delivery artifacts are previewed by exporter.ts from imported canonical analysis plus saved operator review deltas.",
      tone: "accent" as const,
    },
    {
      label: "Open reviews",
      value: padMetric(openReviewCount),
      note: `${validationOpenCount} validation item(s) and ${reconformOpenCount} reconform item(s) still need operator attention.`,
      tone: openReviewCount > 0 ? "warning" as const : "accent" as const,
    },
    {
      label: "High-risk issues",
      value: padMetric(highRiskIssueCount),
      note: missingIntakeCount > 0
        ? `${missingIntakeCount} missing intake asset(s) still affect delivery readiness.`
        : "No missing intake assets are currently flagged.",
      tone: highRiskIssueCount > 0 ? "danger" as const : "accent" as const,
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-border/80 bg-panel p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{metric.label}</p>
            <Badge variant={metric.tone === "danger" ? "danger" : metric.tone === "warning" ? "warning" : metric.tone === "accent" ? "accent" : "neutral"}>
              {mode === "imported" ? "Imported" : "Mock fallback"}
            </Badge>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground">{metric.value}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{metric.note}</p>
        </div>
      ))}
    </section>
  );
}
