"use client";

import { useState, useSyncExternalStore } from "react";

import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { clearStoredReviewState, createEmptyReviewStateStore, readStoredReviewStateStore, resolveStoredReviewState, subscribeToReviewStates, writeStoredReviewState } from "@/lib/local-review-state";
import {
  applyReconformReviewDecision,
  buildReviewOverlay,
  clearReconformReviewDecision,
  createEmptyReviewState,
  createReviewStateSourceSignature,
  getReconformReviewDecision,
  type ReviewJobContext,
} from "@/lib/review-state";

type ReconformFilter = "all" | "unresolved" | "acknowledged" | "risky";

function changeVariant(changeType: ReviewJobContext["conformChangeEvents"][number]["changeType"]) {
  if (changeType === "replace" || changeType === "delete") {
    return "danger" as const;
  }

  if (changeType === "move" || changeType === "trim") {
    return "warning" as const;
  }

  return "accent" as const;
}

function decisionVariant(status: "unreviewed" | "acknowledged" | "needs-follow-up") {
  switch (status) {
    case "acknowledged":
      return "accent" as const;
    case "needs-follow-up":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function matchesFilter(filter: ReconformFilter, item: ReturnType<typeof buildReviewOverlay>["reconformItems"][number]) {
  switch (filter) {
    case "all":
      return true;
    case "unresolved":
      return item.status !== "acknowledged";
    case "acknowledged":
      return item.status === "acknowledged";
    case "risky":
      return item.isRisky;
  }
}

export function ReconformReview({ context }: { context: ReviewJobContext }) {
  const [filter, setFilter] = useState<ReconformFilter>("unresolved");
  const store = useSyncExternalStore(
    subscribeToReviewStates,
    readStoredReviewStateStore,
    createEmptyReviewStateStore,
  );
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const defaultState = createEmptyReviewState(context.job.id, sourceSignature);
  const reviewState = resolveStoredReviewState(defaultState, store);
  const overlay = buildReviewOverlay(context, reviewState);
  const visibleItems = overlay.reconformItems.filter((item) => matchesFilter(filter, item));

  const updateReviewState = (updater: (current: typeof reviewState) => typeof reviewState) => {
    const latestState = resolveStoredReviewState(defaultState, readStoredReviewStateStore());
    writeStoredReviewState(updater(latestState));
  };

  const resetReconformReview = () => {
    const latestState = resolveStoredReviewState(defaultState, readStoredReviewStateStore());
    writeStoredReviewState({
      ...latestState,
      reconformDecisions: [],
    });
  };

  return (
    <SectionCard
      eyebrow="Change list"
      title="Revision events"
      description="Review imported reconform change events, save notes locally, and keep per-change acknowledgement separate from the imported base analysis."
      aside={
        <div className="flex flex-wrap gap-2">
          <Badge variant={hydrated ? "accent" : "neutral"}>{hydrated ? "Review state hydrated" : "Server defaults"}</Badge>
          <Button size="sm" variant="subtle" onClick={resetReconformReview} type="button">Reset reconform review</Button>
          <Button size="sm" variant="subtle" onClick={() => clearStoredReviewState(defaultState.key)} type="button">Reset all saved review</Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Changed</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{overlay.reconformItems.length}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unresolved</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{overlay.reviewCounts.reconformOpenCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Acknowledged</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{overlay.reviewCounts.reconformAcknowledgedCount}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Needs follow-up</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{overlay.reviewCounts.reconformNeedsFollowUpCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "unresolved", "acknowledged", "risky"] as const).map((candidateFilter) => (
          <Button
            key={candidateFilter}
            size="sm"
            variant={filter === candidateFilter ? "default" : "subtle"}
            onClick={() => setFilter(candidateFilter)}
            type="button"
          >
            {candidateFilter.replaceAll("-", " ")}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {visibleItems.map((item) => {
          const decision = getReconformReviewDecision(reviewState, item.event.id);
          const isEdited = Boolean(decision);

          return (
            <div key={item.event.id} className="rounded-2xl border border-border/70 bg-panel p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{item.event.changeType}</p>
                    <Badge variant={changeVariant(item.event.changeType)}>{item.event.changeType}</Badge>
                    <Badge variant={decisionVariant(item.status)}>{item.status}</Badge>
                    <Badge variant={isEdited ? "warning" : "neutral"}>{isEdited ? "Operator-reviewed" : "Imported base"}</Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted">{item.event.oldTimecode} ({item.event.oldFrame}) {" -> "} {item.event.newTimecode} ({item.event.newFrame})</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{item.event.note}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["unreviewed", "acknowledged", "needs-follow-up"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={item.status === status ? "default" : "subtle"}
                      onClick={() => updateReviewState((current) => applyReconformReviewDecision(current, item.event.id, { status }))}
                      type="button"
                    >
                      {status.replaceAll("-", " ")}
                    </Button>
                  ))}
                  {isEdited ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateReviewState((current) => clearReconformReviewDecision(current, item.event.id))}
                      type="button"
                    >
                      Revert
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Operator note</p>
                <Textarea
                  className="mt-2 min-h-20"
                  onChange={(event) => updateReviewState((current) => applyReconformReviewDecision(current, item.event.id, { note: event.target.value }))}
                  placeholder="Capture compare notes, timing questions, or follow-up actions."
                  value={item.note}
                />
              </div>
            </div>
          );
        })}

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-border/70 bg-panel p-4 text-sm text-muted">
            No reconform events match the current filter.
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
