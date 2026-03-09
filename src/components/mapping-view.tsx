"use client";

import { useSyncExternalStore } from "react";

import { DeliveryExecutionPreview } from "@/components/delivery-execution-preview";
import { ExecutorCompatibilityPreview } from "@/components/executor-compatibility-preview";
import { ExternalExecutionPackagePreview } from "@/components/external-execution-package-preview";
import { DeliveryHandoffPreview } from "@/components/delivery-handoff-preview";
import { DeliveryStagingPreview } from "@/components/delivery-staging-preview";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { WriterAdapterPreview } from "@/components/writer-adapter-preview";
import { WriterRunnerPreview } from "@/components/writer-runner-preview";
import { WriterRunTransportPreview } from "@/components/writer-run-transport-preview";
import { WriterRunTransportAdapterPreview } from "@/components/writer-run-transport-adapter-preview";
import { WriterRunReceiptIngestionPreview } from "@/components/writer-run-receipt-ingestion-preview";
import { createEmptyReviewStateStore, readStoredReviewStateStore, resolveStoredReviewState, subscribeToReviewStates, clearStoredReviewState, writeStoredReviewState } from "@/lib/local-review-state";
import { getFieldRecorderDecision, getMarkerAction } from "@/lib/mapping-workflow";
import {
  applyFieldRecorderReviewDecision,
  applyMarkerReviewDecision,
  applyMetadataOverride,
  applyTrackOverride,
  applyValidationReviewDecision,
  buildReviewOverlay,
  clearFieldRecorderReviewDecision,
  clearMarkerReviewDecision,
  clearMetadataOverride,
  clearTrackOverride,
  clearValidationReviewDecision,
  createEmptyReviewState,
  createReviewStateSourceSignature,
  getFieldRecorderReviewDecision,
  getMarkerReviewDecision,
  hasMetadataOverride,
  hasTrackOverride,
  type ReviewJobContext,
} from "@/lib/review-state";
import type { FieldRecorderOverrideStatus, MappingAction, MetadataStatus, PreservationIssue } from "@/lib/types";
import { useHydrated } from "@/lib/use-hydrated";

function overrideVariant(status: FieldRecorderOverrideStatus) {
  switch (status) {
    case "linked":
      return "accent" as const;
    case "unresolved":
      return "danger" as const;
    case "ignored":
      return "neutral" as const;
  }
}

function issueVariant(issue: PreservationIssue) {
  switch (issue.severity) {
    case "critical":
      return "danger" as const;
    case "warning":
      return "warning" as const;
    case "info":
      return "accent" as const;
  }
}

function actionButtonVariant(isActive: boolean) {
  return isActive ? "default" as const : "subtle" as const;
}

function reviewBadgeVariant(isEdited: boolean) {
  return isEdited ? "warning" as const : "neutral" as const;
}

function applyBulkTrackAction(
  reviewState: ReturnType<typeof createEmptyReviewState>,
  context: ReviewJobContext,
  action: MappingAction,
) {
  return context.mappingProfile.trackMappings.reduce(
    (current, track) => applyTrackOverride(current, context.mappingProfile, track.id, { action }),
    reviewState,
  );
}

function applyBulkMetadataStatus(
  reviewState: ReturnType<typeof createEmptyReviewState>,
  context: ReviewJobContext,
  status: MetadataStatus,
) {
  return context.mappingProfile.metadataMappings.reduce(
    (current, mapping) => applyMetadataOverride(current, context.mappingProfile, mapping.id, { status }),
    reviewState,
  );
}

function applyBulkMarkerAction(
  reviewState: ReturnType<typeof createEmptyReviewState>,
  context: ReviewJobContext,
  action: MappingAction,
) {
  return context.markers.reduce(
    (current, marker) => applyMarkerReviewDecision(current, context.mappingRules, context.markers, marker.id, { action }),
    reviewState,
  );
}

