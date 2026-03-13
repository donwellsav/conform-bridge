import type {
  AnalysisReport,
  ClipEvent,
  DeliveryExecutionPlan,
  FixtureMatrixEntry,
  FixtureMatrixFieldRecorderState,
  FixtureMatrixReport,
  SourceBundle,
  Track,
  TranslationJob,
  TranslationModel,
} from "./types";

const REAL_FIXTURE_IDS = ["r2n-test-1", "r2n-test-2", "r2n-test-3", "r2n-test-4"] as const;
const MATRIX_GENERATED_ON = "2026-03-13";
const MATRIX_PHASE = "Phase 4A";

const FIELD_RECORDER_OVERRIDES: Record<string, { scope: FixtureMatrixEntry["fieldRecorder"]["scope"]; strongestObservedState: FixtureMatrixFieldRecorderState; note: string }> = {
  "r2n-test-1": {
    scope: "guarded-private-optional",
    strongestObservedState: "candidate-only",
    note: "Guarded private regression reached candidate-only relink evidence on three rolls, but no confident relink because usable source TC still came from editorial CSV.",
  },
  "r2n-test-2": {
    scope: "guarded-private-optional",
    strongestObservedState: "candidate-only",
    note: "Guarded private regression reached stronger candidate-only interview-roll evidence than sample 1, but direct WAV metadata still did not prove a confident relink.",
  },
  "r2n-test-3": {
    scope: "editorial-baseline-only",
    strongestObservedState: "out-of-scope",
    note: "This sample is an editorial baseline only. Field-recorder counts remain visible, but they are not treated as acceptance proof for this fixture.",
  },
  "r2n-test-4": {
    scope: "multichannel-baseline-only",
    strongestObservedState: "out-of-scope",
    note: "This sample is a Fairlight multichannel baseline only. Field-recorder output remains out of scope for acceptance on this fixture.",
  },
};

const MATRIX_FINDING_CODES = new Set([
  "PRIMARY_STRUCTURED_SOURCE_SELECTED",
  "SECONDARY_TIMELINE_SOURCE_MISMATCH",
  "TIMELINE_METADATA_MISMATCH",
  "TIMELINE_EDL_MISMATCH",
  "MARKER_COUNT_MISMATCH",
  "SOURCE_FILE_MISSING_FROM_INTAKE",
  "AAF_DIRECT_PARSE_UNSUPPORTED",
  "AAF_ADAPTER_FALLBACK",
  "AAF_TRACK_COUNT_MISMATCH",
  "AAF_CLIP_COUNT_MISMATCH",
  "AAF_CLIP_TIMING_MISMATCH",
  "AAF_SOURCE_CLIP_MISMATCH",
  "AAF_SOURCE_FILE_MISMATCH",
  "AAF_REEL_TAPE_MISMATCH",
  "AAF_MARKER_COVERAGE_MISMATCH",
  "AAF_EXPECTED_MEDIA_MISSING",
]);

function fixtureIdFromJob(jobId: string) {
  return jobId.replace(/^job-/, "");
}

function compareUndefinedLast(left?: string, right?: string) {
  return (left ?? "\uffff").localeCompare(right ?? "\uffff");
}

function summarizeFieldRecorderState(counts: Record<string, number>): FixtureMatrixFieldRecorderState {
  const linked = counts.linked ?? 0;
  const candidate = counts.candidate ?? 0;
  const insufficient = counts.insufficient_metadata ?? 0;
  const missing = counts.missing ?? 0;

  if (linked > 0 && candidate === 0 && insufficient === 0 && missing === 0) {
    return "confident-linked";
  }

  if (candidate > 0 && linked === 0 && insufficient === 0) {
    return missing > 0 ? "candidate-only" : "mixed";
  }

  if (candidate === 0 && linked === 0 && insufficient === 0 && missing > 0) {
    return "missing-only";
  }

  return "mixed";
}

function summarizeMultichannelObservations(tracks: Track[], clipEvents: ClipEvent[]): FixtureMatrixEntry["multichannelObservations"] {
  const observations: FixtureMatrixEntry["multichannelObservations"] = [];
  const seen = new Set<string>();

  tracks
    .filter((track) => track.channelLayout !== "mono" && track.channelLayout !== "stereo")
    .sort((left, right) => left.index - right.index || left.name.localeCompare(right.name))
    .forEach((track) => {
      const key = `track:${track.name}:${track.channelLayout}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      observations.push({
        trackName: track.name,
        role: track.role,
        channelLayout: track.channelLayout,
        note: `Track ${track.name} preserves ${track.channelLayout} routing.`,
      });
    });

  clipEvents
    .filter((clipEvent) =>
      (clipEvent.channelCount ?? 0) > 2
      || clipEvent.channelLayout === "poly_4"
      || clipEvent.channelLayout === "poly_8"
      || clipEvent.channelLayout === "5.1"
      || clipEvent.channelLayout === "lcr",
    )
    .sort((left, right) =>
      left.clipName.localeCompare(right.clipName)
      || compareUndefinedLast(left.sourceFileName, right.sourceFileName),
    )
    .forEach((clipEvent) => {
      const key = `clip:${clipEvent.clipName}:${clipEvent.sourceFileName ?? ""}:${clipEvent.channelLayout}:${clipEvent.channelCount}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      observations.push({
        clipName: clipEvent.clipName,
        channelCount: clipEvent.channelCount,
        channelLayout: clipEvent.channelLayout,
        note: `Clip ${clipEvent.clipName} preserves ${clipEvent.channelCount}ch ${clipEvent.channelLayout}.`,
      });
    });

  if (observations.length === 0) {
    observations.push({
      note: "No multichannel clip evidence was preserved from the lightweight interchange sources on this sample.",
    });
  }

  return observations;
}

