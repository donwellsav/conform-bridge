import { countMappingReviews } from "./mapping-workflow";
import type {
  AnalysisReport,
  ClipEvent,
  DeliveryArtifact,
  FieldRecorderCandidate,
  MappingProfile,
  MappingRule,
  Marker,
  PreservationIssue,
  PreservationScope,
  SourceBundle,
  TranslationJob,
} from "./types";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function groupTitle(scope: PreservationScope) {
  switch (scope) {
    case "intake":
      return "Intake coverage";
    case "timeline":
      return "Timeline integrity";
    case "tracks":
      return "Track mapping";
    case "clips":
      return "Clip coverage";
    case "markers":
      return "Marker carryover";
    case "metadata":
      return "Metadata review";
    case "routing":
      return "Routing review";
    case "field_recorder":
      return "Field recorder review";
    case "delivery":
      return "Delivery blockers";
    case "reconform":
      return "ReConform review";
  }
}

function fieldRecorderArtifact(jobId: string, sequenceName: string) {
  return {
    id: `artifact-${slugify(jobId)}-field-recorder-report`,
    name: `${sequenceName.replaceAll(" ", "_")}_FIELD_RECORDER_REPORT.csv`,
  };
}

function uniqueIssues(issues: PreservationIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = [
      issue.code,
      issue.scope,
      issue.title,
      issue.sourceLocation,
      issue.targetArtifactId ?? "",
      issue.targetArtifactName ?? "",
      [...issue.affectedItems].sort().join("|"),
    ].join("::");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export interface ValidationContext {
  job: TranslationJob;
  sourceBundle: SourceBundle;
  clipEvents: ClipEvent[];
  markers: Marker[];
  exportArtifacts: DeliveryArtifact[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  mappingProfile: MappingProfile;
  mappingRules: MappingRule[];
  existingIssues: PreservationIssue[];
}

export function buildOperatorValidationIssues({
  job,
  sourceBundle,
  clipEvents,
  markers,
  exportArtifacts,
  fieldRecorderCandidates,
  mappingProfile,
  mappingRules,
  existingIssues,
}: ValidationContext) {
  const generatedIssues: PreservationIssue[] = [];
  const missingAssets = sourceBundle.assets.filter((asset) => asset.status === "missing");
  const missingExpectedFiles = missingAssets.filter((asset) => asset.fileRole !== "production_audio");
  const fieldRecorderArtifactRef = fieldRecorderArtifact(job.id, sourceBundle.sequenceName);
  const missingProductionAssets = [
    ...missingAssets
      .filter((asset) => asset.fileRole === "production_audio")
      .map((asset) => asset.name),
    ...fieldRecorderCandidates
      .filter((candidate) => candidate.status === "missing")
      .map((candidate) => candidate.candidateAssetName),
  ].filter((value, index, items) => items.indexOf(value) === index);
  const unresolvedMetadataClips = clipEvents.filter((clipEvent) =>
    !clipEvent.reel
    || !clipEvent.tape
    || !clipEvent.scene
    || !clipEvent.take,
  );
  const unresolvedSourceFiles = clipEvents.filter((clipEvent) =>
    !clipEvent.sourceFileName
    || clipEvent.sourceFileName === "unknown",
  );
  const blockedArtifacts = exportArtifacts.filter((artifact) => artifact.status === "blocked");
  const markerReviewCount = countMappingReviews(mappingProfile, mappingRules, fieldRecorderCandidates).markerReviewCount;

  missingExpectedFiles.forEach((asset, index) => {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-expected-${index + 1}`,
      jobId: job.id,
      category: "manual-review",
      severity: "warning",
      scope: "intake",
      code: "MISSING_EXPECTED_FILE",
      title: `${asset.name} is still missing from intake`,
      description: "The intake package still lacks an expected editorial or reference file after folder analysis completed.",
      sourceLocation: asset.name,
      impact: "Operators may be reviewing an incomplete turnover package.",
      recommendedAction: "Confirm whether the file is intentionally omitted or must be supplied before delivery sign-off.",
      requiresDecision: false,
      affectedItems: [asset.name],
    });
  });

  if (missingProductionAssets.length > 0) {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-production-audio`,
      jobId: job.id,
      category: "manual-review",
      severity: "critical",
      scope: "field_recorder",
      code: "MISSING_PRODUCTION_ROLL",
      title: "Production audio references remain unresolved",
      description: "One or more production rolls referenced by the canonical model or field recorder candidates are still missing from intake.",
      sourceLocation: "Production audio intake",
      impact: "Field recorder review and related delivery artifacts must remain blocked.",
      targetArtifactId: fieldRecorderArtifactRef.id,
      targetArtifactName: fieldRecorderArtifactRef.name,
      recommendedAction: "Add the missing roll(s) or decide which source events should remain offline before delivery planning is approved.",
      requiresDecision: true,
      affectedItems: missingProductionAssets,
    });
  }

  if (unresolvedMetadataClips.length > 0) {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-metadata`,
      jobId: job.id,
      category: "downgraded",
      severity: "warning",
      scope: "metadata",
      code: "UNRESOLVED_METADATA",
      title: "Canonical clip metadata still has unresolved reel, tape, scene, or take values",
      description: "Imported clips are present in the canonical model, but required field recorder and conform metadata is still incomplete.",
      sourceLocation: "Canonical clip metadata",
      impact: "Field recorder confidence drops and operator review remains necessary.",
      targetArtifactId: fieldRecorderArtifactRef.id,
      targetArtifactName: fieldRecorderArtifactRef.name,
      recommendedAction: "Review the metadata mapping table and fill or confirm unresolved slate fields before delivery sign-off.",
      requiresDecision: false,
      affectedItems: unresolvedMetadataClips.map((clipEvent) => clipEvent.clipName),
    });
  }

  if (unresolvedSourceFiles.length > 0) {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-source-file`,
      jobId: job.id,
      category: "manual-review",
      severity: "warning",
      scope: "clips",
      code: "UNRESOLVED_SOURCE_FILE",
      title: "Some canonical clip events still lack a resolved source file identity",
      description: "The canonical model contains clip events without a stable source file name, so file-level reconciliation and delivery traceability remain incomplete.",
      sourceLocation: "Canonical clip metadata",
      impact: "Operators may need to confirm the intended production source before relying on delivery metadata.",
      recommendedAction: "Review the metadata mapping table and reconcile source file identity before turnover sign-off.",
      requiresDecision: true,
      affectedItems: unresolvedSourceFiles.map((clipEvent) => clipEvent.clipName),
    });
  }

  if (blockedArtifacts.length > 0) {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-delivery-blocked`,
      jobId: job.id,
      category: "manual-review",
      severity: "critical",
      scope: "delivery",
      code: "DELIVERY_ARTIFACT_BLOCKED",
      title: "Delivery planning still contains blocked artifacts",
      description: "The delivery planner could not clear every planned artifact with the current canonical data and mapping decisions.",
      sourceLocation: "Exporter delivery plan",
      impact: "The planned Nuendo package is not ready for sign-off.",
      targetArtifactName: blockedArtifacts[0]?.fileName,
      recommendedAction: "Resolve the linked intake, metadata, or field recorder issues before approving the delivery package.",
      requiresDecision: true,
      affectedItems: blockedArtifacts.map((artifact) => artifact.fileName),
    });
  }

  if (markers.length === 0 && markerReviewCount > 0) {
    generatedIssues.push({
      id: `issue-${slugify(job.id)}-validation-marker-review`,
      jobId: job.id,
      category: "manual-review",
      severity: "info",
      scope: "markers",
      code: "MARKER_REVIEW_PENDING",
      title: "Marker review remains open without canonical marker coverage",
      description: "Marker mapping rules remain under review, but the canonical model does not currently carry marker events for this sequence.",
      sourceLocation: "Marker mapping editor",
      impact: "Marker delivery artifacts may remain placeholders until marker coverage is restored or intentionally suppressed.",
      recommendedAction: "Confirm whether marker delivery should stay disabled for this turnover.",
      requiresDecision: false,
      affectedItems: ["No canonical markers"],
    });
  }

  return uniqueIssues([...existingIssues, ...generatedIssues]);
}

export function rebuildAnalysisReport(
  report: AnalysisReport,
  sourceBundle: SourceBundle,
  clipEvents: ClipEvent[],
  markers: Marker[],
  exportArtifacts: DeliveryArtifact[],
  issues: PreservationIssue[],
  mappingProfile: MappingProfile,
  mappingRules: MappingRule[],
  fieldRecorderCandidates: FieldRecorderCandidate[],
): AnalysisReport {
  const dedupedIssues = uniqueIssues(issues);
  const mappingReviews = countMappingReviews(mappingProfile, mappingRules, fieldRecorderCandidates);
  const criticalCount = dedupedIssues.filter((issue) => issue.severity === "critical").length;
  const warningCount = dedupedIssues.filter((issue) => issue.severity === "warning").length;
  const infoCount = dedupedIssues.filter((issue) => issue.severity === "info").length;
  const blockedCount = exportArtifacts.filter((artifact) => artifact.status === "blocked").length;
  const missingIntakeCount = sourceBundle.assets.filter((asset) => asset.status === "missing").length;
  const groups = Object.values(
    dedupedIssues.reduce<Record<string, { id: string; title: string; scope: PreservationScope; findings: PreservationIssue[] }>>((collection, issue) => {
      if (!collection[issue.scope]) {
        collection[issue.scope] = {
          id: `group-${slugify(report.jobId)}-${issue.scope}`,
          title: groupTitle(issue.scope),
          scope: issue.scope,
          findings: [],
        };
      }

      collection[issue.scope].findings.push(issue);
      return collection;
    }, {}),
  );

  return {
    ...report,
    totals: {
      trackCount: report.totals.trackCount,
      clipCount: clipEvents.length,
      markerCount: markers.length,
      offlineAssetCount: clipEvents.filter((clipEvent) => clipEvent.isOffline).length,
    },
    highRiskCount: criticalCount,
    warningCount,
    blockedCount,
    intakeCompletenessSummary: missingIntakeCount > 0
      ? `${missingIntakeCount} intake file(s) are still missing from the turnover package.`
      : "All expected intake assets currently scanned for this job are present.",
    deliveryReadinessSummary: blockedCount > 0 || mappingReviews.total > 0
      ? `${blockedCount} delivery artifact(s) remain blocked and ${mappingReviews.total} mapping review item(s) still need operator attention.`
      : "Delivery planning is clear and no mapping review items remain open.",
    summary: {
      totalFindings: dedupedIssues.length,
      criticalCount,
      warningCount,
      infoCount,
      operatorDecisionCount: dedupedIssues.filter((issue) => issue.requiresDecision).length,
    },
    groups,
  };
}