function applyBulkFieldRecorderDecision(
  reviewState: ReturnType<typeof createEmptyReviewState>,
  context: ReviewJobContext,
  status: FieldRecorderOverrideStatus,
) {
  return context.fieldRecorderCandidates.reduce(
    (current, candidate) =>
      applyFieldRecorderReviewDecision(current, context.mappingProfile, context.fieldRecorderCandidates, candidate.id, { status }),
    reviewState,
  );
}

function visibleValidationItems(items: ReturnType<typeof buildReviewOverlay>["validationItems"]) {
  return [...items]
    .filter((item) => item.isActionable || item.status !== "unreviewed" || item.note.trim().length > 0)
    .sort((left, right) => {
      if (left.isOpen !== right.isOpen) {
        return left.isOpen ? -1 : 1;
      }

      return left.issue.title.localeCompare(right.issue.title);
    });
}

export function MappingView({ context }: { context: ReviewJobContext }) {
  const store = useSyncExternalStore(
    subscribeToReviewStates,
    readStoredReviewStateStore,
    createEmptyReviewStateStore,
  );
  const hydrated = useHydrated();

  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const defaultState = createEmptyReviewState(context.job.id, sourceSignature);
  const reviewState = resolveStoredReviewState(defaultState, store);
  const stored = Boolean(store.states[defaultState.key]);
  const overlay = buildReviewOverlay(context, reviewState);
  const actionableValidationItems = visibleValidationItems(overlay.validationItems);
  const storageState = !hydrated
    ? "Server defaults"
    : stored
      ? "Loaded from and persisted to browser-local storage"
      : "Ready to persist on the next operator edit";

  const updateReviewState = (updater: (current: typeof reviewState) => typeof reviewState) => {
    const latestState = resolveStoredReviewState(defaultState, readStoredReviewStateStore());
    writeStoredReviewState(updater(latestState));
  };

  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Review state"
        title="Persisted operator overlay"
        description="Imported canonical data remains the base layer. Only operator deltas are persisted in browser-local storage and reapplied after hydration."
        aside={
          <div className="flex flex-wrap gap-2">
            <Badge variant={hydrated ? "accent" : "neutral"}>{storageState}</Badge>
            <Button size="sm" type="button" variant="subtle" onClick={() => clearStoredReviewState(defaultState.key)}>Reset to imported state</Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Open reviews</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.reviewCounts.totalOpenCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Mapping</p>
            <p className="mt-2 text-sm text-foreground">{overlay.reviewCounts.mappingOpenCount} open</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Validation</p>
            <p className="mt-2 text-sm text-foreground">{overlay.reviewCounts.validationOpenCount} open / {overlay.reviewCounts.validationAcknowledgedCount} acknowledged</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">ReConform</p>
            <p className="mt-2 text-sm text-foreground">{overlay.reviewCounts.reconformOpenCount} open / {overlay.reviewCounts.reconformAcknowledgedCount} acknowledged</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Timecode policy"
        title="Timeline and event timing"
        description="The editor preview keeps the imported timeline stable while mapping, validation, and delivery decisions update from saved operator deltas."
        aside={<Badge variant="neutral">{overlay.effectiveMappingProfile.timecodePolicy.eventStartMode.replaceAll("_", " ")}</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Timeline start</p>
            <p className="mt-2 font-mono text-sm text-foreground">{overlay.effectiveMappingProfile.timecodePolicy.timelineStart}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Timeline</p>
            <p className="mt-2 text-sm text-foreground">{context.timeline.name}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Drop frame</p>
            <p className="mt-2 text-sm text-foreground">{overlay.effectiveMappingProfile.timecodePolicy.dropFrame ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Source signature</p>
            <p className="mt-2 font-mono text-xs text-foreground">{sourceSignature}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Operator summary"
        title="Validation and delivery preview"
        description="The exporter stays planning-only. This summary recalculates from current saved review state without writing any Nuendo project files."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Validation findings</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.previewReport.summary.totalFindings}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked artifacts</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.previewPlan.exportArtifacts.filter((artifact) => artifact.status === "blocked").length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Marker exports</p>
            <p className="mt-2 text-sm text-foreground">{overlay.effectiveMarkers.length} active / {context.markers.length} imported</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Delivery summary</p>
            <p className="mt-2 text-sm text-foreground">{overlay.previewPlan.deliveryPackage.deliverySummary}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {overlay.previewPlan.exportArtifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-2xl border border-border/70 bg-panel p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
                <Badge variant={artifact.status === "blocked" ? "danger" : artifact.status === "placeholder" ? "warning" : "accent"}>{artifact.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{artifact.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <DeliveryExecutionPreview executionPlan={overlay.previewExecution} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <DeliveryStagingPreview stagingBundle={overlay.previewStaging} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <DeliveryHandoffPreview handoffBundle={overlay.previewHandoff} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <ExternalExecutionPackagePreview packageBundle={overlay.previewExternalPackage} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <ExecutorCompatibilityPreview bundle={overlay.previewExecutorCompatibility} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <WriterAdapterPreview bundle={overlay.previewWriterAdapters} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <WriterRunnerPreview bundle={overlay.previewWriterRuns} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <WriterRunTransportPreview bundle={overlay.previewWriterRunTransport} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <WriterRunTransportAdapterPreview bundle={overlay.previewWriterRunTransportAdapters} />
        </div>
        <div className="mt-5 border-t border-border/70 pt-5">
          <WriterRunReceiptIngestionPreview bundle={overlay.previewWriterRunReceipts} />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Track mapping"
        title="Resolve lanes to Nuendo targets"
        description="Track actions update the saved delivery preview immediately. Bulk actions only change operator deltas, not the imported base model."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkTrackAction(current, context, "preserve"))}>Bulk preserve</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkTrackAction(current, context, "remap"))}>Bulk remap</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkTrackAction(current, context, "ignore"))}>Bulk ignore</Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source track</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Target lane</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overlay.effectiveMappingProfile.trackMappings.map((track) => {
                const isEdited = hasTrackOverride(reviewState, track.id);

                return (
                  <TableRow key={track.id}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{track.sourceTrack}</span>
                          <Badge variant={reviewBadgeVariant(isEdited)}>{isEdited ? "Operator-edited" : "Imported base"}</Badge>
                        </div>
                        {isEdited ? (
                          <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => clearTrackOverride(current, track.id))}>Revert</Button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{track.sourceRole.toUpperCase()}</TableCell>
                    <TableCell>{track.channelLayout}</TableCell>
                    <TableCell>
                      <Input
                        onChange={(event) => updateReviewState((current) =>
                          applyTrackOverride(current, context.mappingProfile, track.id, { targetLane: event.target.value })
                        )}
                        value={track.targetLane}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(["preserve", "remap", "merge", "ignore"] as const).map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            type="button"
                            variant={actionButtonVariant(track.action === action)}
                            onClick={() => updateReviewState((current) =>
                              applyTrackOverride(current, context.mappingProfile, track.id, { action })
                            )}
                          >
                            {action}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Marker mapping"
        title="Marker review and carryover"
        description="Suppress or remap imported markers before marker EDL and marker CSV planning."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMarkerAction(current, context, "preserve"))}>Bulk preserve</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMarkerAction(current, context, "remap"))}>Bulk review</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMarkerAction(current, context, "ignore"))}>Bulk suppress</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {context.markers.map((marker) => {
            const action = getMarkerAction(overlay.effectiveMappingRules, marker);
            const decision = getMarkerReviewDecision(reviewState, marker.id);
            const isEdited = Boolean(decision);

            return (
              <div key={marker.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{marker.name}</p>
                      <Badge variant={reviewBadgeVariant(isEdited)}>{isEdited ? "Operator-edited" : "Imported base"}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">{marker.timecode} / {marker.color}</p>
                    <p className="mt-2 text-sm text-muted">{marker.note || "No marker note supplied."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["preserve", "remap", "ignore"] as const).map((candidateAction) => (
                      <Button
                        key={candidateAction}
                        size="sm"
                        type="button"
                        variant={actionButtonVariant(action === candidateAction)}
                        onClick={() => updateReviewState((current) =>
                          applyMarkerReviewDecision(current, context.mappingRules, context.markers, marker.id, { action: candidateAction })
                        )}
                      >
                        {candidateAction}
                      </Button>
                    ))}
                    {isEdited ? (
                      <Button size="sm" type="button" variant="secondary" onClick={() => updateReviewState((current) => clearMarkerReviewDecision(current, marker.id))}>Revert</Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Operator note</p>
                  <Textarea
                    className="mt-2 min-h-20"
                    onChange={(event) => updateReviewState((current) =>
                      applyMarkerReviewDecision(current, context.mappingRules, context.markers, marker.id, { note: event.target.value })
                    )}
                    placeholder="Capture marker carryover notes or suppression rationale."
                    value={decision?.note ?? ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Metadata mapping"
        title="Editorial metadata transforms"
        description="Review how canonical metadata will appear in planned delivery exports."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMetadataStatus(current, context, "mapped"))}>Bulk map</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMetadataStatus(current, context, "transformed"))}>Bulk transform</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkMetadataStatus(current, context, "dropped"))}>Bulk drop</Button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overlay.effectiveMappingProfile.metadataMappings.map((item) => {
                const isEdited = hasMetadataOverride(reviewState, item.id);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="uppercase tracking-[0.12em] text-muted">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{item.field.replaceAll("_", " ")}</span>
                        <Badge variant={reviewBadgeVariant(isEdited)}>{isEdited ? "Operator-edited" : "Imported base"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sourceValue}</TableCell>
                    <TableCell>
                      <Input
                        onChange={(event) => updateReviewState((current) =>
                          applyMetadataOverride(current, context.mappingProfile, item.id, { targetValue: event.target.value })
                        )}
                        value={item.targetValue}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {(["mapped", "transformed", "dropped"] as const).map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            type="button"
                            variant={actionButtonVariant(item.status === status)}
                            onClick={() => updateReviewState((current) =>
                              applyMetadataOverride(current, context.mappingProfile, item.id, { status })
                            )}
                          >
                            {status}
                          </Button>
                        ))}
                        {isEdited ? (
                          <Button size="sm" type="button" variant="secondary" onClick={() => updateReviewState((current) => clearMetadataOverride(current, item.id))}>Revert</Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Field recorder"
        title="Candidate review and overrides"
        description="Link, leave unresolved, or explicitly ignore production-audio candidates. Saved decisions update exporter planning after hydration."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkFieldRecorderDecision(current, context, "linked"))}>Bulk link</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkFieldRecorderDecision(current, context, "unresolved"))}>Bulk unresolved</Button>
            <Button size="sm" type="button" variant="subtle" onClick={() => updateReviewState((current) => applyBulkFieldRecorderDecision(current, context, "ignored"))}>Bulk ignore</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {context.fieldRecorderCandidates.map((candidate) => {
            const decision = getFieldRecorderDecision(overlay.effectiveMappingProfile, candidate);
            const reviewDecision = getFieldRecorderReviewDecision(reviewState, candidate.id);
            const clip = context.clipEvents.find((clipEvent) => clipEvent.id === candidate.clipEventId);
            const isEdited = Boolean(reviewDecision);

            return (
              <div key={candidate.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{clip?.clipName ?? candidate.clipEventId}</p>
                      <Badge variant={overrideVariant(decision)}>{decision}</Badge>
                      <Badge variant={reviewBadgeVariant(isEdited)}>{isEdited ? "Operator-edited" : "Imported base"}</Badge>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted">{candidate.candidateAssetName}</p>
                    <p className="mt-2 text-sm text-muted">{candidate.note}</p>
                    <p className="mt-2 text-xs text-muted">
                      reel {candidate.matchKeys.reel ?? "<missing>"} / tape {candidate.matchKeys.tape ?? "<missing>"} / scene {candidate.matchKeys.scene ?? "<missing>"} / take {candidate.matchKeys.take ?? "<missing>"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["linked", "unresolved", "ignored"] as const).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        type="button"
                        variant={actionButtonVariant(decision === status)}
                        onClick={() => updateReviewState((current) =>
                          applyFieldRecorderReviewDecision(current, context.mappingProfile, context.fieldRecorderCandidates, candidate.id, { status })
                        )}
                      >
                        {status}
                      </Button>
                    ))}
                    {isEdited ? (
                      <Button size="sm" type="button" variant="secondary" onClick={() => updateReviewState((current) => clearFieldRecorderReviewDecision(current, candidate.id))}>Revert</Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Operator note</p>
                  <Textarea
                    className="mt-2 min-h-20"
                    onChange={(event) => updateReviewState((current) =>
                      applyFieldRecorderReviewDecision(current, context.mappingProfile, context.fieldRecorderCandidates, candidate.id, { note: event.target.value })
                    )}
                    placeholder="Capture relink rationale, offline decisions, or production audio follow-up."
                    value={reviewDecision?.note ?? ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Validation queue"
        title="Preservation issues from current saved review state"
        description={`${overlay.previewReport.intakeCompletenessSummary} ${overlay.previewReport.deliveryReadinessSummary}`}
        aside={<Badge variant={overlay.reviewCounts.validationOpenCount > 0 ? "danger" : "accent"}>{overlay.reviewCounts.validationOpenCount} open</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">High risk</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.previewReport.highRiskCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Warnings</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.previewReport.warningCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Acknowledged</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.reviewCounts.validationAcknowledgedCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Dismissed</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{overlay.reviewCounts.validationDismissedCount}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {actionableValidationItems.map((item) => {
            const isEdited = item.status !== "unreviewed" || item.note.trim().length > 0;

            return (
              <div key={item.issueKey} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{item.issue.title}</p>
                      <Badge variant={issueVariant(item.issue)}>{item.issue.severity}</Badge>
                      <Badge variant={item.status === "acknowledged" ? "accent" : item.status === "dismissed" ? "warning" : "danger"}>{item.status}</Badge>
                      <Badge variant={reviewBadgeVariant(isEdited)}>{isEdited ? "Operator-reviewed" : "Imported base"}</Badge>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{item.issue.code} / {item.issue.scope.replaceAll("_", " ")}</p>
                    <p className="mt-3 text-sm text-muted">{item.issue.description}</p>
                    <p className="mt-2 text-sm text-muted">{item.issue.recommendedAction}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" variant={actionButtonVariant(item.status === "acknowledged")} onClick={() => updateReviewState((current) => applyValidationReviewDecision(current, item.issue, { status: "acknowledged" }))}>Acknowledge</Button>
                    <Button size="sm" type="button" variant={actionButtonVariant(item.status === "dismissed")} onClick={() => updateReviewState((current) => applyValidationReviewDecision(current, item.issue, { status: "dismissed" }))}>Dismiss</Button>
                    {isEdited ? (
                      <Button size="sm" type="button" variant="secondary" onClick={() => updateReviewState((current) => clearValidationReviewDecision(current, item.issue))}>Clear</Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Operator note</p>
                  <Textarea
                    className="mt-2 min-h-20"
                    onChange={(event) => updateReviewState((current) =>
                      applyValidationReviewDecision(current, item.issue, { note: event.target.value })
                    )}
                    placeholder="Capture sign-off notes, reasons for dismissal, or follow-up actions."
                    value={item.note}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
