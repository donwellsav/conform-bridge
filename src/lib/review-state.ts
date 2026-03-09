import {
  countMappingReviews,
  getFieldRecorderDecision,
  getMarkerAction,
  setFieldRecorderDecision,
  setMarkerAction,
} from "./mapping-workflow";
import { prepareDeliveryExecutionSync } from "./services/delivery-execution";
import { createOverlayReviewInfluence, prepareDeliveryStagingSync } from "./services/delivery-staging";
import { planNuendoDeliverySync } from "./services/exporter";
import type {
  AnalysisReport,
  ClipEvent,
  ConformChangeEvent,
  DeliveryExecutionPlan,
  DeliveryStagingBundle,
  FieldRecorderCandidate,
  FieldRecorderReviewDecision,
  MappingProfile,
  MappingRule,
  Marker,
  MarkerReviewDecision,
  MetadataMappingOverride,
  OutputPreset,
  PreservationIssue,
  ReconformReviewDecision,
  ReconformReviewStatus,
  ReviewState,
  ReviewStateKey,
  SourceBundle,
  Timeline,
  Track,
  TrackMappingOverride,
  TranslationJob,
  TranslationModel,
  ValidationAcknowledgement,
  ValidationReviewStatus,
} from "./types";
import { buildOperatorValidationIssues, rebuildAnalysisReport } from "./validation";

export const REVIEW_STATE_VERSION = 1 as const;