function buildMajorFindings(report: AnalysisReport) {
  return report.groups
    .flatMap((group) => group.findings)
    .filter((finding) => MATRIX_FINDING_CODES.has(finding.code))
    .map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      title: finding.title,
    }))
    .sort((left, right) => left.code.localeCompare(right.code));
}

function buildFieldRecorderSummary(fixtureId: string, counts: Record<string, number>): FixtureMatrixEntry["fieldRecorder"] {
  const override = FIELD_RECORDER_OVERRIDES[fixtureId];

  if (override) {
    return {
      scope: override.scope,
      strongestObservedState: override.strongestObservedState,
      counts,
      note: override.note,
    };
  }

  return {
    scope: "guarded-private-optional",
    strongestObservedState: summarizeFieldRecorderState(counts),
    counts,
    note: "No sample-specific field-recorder override is registered for this fixture.",
  };
}

export function buildFixtureMatrixReport(input: {
  jobs: TranslationJob[];
  translationModels: TranslationModel[];
  sourceBundles: SourceBundle[];
  analysisReports: AnalysisReport[];
  deliveryExecutionPlans: DeliveryExecutionPlan[];
  tracks: Track[];
  clipEvents: ClipEvent[];
  fieldRecorderCandidates: Array<{
    jobId: string;
    status: string;
  }>;
}): FixtureMatrixReport {
  const bundleMap = new Map(input.sourceBundles.map((bundle) => [bundle.id, bundle]));
  const reportMap = new Map(input.analysisReports.map((report) => [report.id, report]));
  const executionPlanMap = new Map(input.deliveryExecutionPlans.map((plan) => [plan.jobId, plan]));
  const translationModelMap = new Map(input.translationModels.map((model) => [model.id, model]));
  const realJobs = new Map(
    input.jobs
      .filter((job) => REAL_FIXTURE_IDS.includes(fixtureIdFromJob(job.id) as (typeof REAL_FIXTURE_IDS)[number]))
      .map((job) => [fixtureIdFromJob(job.id), job] as const),
  );

  const entries = REAL_FIXTURE_IDS.flatMap((fixtureId): FixtureMatrixEntry[] => {
    const job = realJobs.get(fixtureId);
    if (!job) {
      return [];
    }

    const bundle = bundleMap.get(job.sourceBundleId);
    const report = reportMap.get(job.analysisReportId);
    const executionPlan = executionPlanMap.get(job.id);
    const translationModel = translationModelMap.get(job.translationModelId);
    if (!bundle || !report || !executionPlan || !translationModel) {
      return [];
    }

    const timelineId = translationModel.primaryTimelineId;
    const jobTracks = input.tracks.filter((track) => track.timelineId === timelineId);
    const jobClipEvents = input.clipEvents.filter((clipEvent) => clipEvent.timelineId === timelineId);
    const fieldRecorderCounts = input.fieldRecorderCandidates
      .filter((candidate) => candidate.jobId === job.id)
      .reduce<Record<string, number>>((counts, candidate) => {
        counts[candidate.status] = (counts[candidate.status] ?? 0) + 1;
        return counts;
      }, {});

    return [{
      fixtureId,
      jobId: job.id,
      timelineName: bundle.sequenceName,
      authoritativeStructuredSource: job.sourceSnapshot.primaryStructuredSource ?? "metadata",
      secondaryStructuredSource: job.sourceSnapshot.secondaryStructuredSource,
      sourceArbitrationReason: job.sourceSnapshot.structuredSourceReason ?? "No structured-source arbitration reason was recorded.",
      aaf: {
        role: job.sourceSnapshot.aafRole ?? "not_present",
        intakeStatus: job.sourceSnapshot.aafIntakeStatus ?? "not_present",
        containerKind: job.sourceSnapshot.aafContainerKind,
        directCoverage: job.sourceSnapshot.aafDirectCoverage,
        reason: job.sourceSnapshot.aafRoleReason ?? "AAF was not present in this sample.",
        diagnostics: [...(job.sourceSnapshot.aafDiagnostics ?? [])],
      },
      counts: {
        tracks: bundle.trackCount,
        clips: bundle.clipCount,
        markers: bundle.markerCount,
      },
      multichannelObservations: summarizeMultichannelObservations(jobTracks, jobClipEvents),
      fieldRecorder: buildFieldRecorderSummary(fixtureId, fieldRecorderCounts),
      deliveryExecution: {
        generated: executionPlan.generatedCount,
        deferred: executionPlan.deferredCount,
        unavailable: executionPlan.preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").length,
      },
      majorFindings: buildMajorFindings(report),
    }];
  });

  return {
    phase: MATRIX_PHASE,
    generatedOn: MATRIX_GENERATED_ON,
    fixtureIds: [...REAL_FIXTURE_IDS],
    entries,
  };
}
