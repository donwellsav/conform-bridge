"use client";

import { useState } from "react";

import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  bulkSetFieldRecorderDecision,
  bulkSetMarkerAction,
  bulkSetMetadataStatus,
  bulkSetTrackAction,
  countMappingReviews,
  getFieldRecorderDecision,
  getMarkerAction,
  setFieldRecorderDecision,
  setMarkerAction,
  updateMetadataMapping,
  updateTrackMapping,
} from "@/lib/mapping-workflow";
import { planNuendoDeliverySync } from "@/lib/services/exporter";
import type {
  AnalysisReport,
  ClipEvent,
  FieldRecorderCandidate,
  FieldRecorderOverrideStatus,
  MappingProfile,
  MappingRule,
  Marker,
  OutputPreset,
  PreservationIssue,
  SourceBundle,
  Timeline,
  TranslationJob,
  TranslationModel,
} from "@/lib/types";
import { buildOperatorValidationIssues, rebuildAnalysisReport } from "@/lib/validation";

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

interface MappingViewProps {
  job: TranslationJob;
  bundle: SourceBundle;
  translationModel: TranslationModel;
  timeline: Timeline;
  mapping: MappingProfile;
  mappingRules: MappingRule[];
  markers: Marker[];
  clipEvents: ClipEvent[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  report: AnalysisReport;
  outputPreset: OutputPreset;
  preservationIssues: PreservationIssue[];
}

export function MappingView({
  job,
  bundle,
  translationModel,
  timeline,
  mapping,
  mappingRules,
  markers,
  clipEvents,
  fieldRecorderCandidates,
  report,
  outputPreset,
  preservationIssues,
}: MappingViewProps) {
  const [mappingProfile, setMappingProfile] = useState(mapping);
  const [ruleSet, setRuleSet] = useState(mappingRules);
  const visibleMarkers = markers.filter((marker) => getMarkerAction(ruleSet, marker) !== "ignore");
  const previewReportSeed: AnalysisReport = {
    ...report,
    totals: {
      ...report.totals,
      trackCount: mappingProfile.trackMappings.filter((track) => track.action !== "ignore").length,
      markerCount: visibleMarkers.length,
    },
  };
  const provisionalPlan = planNuendoDeliverySync(
    job,
    translationModel,
    outputPreset,
    previewReportSeed,
    mappingProfile,
    preservationIssues,
  );
  const previewIssues = buildOperatorValidationIssues({
    job,
    sourceBundle: bundle,
    clipEvents,
    markers: visibleMarkers,
    exportArtifacts: provisionalPlan.exportArtifacts,
    fieldRecorderCandidates,
    mappingProfile,
    mappingRules: ruleSet,
    existingIssues: preservationIssues.filter((issue) => issue.code !== "DELIVERY_ARTIFACT_BLOCKED"),
  });
  const previewReport = rebuildAnalysisReport(
    previewReportSeed,
    bundle,
    clipEvents,
    visibleMarkers,
    provisionalPlan.exportArtifacts,
    previewIssues,
    mappingProfile,
    ruleSet,
    fieldRecorderCandidates,
  );
  const previewPlan = planNuendoDeliverySync(
    job,
    translationModel,
    outputPreset,
    previewReport,
    mappingProfile,
    previewIssues,
  );
  const reviewSummary = countMappingReviews(mappingProfile, ruleSet, fieldRecorderCandidates);
  const highlightedIssues = previewIssues
    .filter((issue) => issue.requiresDecision || issue.severity !== "info")
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Timecode policy"
        title="Timeline and event timing"
        description="The editor preview keeps the imported timeline stable while mapping and delivery decisions update locally."
        aside={<Badge variant="neutral">{mappingProfile.timecodePolicy.eventStartMode.replaceAll("_", " ")}</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Timeline start</p>
            <p className="mt-2 font-mono text-sm text-foreground">{mappingProfile.timecodePolicy.timelineStart}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Timeline</p>
            <p className="mt-2 text-sm text-foreground">{timeline.name}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Drop frame</p>
            <p className="mt-2 text-sm text-foreground">{mappingProfile.timecodePolicy.dropFrame ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Open reviews</p>
            <p className="mt-2 text-sm text-foreground">{reviewSummary.total}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Operator summary"
        title="Validation and delivery preview"
        description="The exporter stays planning-only. This summary recalculates locally from current mapping choices without writing anything."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Validation findings</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewReport.summary.totalFindings}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked artifacts</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewPlan.exportArtifacts.filter((artifact) => artifact.status === "blocked").length}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Marker exports</p>
            <p className="mt-2 text-sm text-foreground">{visibleMarkers.length} active / {markers.length} imported</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Delivery summary</p>
            <p className="mt-2 text-sm text-foreground">{previewPlan.deliveryPackage.deliverySummary}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {previewPlan.exportArtifacts.map((artifact) => (
            <div key={artifact.id} className="rounded-2xl border border-border/70 bg-panel p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
                <Badge variant={artifact.status === "blocked" ? "danger" : artifact.status === "placeholder" ? "warning" : "accent"}>{artifact.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{artifact.note}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Track mapping"
        title="Resolve lanes to Nuendo targets"
        description="Track actions update the local delivery preview immediately. Bulk actions apply to the visible track table only."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetTrackAction(profile, "preserve"))}>Bulk preserve</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetTrackAction(profile, "remap"))}>Bulk remap</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetTrackAction(profile, "ignore"))}>Bulk ignore</Button>
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
              {mappingProfile.trackMappings.map((track) => (
                <TableRow key={track.id}>
                  <TableCell className="font-medium">{track.sourceTrack}</TableCell>
                  <TableCell>{track.sourceRole.toUpperCase()}</TableCell>
                  <TableCell>{track.channelLayout}</TableCell>
                  <TableCell>
                    <Input
                      value={track.targetLane}
                      onChange={(event) => setMappingProfile((profile) => updateTrackMapping(profile, track.id, { targetLane: event.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(["preserve", "remap", "merge", "ignore"] as const).map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={actionButtonVariant(track.action === action)}
                          onClick={() => setMappingProfile((profile) => updateTrackMapping(profile, track.id, { action }))}
                        >
                          {action}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
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
            <Button size="sm" variant="subtle" onClick={() => setRuleSet((rules) => bulkSetMarkerAction(rules, job.id, markers, "preserve"))}>Bulk preserve</Button>
            <Button size="sm" variant="subtle" onClick={() => setRuleSet((rules) => bulkSetMarkerAction(rules, job.id, markers, "remap"))}>Bulk review</Button>
            <Button size="sm" variant="subtle" onClick={() => setRuleSet((rules) => bulkSetMarkerAction(rules, job.id, markers, "ignore"))}>Bulk suppress</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {markers.map((marker) => {
            const action = getMarkerAction(ruleSet, marker);

            return (
              <div key={marker.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{marker.name}</p>
                    <p className="mt-1 font-mono text-xs text-muted">{marker.timecode} / {marker.color}</p>
                    <p className="mt-2 text-sm text-muted">{marker.note || "No marker note supplied."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["preserve", "remap", "ignore"] as const).map((candidateAction) => (
                      <Button
                        key={candidateAction}
                        size="sm"
                        variant={actionButtonVariant(action === candidateAction)}
                        onClick={() => setRuleSet((rules) => setMarkerAction(rules, job.id, marker, candidateAction))}
                      >
                        {candidateAction}
                      </Button>
                    ))}
                  </div>
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
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetMetadataStatus(profile, "mapped"))}>Bulk map</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetMetadataStatus(profile, "transformed"))}>Bulk transform</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetMetadataStatus(profile, "dropped"))}>Bulk drop</Button>
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
              {mappingProfile.metadataMappings.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="uppercase tracking-[0.12em] text-muted">{item.field.replaceAll("_", " ")}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sourceValue}</TableCell>
                  <TableCell>
                    <Input
                      value={item.targetValue}
                      onChange={(event) => setMappingProfile((profile) => updateMetadataMapping(profile, item.id, { targetValue: event.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {(["mapped", "transformed", "dropped"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={actionButtonVariant(item.status === status)}
                          onClick={() => setMappingProfile((profile) => updateMetadataMapping(profile, item.id, { status }))}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Field recorder"
        title="Candidate review and overrides"
        description="Link, leave unresolved, or explicitly ignore production-audio candidates. Bulk actions update the exporter preview."
        aside={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetFieldRecorderDecision(profile, fieldRecorderCandidates, "linked"))}>Bulk link</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetFieldRecorderDecision(profile, fieldRecorderCandidates, "unresolved"))}>Bulk unresolved</Button>
            <Button size="sm" variant="subtle" onClick={() => setMappingProfile((profile) => bulkSetFieldRecorderDecision(profile, fieldRecorderCandidates, "ignored"))}>Bulk ignore</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {fieldRecorderCandidates.map((candidate) => {
            const decision = getFieldRecorderDecision(mappingProfile, candidate);
            const clip = clipEvents.find((clipEvent) => clipEvent.id === candidate.clipEventId);

            return (
              <div key={candidate.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{clip?.clipName ?? candidate.clipEventId}</p>
                      <Badge variant={overrideVariant(decision)}>{decision}</Badge>
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
                        variant={actionButtonVariant(decision === status)}
                        onClick={() => setMappingProfile((profile) => setFieldRecorderDecision(profile, candidate, status))}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Validation queue"
        title="Preservation issues from current mapping state"
        description={`${previewReport.intakeCompletenessSummary} ${previewReport.deliveryReadinessSummary}`}
        aside={<Badge variant={previewReport.highRiskCount > 0 ? "danger" : "accent"}>{previewReport.summary.totalFindings} findings</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">High risk</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewReport.highRiskCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Warnings</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewReport.warningCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Blocked</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewReport.blockedCount}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Operator decisions</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{previewReport.summary.operatorDecisionCount}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {highlightedIssues.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-border/70 bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{issue.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{issue.code} / {issue.scope.replaceAll("_", " ")}</p>
                </div>
                <Badge variant={issueVariant(issue)}>{issue.severity}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">{issue.recommendedAction}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
