"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFieldRecorderDecision } from "@/lib/mapping-workflow";
import { createEmptyReviewStateStore, readStoredReviewStateStore, resolveStoredReviewState, subscribeToReviewStates } from "@/lib/local-review-state";
import { buildReviewOverlay, createEmptyReviewState, createReviewStateSourceSignature, type ReviewJobContext } from "@/lib/review-state";
import type { JobStatus } from "@/lib/types";

function statusVariant(status: JobStatus) {
  switch (status) {
    case "ready":
      return "accent" as const;
    case "attention":
      return "danger" as const;
    case "validating":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

function deriveStatus(context: ReviewJobContext, blockedArtifactCount: number, openReviewCount: number) {
  if (blockedArtifactCount > 0 || context.report.highRiskCount > 0 || openReviewCount > 0) {
    return "attention" as const;
  }

  return "ready" as const;
}

export function JobsTable({ contexts }: { contexts: ReviewJobContext[] }) {
  const store = useSyncExternalStore(
    subscribeToReviewStates,
    readStoredReviewStateStore,
    createEmptyReviewStateStore,
  );

  const rows = contexts.map((context) => {
    const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
    const defaultState = createEmptyReviewState(context.job.id, sourceSignature);
    const overlay = buildReviewOverlay(context, resolveStoredReviewState(defaultState, store));
    const blockedArtifactCount = overlay.previewPlan.exportArtifacts.filter((artifact) => artifact.status === "blocked").length;
    const activeTrackCount = overlay.effectiveMappingProfile.trackMappings.filter((track) => track.action !== "ignore").length;
    const fieldRecorderLinkedCount = context.fieldRecorderCandidates.filter((candidate) =>
      getFieldRecorderDecision(overlay.effectiveMappingProfile, candidate) === "linked",
    ).length;

    return {
      context,
      overlay,
      blockedArtifactCount,
      activeTrackCount,
      fieldRecorderLinkedCount,
      status: deriveStatus(context, blockedArtifactCount, overlay.reviewCounts.totalOpenCount),
    };
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Analysis</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ context, overlay, blockedArtifactCount, activeTrackCount, fieldRecorderLinkedCount, status }) => (
            <TableRow key={context.job.id}>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{context.job.jobCode}</span>
                    <Badge variant={statusVariant(status)}>{status}</Badge>
                  </div>
                  <p className="text-sm text-muted">{context.job.title}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="font-medium text-foreground">{context.bundle.sequenceName}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{context.bundle.fps} fps</p>
              </TableCell>
              <TableCell>
                <p>{context.outputPreset.name}</p>
                <p className="text-xs text-muted">{activeTrackCount} active track mappings / {fieldRecorderLinkedCount} field recorder linked</p>
              </TableCell>
              <TableCell>
                <p>{overlay.previewReport.summary.totalFindings} findings</p>
                <p className="text-xs text-muted">
                  {overlay.reviewCounts.mappingOpenCount} mapping / {overlay.reviewCounts.validationOpenCount} validation / {overlay.reviewCounts.reconformOpenCount} reconform / {blockedArtifactCount} blocked
                </p>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted">{context.job.updatedOn}</TableCell>
              <TableCell className="text-right">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/jobs/${context.job.id}`}>Inspect</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