export interface ReviewJobContext {
  job: TranslationJob;
  bundle: SourceBundle;
  translationModel: TranslationModel;
  timeline: Timeline;
  report: AnalysisReport;
  mappingProfile: MappingProfile;
  mappingRules: MappingRule[];
  markers: Marker[];
  clipEvents: ClipEvent[];
  tracks: Track[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  outputPreset: OutputPreset;
  preservationIssues: PreservationIssue[];
  conformChangeEvents: ConformChangeEvent[];
}

export interface ValidationReviewItem {
  issue: PreservationIssue;
  issueKey: string;
  status: ValidationReviewStatus;
  note: string;
  isOpen: boolean;
  isActionable: boolean;
}

export interface ReconformReviewItem {
  event: ConformChangeEvent;
  status: ReconformReviewStatus;
  note: string;
  isOpen: boolean;
  isRisky: boolean;
}

export interface ReviewOverlayResult {
  reviewState: ReviewState;
  effectiveMappingProfile: MappingProfile;
  effectiveMappingRules: MappingRule[];
  effectiveMarkers: Marker[];
  previewIssues: PreservationIssue[];
  validationItems: ValidationReviewItem[];
  previewReport: AnalysisReport;
  previewPlan: ReturnType<typeof planNuendoDeliverySync>;
  previewExecution: DeliveryExecutionPlan;
  previewStaging: DeliveryStagingBundle;
  reconformItems: ReconformReviewItem[];
  reviewCounts: {
    mappingOpenCount: number;
    validationOpenCount: number;
    validationAcknowledgedCount: number;
    validationDismissedCount: number;
    reconformOpenCount: number;
    reconformAcknowledgedCount: number;
    reconformNeedsFollowUpCount: number;
    totalOpenCount: number;
  };
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createReviewStateSourceSignature(job: TranslationJob, bundle: SourceBundle, timeline?: Timeline) {
  const assetSignature = [...bundle.assets]
    .map((asset) => `${asset.relativePath ?? asset.name}:${asset.fileRole}:${asset.status}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  return [
    bundle.id,
    bundle.folderPath ?? bundle.sequenceName,
    job.sourceSnapshot.revisionLabel,
    bundle.startTimecode,
    bundle.durationTimecode,
    bundle.trackCount,
    bundle.clipCount,
    bundle.markerCount,
    timeline?.durationFrames ?? bundle.durationFrames,
    assetSignature,
  ].join("::");
}

export function createReviewStateKey(jobId: string, sourceSignature: string): ReviewStateKey {
  return `${jobId}::${sourceSignature}`;
}

export function createEmptyReviewState(jobId: string, sourceSignature: string): ReviewState {
  return {
    version: REVIEW_STATE_VERSION,
    key: createReviewStateKey(jobId, sourceSignature),
    jobId,
    sourceSignature,
    trackOverrides: [],
    metadataOverrides: [],
    markerDecisions: [],
    fieldRecorderDecisions: [],
    validationAcknowledgements: [],
    reconformDecisions: [],
  };
}

export function buildValidationIssueKey(issue: PreservationIssue) {
  return [
    issue.jobId,
    issue.code,
    issue.scope,
    issue.sourceLocation,
    issue.targetArtifactId ?? "",
    issue.targetArtifactName ?? "",
    [...issue.affectedItems].sort().join("|"),
  ].join("::");
}

export function isValidationIssueActionable(issue: PreservationIssue) {
  return issue.requiresDecision || issue.severity !== "info";
}

function mergeTrackMappingOverride(
  baseProfile: MappingProfile,
  reviewState: ReviewState,
  mappingId: string,
  patch: Partial<TrackMappingOverride>,
) {
  const baseMapping = baseProfile.trackMappings.find((track) => track.id === mappingId);
  if (!baseMapping) {
    return reviewState;
  }

  const currentOverride = reviewState.trackOverrides.find((override) => override.mappingId === mappingId);
  const effective = {
    targetLane: patch.targetLane ?? currentOverride?.targetLane ?? baseMapping.targetLane,
    targetType: patch.targetType ?? currentOverride?.targetType ?? baseMapping.targetType,
    action: patch.action ?? currentOverride?.action ?? baseMapping.action,
  };
  const nextOverrides = reviewState.trackOverrides.filter((override) => override.mappingId !== mappingId);

  if (
    effective.targetLane === baseMapping.targetLane
    && effective.targetType === baseMapping.targetType
    && effective.action === baseMapping.action
  ) {
    return {
      ...reviewState,
      trackOverrides: nextOverrides,
    };
  }

  return {
    ...reviewState,
    trackOverrides: [
      ...nextOverrides,
      {
        mappingId,
        targetLane: effective.targetLane === baseMapping.targetLane ? undefined : effective.targetLane,
        targetType: effective.targetType === baseMapping.targetType ? undefined : effective.targetType,
        action: effective.action === baseMapping.action ? undefined : effective.action,
      },
    ],
  };
}

function mergeMetadataMappingOverride(
  baseProfile: MappingProfile,
  reviewState: ReviewState,
  mappingId: string,
  patch: Partial<MetadataMappingOverride>,
) {
  const baseMapping = baseProfile.metadataMappings.find((mapping) => mapping.id === mappingId);
  if (!baseMapping) {
    return reviewState;
  }

  const currentOverride = reviewState.metadataOverrides.find((override) => override.mappingId === mappingId);
  const effective = {
    targetValue: patch.targetValue ?? currentOverride?.targetValue ?? baseMapping.targetValue,
    status: patch.status ?? currentOverride?.status ?? baseMapping.status,
  };
  const nextOverrides = reviewState.metadataOverrides.filter((override) => override.mappingId !== mappingId);

  if (effective.targetValue === baseMapping.targetValue && effective.status === baseMapping.status) {
    return {
      ...reviewState,
      metadataOverrides: nextOverrides,
    };
  }

  return {
    ...reviewState,
    metadataOverrides: [
      ...nextOverrides,
      {
        mappingId,
        targetValue: effective.targetValue === baseMapping.targetValue ? undefined : effective.targetValue,
        status: effective.status === baseMapping.status ? undefined : effective.status,
      },
    ],
  };
}

function mergeMarkerDecision(
  baseRules: MappingRule[],
  markers: Marker[],
  reviewState: ReviewState,
  markerId: string,
  patch: Partial<MarkerReviewDecision>,
) {
  const marker = markers.find((candidate) => candidate.id === markerId);
  if (!marker) {
    return reviewState;
  }

  const baseAction = getMarkerAction(baseRules, marker);
  const currentDecision = reviewState.markerDecisions.find((decision) => decision.markerId === markerId);
  const action = patch.action ?? currentDecision?.action ?? baseAction;
  const note = patch.note ?? currentDecision?.note ?? "";
  const nextDecisions = reviewState.markerDecisions.filter((decision) => decision.markerId !== markerId);

  if (action === baseAction && note.trim().length === 0) {
    return {
      ...reviewState,
      markerDecisions: nextDecisions,
    };
  }

  return {
    ...reviewState,
    markerDecisions: [
      ...nextDecisions,
      {
        markerId,
        action,
        note,
      },
    ],
  };
}

function mergeFieldRecorderDecision(
  baseProfile: MappingProfile,
  reviewState: ReviewState,
  candidates: FieldRecorderCandidate[],
  candidateId: string,
  patch: Partial<FieldRecorderReviewDecision>,
) {
  const candidate = candidates.find((item) => item.id === candidateId);
  if (!candidate) {
    return reviewState;
  }

  const defaultStatus = getFieldRecorderDecision(baseProfile, candidate);
  const currentDecision = reviewState.fieldRecorderDecisions.find((decision) => decision.candidateId === candidateId);
  const status = patch.status ?? currentDecision?.status ?? defaultStatus;
  const note = patch.note ?? currentDecision?.note ?? "";
  const nextDecisions = reviewState.fieldRecorderDecisions.filter((decision) => decision.candidateId !== candidateId);

  if (status === defaultStatus && note.trim().length === 0) {
    return {
      ...reviewState,
      fieldRecorderDecisions: nextDecisions,
    };
  }

  return {
    ...reviewState,
    fieldRecorderDecisions: [
      ...nextDecisions,
      {
        candidateId,
        status,
        note,
      },
    ],
  };
}

function mergeValidationAcknowledgement(
  reviewState: ReviewState,
  issue: PreservationIssue,
  patch: Partial<ValidationAcknowledgement>,
) {
  const issueKey = buildValidationIssueKey(issue);
  const current = reviewState.validationAcknowledgements.find((item) => item.issueKey === issueKey);
  const status = patch.status ?? current?.status ?? "unreviewed";
  const note = patch.note ?? current?.note ?? "";
  const nextItems = reviewState.validationAcknowledgements.filter((item) => item.issueKey !== issueKey);

  if (status === "unreviewed" && note.trim().length === 0) {
    return {
      ...reviewState,
      validationAcknowledgements: nextItems,
    };
  }

  return {
    ...reviewState,
    validationAcknowledgements: [
      ...nextItems,
      {
        issueKey,
        status,
        note,
      },
    ],
  };
}

function mergeReconformDecision(
  reviewState: ReviewState,
  changeEventId: string,
  patch: Partial<ReconformReviewDecision>,
) {
  const current = reviewState.reconformDecisions.find((item) => item.changeEventId === changeEventId);
  const status = patch.status ?? current?.status ?? "unreviewed";
  const note = patch.note ?? current?.note ?? "";
  const nextItems = reviewState.reconformDecisions.filter((item) => item.changeEventId !== changeEventId);

  if (status === "unreviewed" && note.trim().length === 0) {
    return {
      ...reviewState,
      reconformDecisions: nextItems,
    };
  }

  return {
    ...reviewState,
    reconformDecisions: [
      ...nextItems,
      {
        changeEventId,
        status,
        note,
      },
    ],
  };
}

export function applyTrackOverride(
  reviewState: ReviewState,
  baseProfile: MappingProfile,
  mappingId: string,
  patch: Partial<TrackMappingOverride>,
) {
  return mergeTrackMappingOverride(baseProfile, reviewState, mappingId, patch);
}

export function clearTrackOverride(reviewState: ReviewState, mappingId: string) {
  return {
    ...reviewState,
    trackOverrides: reviewState.trackOverrides.filter((override) => override.mappingId !== mappingId),
  };
}

export function applyMetadataOverride(
  reviewState: ReviewState,
  baseProfile: MappingProfile,
  mappingId: string,
  patch: Partial<MetadataMappingOverride>,
) {
  return mergeMetadataMappingOverride(baseProfile, reviewState, mappingId, patch);
}

export function clearMetadataOverride(reviewState: ReviewState, mappingId: string) {
  return {
    ...reviewState,
    metadataOverrides: reviewState.metadataOverrides.filter((override) => override.mappingId !== mappingId),
  };
}

export function applyMarkerReviewDecision(
  reviewState: ReviewState,
  baseRules: MappingRule[],
  markers: Marker[],
  markerId: string,
  patch: Partial<MarkerReviewDecision>,
) {
  return mergeMarkerDecision(baseRules, markers, reviewState, markerId, patch);
}

export function clearMarkerReviewDecision(reviewState: ReviewState, markerId: string) {
  return {
    ...reviewState,
    markerDecisions: reviewState.markerDecisions.filter((decision) => decision.markerId !== markerId),
  };
}

export function applyFieldRecorderReviewDecision(
  reviewState: ReviewState,
  baseProfile: MappingProfile,
  candidates: FieldRecorderCandidate[],
  candidateId: string,
  patch: Partial<FieldRecorderReviewDecision>,
) {
  return mergeFieldRecorderDecision(baseProfile, reviewState, candidates, candidateId, patch);
}

export function clearFieldRecorderReviewDecision(reviewState: ReviewState, candidateId: string) {
  return {
    ...reviewState,
    fieldRecorderDecisions: reviewState.fieldRecorderDecisions.filter((decision) => decision.candidateId !== candidateId),
  };
}

export function applyValidationReviewDecision(
  reviewState: ReviewState,
  issue: PreservationIssue,
  patch: Partial<ValidationAcknowledgement>,
) {
  return mergeValidationAcknowledgement(reviewState, issue, patch);
}

export function clearValidationReviewDecision(reviewState: ReviewState, issue: PreservationIssue) {
  const issueKey = buildValidationIssueKey(issue);
  return {
    ...reviewState,
    validationAcknowledgements: reviewState.validationAcknowledgements.filter((item) => item.issueKey !== issueKey),
  };
}

export function applyReconformReviewDecision(
  reviewState: ReviewState,
  changeEventId: string,
  patch: Partial<ReconformReviewDecision>,
) {
  return mergeReconformDecision(reviewState, changeEventId, patch);
}

export function clearReconformReviewDecision(reviewState: ReviewState, changeEventId: string) {
  return {
    ...reviewState,
    reconformDecisions: reviewState.reconformDecisions.filter((item) => item.changeEventId !== changeEventId),
  };
}

export function resetReviewState(reviewState: ReviewState) {
  return createEmptyReviewState(reviewState.jobId, reviewState.sourceSignature);
}

export function hasTrackOverride(reviewState: ReviewState, mappingId: string) {
  return reviewState.trackOverrides.some((override) => override.mappingId === mappingId);
}

export function hasMetadataOverride(reviewState: ReviewState, mappingId: string) {
  return reviewState.metadataOverrides.some((override) => override.mappingId === mappingId);
}

export function getMarkerReviewDecision(reviewState: ReviewState, markerId: string) {
  return reviewState.markerDecisions.find((decision) => decision.markerId === markerId);
}

export function getFieldRecorderReviewDecision(reviewState: ReviewState, candidateId: string) {
  return reviewState.fieldRecorderDecisions.find((decision) => decision.candidateId === candidateId);
}

export function getValidationAcknowledgement(reviewState: ReviewState, issue: PreservationIssue) {
  const issueKey = buildValidationIssueKey(issue);
  return reviewState.validationAcknowledgements.find((item) => item.issueKey === issueKey);
}

export function getReconformReviewDecision(reviewState: ReviewState, changeEventId: string) {
  return reviewState.reconformDecisions.find((item) => item.changeEventId === changeEventId);
}

function overlayMappingProfile(
  baseProfile: MappingProfile,
  reviewState: ReviewState,
  fieldRecorderCandidates: FieldRecorderCandidate[],
) {
  let nextProfile: MappingProfile = {
    ...baseProfile,
    trackMappings: baseProfile.trackMappings.map((track) => ({ ...track })),
    metadataMappings: baseProfile.metadataMappings.map((mapping) => ({ ...mapping })),
    fieldRecorderOverrides: [...baseProfile.fieldRecorderOverrides],
  };

  reviewState.trackOverrides.forEach((override) => {
    nextProfile.trackMappings = nextProfile.trackMappings.map((track) =>
      track.id === override.mappingId
        ? {
            ...track,
            targetLane: override.targetLane ?? track.targetLane,
            targetType: override.targetType ?? track.targetType,
            action: override.action ?? track.action,
          }
        : track,
    );
  });

  reviewState.metadataOverrides.forEach((override) => {
    nextProfile.metadataMappings = nextProfile.metadataMappings.map((mapping) =>
      mapping.id === override.mappingId
        ? {
            ...mapping,
            targetValue: override.targetValue ?? mapping.targetValue,
            status: override.status ?? mapping.status,
          }
        : mapping,
    );
  });

  nextProfile = reviewState.fieldRecorderDecisions.reduce((profile, decision) => {
    const candidate = fieldRecorderCandidates.find((item) => item.id === decision.candidateId);
    return candidate ? setFieldRecorderDecision(profile, candidate, decision.status) : profile;
  }, nextProfile);

  return nextProfile;
}

function overlayMappingRules(
  baseRules: MappingRule[],
  reviewState: ReviewState,
  markers: Marker[],
  jobId: string,
) {
  return reviewState.markerDecisions.reduce((rules, decision) => {
    const marker = markers.find((item) => item.id === decision.markerId);
    if (!marker) {
      return rules;
    }

    const nextRules = setMarkerAction(rules, jobId, marker, decision.action);
    if (decision.note.trim().length === 0) {
      return nextRules;
    }

    return nextRules.map((rule) =>
      rule.scope === "marker" && rule.source === marker.id
        ? {
            ...rule,
            note: `${rule.note} Operator note: ${decision.note}`.trim(),
          }
        : rule,
    );
  }, [...baseRules]);
}

function buildValidationItems(issues: PreservationIssue[], reviewState: ReviewState): ValidationReviewItem[] {
  return issues.map((issue) => {
    const acknowledgement = getValidationAcknowledgement(reviewState, issue);
    const status = acknowledgement?.status ?? "unreviewed";
    const isActionable = isValidationIssueActionable(issue);

    return {
      issue,
      issueKey: buildValidationIssueKey(issue),
      status,
      note: acknowledgement?.note ?? "",
      isOpen: isActionable && status === "unreviewed",
      isActionable,
    };
  });
}

function buildReconformItems(events: ConformChangeEvent[], reviewState: ReviewState): ReconformReviewItem[] {
  return events.map((event) => {
    const decision = getReconformReviewDecision(reviewState, event.id);
    const status = decision?.status ?? "unreviewed";
    const note = decision?.note ?? "";
    const isRisky = event.changeType === "delete" || event.changeType === "replace" || event.changeType === "move";

    return {
      event,
      status,
      note,
      isOpen: status !== "acknowledged",
      isRisky,
    };
  });
}

export function buildReviewOverlay(context: ReviewJobContext, reviewState: ReviewState): ReviewOverlayResult {
  const effectiveMappingProfile = overlayMappingProfile(context.mappingProfile, reviewState, context.fieldRecorderCandidates);
  const effectiveMappingRules = overlayMappingRules(context.mappingRules, reviewState, context.markers, context.job.id);
  const effectiveMarkers = context.markers.filter((marker) => getMarkerAction(effectiveMappingRules, marker) !== "ignore");
  const previewReportSeed: AnalysisReport = {
    ...context.report,
    totals: {
      ...context.report.totals,
      trackCount: effectiveMappingProfile.trackMappings.filter((track) => track.action !== "ignore").length,
      markerCount: effectiveMarkers.length,
    },
  };
  const provisionalPlan = planNuendoDeliverySync(
    context.job,
    context.translationModel,
    context.outputPreset,
    previewReportSeed,
    effectiveMappingProfile,
    context.preservationIssues,
  );
  const previewIssues = buildOperatorValidationIssues({
    job: context.job,
    sourceBundle: context.bundle,
    clipEvents: context.clipEvents,
    markers: effectiveMarkers,
    exportArtifacts: provisionalPlan.exportArtifacts,
    fieldRecorderCandidates: context.fieldRecorderCandidates,
    mappingProfile: effectiveMappingProfile,
    mappingRules: effectiveMappingRules,
    existingIssues: context.preservationIssues.filter((issue) => issue.code !== "DELIVERY_ARTIFACT_BLOCKED"),
  });
  const previewReport = rebuildAnalysisReport(
    previewReportSeed,
    context.bundle,
    context.clipEvents,
    effectiveMarkers,
    provisionalPlan.exportArtifacts,
    previewIssues,
    effectiveMappingProfile,
    effectiveMappingRules,
    context.fieldRecorderCandidates,
  );
  const previewPlan = planNuendoDeliverySync(
    context.job,
    context.translationModel,
    context.outputPreset,
    previewReport,
    effectiveMappingProfile,
    previewIssues,
  );
  const validationItems = buildValidationItems(previewIssues, reviewState);
  const reconformItems = buildReconformItems(context.conformChangeEvents, reviewState);
  const mappingReviewSummary = countMappingReviews(effectiveMappingProfile, effectiveMappingRules, context.fieldRecorderCandidates);
  const validationOpenCount = validationItems.filter((item) => item.isOpen).length;
  const validationAcknowledgedCount = validationItems.filter((item) => item.status === "acknowledged").length;
  const validationDismissedCount = validationItems.filter((item) => item.status === "dismissed").length;
  const reconformOpenCount = reconformItems.filter((item) => item.isOpen).length;
  const reconformAcknowledgedCount = reconformItems.filter((item) => item.status === "acknowledged").length;
  const reconformNeedsFollowUpCount = reconformItems.filter((item) => item.status === "needs-follow-up").length;
  const previewJob: TranslationJob = {
    ...context.job,
    status: previewPlan.exportArtifacts.some((artifact) => artifact.status === "blocked")
      || previewReport.highRiskCount > 0
      || mappingReviewSummary.total > 0
      ? "attention"
      : "ready",
    priority: previewReport.highRiskCount > 0
      ? "high"
      : mappingReviewSummary.total > 0 || previewReport.warningCount > 0
        ? "normal"
        : "low",
    analysisReportId: previewReport.id,
    mappingSnapshot: {
      mappedTrackCount: effectiveMappingProfile.trackMappings.filter((track) => track.action !== "ignore").length,
      preservedMetadataCount: effectiveMappingProfile.metadataMappings.filter((mapping) => mapping.status === "mapped").length,
      unresolvedCount: mappingReviewSummary.total,
      fieldRecorderLinkedCount: context.fieldRecorderCandidates.filter((candidate) =>
        getFieldRecorderDecision(effectiveMappingProfile, candidate) === "linked",
      ).length,
    },
  };
  const previewExecution = prepareDeliveryExecutionSync({
    job: previewJob,
    bundle: context.bundle,
    translationModel: context.translationModel,
    timelineName: context.timeline.name,
    tracks: context.tracks,
    clipEvents: context.clipEvents,
    markers: effectiveMarkers,
    analysisReport: previewReport,
    mappingProfile: effectiveMappingProfile,
    fieldRecorderCandidates: context.fieldRecorderCandidates,
    preservationIssues: previewIssues,
    deliveryPackage: previewPlan.deliveryPackage,
    exportArtifacts: previewPlan.exportArtifacts,
  });
  const previewStaging = prepareDeliveryStagingSync({
    job: previewJob,
    bundle: context.bundle,
    deliveryPackage: previewPlan.deliveryPackage,
    exportArtifacts: previewPlan.exportArtifacts,
    executionPlan: previewExecution,
    preservationIssues: previewIssues,
    sourceSignature: reviewState.sourceSignature,
    reviewInfluence: createOverlayReviewInfluence({
      hasSavedState: reviewState.trackOverrides.length > 0
        || reviewState.metadataOverrides.length > 0
        || reviewState.markerDecisions.length > 0
        || reviewState.fieldRecorderDecisions.length > 0
        || reviewState.validationAcknowledgements.length > 0
        || reviewState.reconformDecisions.length > 0,
      operatorEditedCount: reviewState.trackOverrides.length
        + reviewState.metadataOverrides.length
        + reviewState.markerDecisions.length
        + reviewState.fieldRecorderDecisions.length,
      validationAcknowledgedCount,
      validationDismissedCount,
      reconformReviewedCount: reconformAcknowledgedCount + reconformNeedsFollowUpCount,
      openReviewCount: mappingReviewSummary.total + validationOpenCount + reconformOpenCount,
    }),
  });

  return {
    reviewState,
    effectiveMappingProfile,
    effectiveMappingRules,
    effectiveMarkers,
    previewIssues,
    validationItems,
    previewReport,
    previewPlan,
    previewExecution,
    previewStaging,
    reconformItems,
    reviewCounts: {
      mappingOpenCount: mappingReviewSummary.total,
      validationOpenCount,
      validationAcknowledgedCount,
      validationDismissedCount,
      reconformOpenCount,
      reconformAcknowledgedCount,
      reconformNeedsFollowUpCount,
      totalOpenCount: mappingReviewSummary.total + validationOpenCount + reconformOpenCount,
    },
  };
}

export function buildReviewSummaryLabel(result: ReviewOverlayResult) {
  return [
    `${result.reviewCounts.mappingOpenCount} mapping open`,
    `${result.reviewCounts.validationOpenCount} validation open`,
    `${result.reviewCounts.reconformOpenCount} reconform open`,
  ].join(" / ");
}

export function buildReviewStateFileName(job: TranslationJob) {
  return `${slugify(job.jobCode || job.id)}-review-state.json`;
}
