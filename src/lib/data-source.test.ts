import { existsSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";

import * as dataSource from "./data-source";
import { setFieldRecorderDecision } from "./mapping-workflow";
import {
  getKnownPrivateFixtureCompanionNames,
  isLargeMediaOptInEnabled,
  isPrivateSampleTargetSelected,
} from "./private-fixture-guards";
import { planNuendoDeliverySync } from "./services/exporter";

const privateAudioFileNames = [
  "230407_002.WAV",
  "F2-BT_002.WAV",
  "F2_002.WAV",
];
const secondPrivateCompanionNames = new Set(getKnownPrivateFixtureCompanionNames("r2n-test-2"));
const thirdPrivateCompanionNames = new Set(getKnownPrivateFixtureCompanionNames("r2n-test-3"));
const fourthPrivateCompanionNames = new Set(getKnownPrivateFixtureCompanionNames("r2n-test-4"));
const secondLightweightExpectation = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures", "expectations", "r2n-test-2", "expected-lightweight.json"), "utf8"),
) as {
  structuredSource: {
    primary: string;
    secondary?: string;
    reason: string;
    aafIntakeStatus: string;
  };
  deliveryExecution: {
    generatedCount: number;
    deferredCount: number;
    unavailableCount: number;
    artifactStatuses: Array<{
      fileName: string;
      executionStatus: string;
    }>;
  };
};
const thirdLightweightExpectation = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures", "expectations", "r2n-test-3", "expected-lightweight.json"), "utf8"),
) as {
  structuredSource: {
    primary: string;
    secondary?: string;
    reason: string;
    aafIntakeStatus: string;
  };
  fieldRecorder: {
    counts: Record<string, number>;
  };
  deliveryExecution: {
    generatedCount: number;
    deferredCount: number;
    unavailableCount: number;
    artifactStatuses: Array<{
      fileName: string;
      executionStatus: string;
    }>;
  };
};
const fourthLightweightExpectation = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures", "expectations", "r2n-test-4", "expected-lightweight.json"), "utf8"),
) as {
  structuredSource: {
    primary: string;
    secondary?: string;
    reason: string;
    aafIntakeStatus: string;
  };
  fieldRecorder: {
    counts: Record<string, number>;
  };
  deliveryExecution: {
    generatedCount: number;
    deferredCount: number;
    unavailableCount: number;
    artifactStatuses: Array<{
      fileName: string;
      executionStatus: string;
    }>;
  };
  audioStructure: {
    multichannelClips: Array<{
      clipName: string;
      channelCount?: number;
      channelLayout?: string;
      sourceFileName?: string;
    }>;
  };
};
const privateAudioPresent = privateAudioFileNames.every((fileName) =>
  existsSync(resolve(process.cwd(), "fixtures", "intake", "r2n-test-1", fileName))
);
const runPrivateSample = isLargeMediaOptInEnabled();
const secondPrivateAudioPaths = [
  "OMO/INTERVIEW/AUDIO/A-002.WAV",
  "OMO/INTERVIEW/AUDIO/A-005.WAV",
  "OMO/INTERVIEW/AUDIO/A-007.WAV",
  "OMO/INTERVIEW/AUDIO/A-008.WAV",
  "OMO/MUSIC/ONE MIN SOUNDTRACK.wav",
];
const secondPrivateSamplePresent = secondPrivateAudioPaths.every((relativePath) =>
  existsSync(resolve(process.cwd(), "fixtures", "intake", "r2n-test-2", relativePath))
);
const secondPrivateExpectation = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures", "expectations", "r2n-test-2", "expected-local-private.json"), "utf8"),
) as {
  productionAudio: Array<{
    name: string;
    hasIXml: boolean;
  }>;
  fieldRecorder: {
    counts: Record<string, number>;
    candidates: Array<{
      status: string;
      candidateAssetName: string;
      clipName: string;
    }>;
  };
};

test("imported fixture data flows through exporter planning into dashboard and job selectors", () => {
  assert.equal(dataSource.dataMode, "imported");
  assert.ok(dataSource.jobs.length >= 8);

  const job = dataSource.getJob("job-rvr-203-r3") ?? dataSource.jobs[0];
  assert.ok(job);

  const deliveryPackage = dataSource.getDeliveryPackage(job.deliveryPackageId);
  const executionPlan = dataSource.getDeliveryExecutionPlan(job.id);
  const externalExecutionPackage = dataSource.getExternalExecutionPackage(job.id);
  const executorCompatibilityBundle = dataSource.getExecutorCompatibilityBundle(job.id);
  const writerAdapterBundle = dataSource.getWriterAdapterBundle(job.id);
  const writerRunBundle = dataSource.getWriterRunBundle(job.id);
  const writerRunTransportBundle = dataSource.getWriterRunTransportBundle(job.id);
  const writerRunTransportAdapterBundle = dataSource.getWriterRunTransportAdapterBundle(job.id);
  const writerRunReceiptIngestionBundle = dataSource.getWriterRunReceiptIngestionBundle(job.id);
  const readyTransportBundle = dataSource.getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const handoffBundle = dataSource.getDeliveryHandoffBundle(job.id);
  const stagingBundle = dataSource.getDeliveryStagingBundle(job.id);
  const exportArtifacts = dataSource.getExportArtifacts(job.id);
  const dashboardMetric = dataSource.dashboardMetrics.find((metric) => metric.label === "Planned delivery files");
  const deliveryActivity = dataSource.activityFeed.find((item) => item.id.endsWith("-delivery"));

  assert.ok(deliveryPackage);
  assert.ok(executionPlan);
  assert.ok(externalExecutionPackage);
  assert.ok(executorCompatibilityBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(writerRunTransportBundle);
  assert.ok(writerRunTransportAdapterBundle);
  assert.ok(writerRunReceiptIngestionBundle);
  assert.ok(readyTransportBundle);
  assert.ok(handoffBundle);
  assert.ok(stagingBundle);
  assert.equal(exportArtifacts.length, 8);
  assert.equal(deliveryPackage?.artifacts.length, 8);
  assert.ok(executionPlan?.preparedArtifacts.some((artifact) => artifact.executionStatus === "generated"));
  assert.ok(executionPlan?.preparedArtifacts.some((artifact) => artifact.executionStatus === "deferred"));
  assert.ok(stagingBundle?.entries.some((entry) => entry.relativePath.endsWith("/staging-summary.json")));
  assert.ok(stagingBundle?.entries.some((entry) => entry.kind === "deferred_descriptor"));
  assert.ok(handoffBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/deferred-writer-inputs.json")));
  assert.ok(externalExecutionPackage?.entries.some((entry) => entry.relativePath.endsWith("/package/external-execution-manifest.json")));
  assert.ok(executorCompatibilityBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/executor-compatibility-report.json")));
  assert.equal(executorCompatibilityBundle?.profile.id, "canonical-filesystem-executor-v1");
  assert.ok(writerAdapterBundle?.artifactMatches.length);
  assert.ok(writerAdapterBundle?.adapters.some((adapter) => adapter.id === "reference-noop-writer-adapter"));
  assert.ok(writerRunBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-requests.json")));
  assert.ok(writerRunBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipts.json")));
  assert.ok(writerRunBundle?.receipt.summary.simulatedCount >= 0);
  assert.ok(writerRunTransportBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-transport-envelopes.json")));
  assert.ok(writerRunTransportBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-audit-log.json")));
  assert.ok(writerRunTransportAdapterBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-dispatch-results.json")));
  assert.ok(writerRunTransportAdapterBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-compatibility-profiles.json")));
  assert.ok(writerRunReceiptIngestionBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-import-results.json")));
  assert.ok(writerRunReceiptIngestionBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-normalization.json")));
  assert.ok(writerRunReceiptIngestionBundle?.compatibilityProfiles.length);
  assert.equal(readyTransportBundle?.status, "receipt-recorded");
  assert.equal(externalExecutionPackage?.status === "ready" || externalExecutionPackage?.status === "partial" || externalExecutionPackage?.status === "blocked", true);
  assert.ok(handoffBundle?.deferredWriterInput.artifacts.length);
  assert.ok(exportArtifacts.some((artifact) => artifact.status === "blocked"));
  assert.equal(dashboardMetric?.value, String(dataSource.jobs.length * 8).padStart(2, "0"));
  assert.match(dashboardMetric?.note ?? "", /exporter\.ts/);
  assert.match(deliveryActivity?.title ?? "", /exporter plan refreshed/i);

  const missingMediaJob = dataSource.jobs.find((candidate) => candidate.id === "job-rvr-207-aaf-missing-media");
  assert.ok(missingMediaJob);
  const broaderDirectAafJob = dataSource.jobs.find((candidate) => candidate.id === "job-rvr-208-aaf-mob-graph");
  assert.ok(broaderDirectAafJob);
  const partialFallbackJob = dataSource.jobs.find((candidate) => candidate.id === "job-rvr-209-aaf-partial-fallback");
  assert.ok(partialFallbackJob);
  const realSampleJob = dataSource.jobs.find((candidate) => candidate.id === "job-r2n-test-1");
  const realSampleExecutionPlan = dataSource.getDeliveryExecutionPlan("job-r2n-test-1");
  const realSampleExternalPackage = dataSource.getExternalExecutionPackage("job-r2n-test-1");
  const realSampleBundle = realSampleJob ? dataSource.getBundle(realSampleJob.sourceBundleId) : undefined;
  const secondRealSampleJob = dataSource.jobs.find((candidate) => candidate.id === "job-r2n-test-2");
  const secondRealSampleBundle = secondRealSampleJob ? dataSource.getBundle(secondRealSampleJob.sourceBundleId) : undefined;
  const secondRealSampleExecutionPlan = dataSource.getDeliveryExecutionPlan("job-r2n-test-2");
  const thirdRealSampleJob = dataSource.jobs.find((candidate) => candidate.id === "job-r2n-test-3");
  const thirdRealSampleBundle = thirdRealSampleJob ? dataSource.getBundle(thirdRealSampleJob.sourceBundleId) : undefined;
  const thirdRealSampleExecutionPlan = dataSource.getDeliveryExecutionPlan("job-r2n-test-3");
  const fourthRealSampleJob = dataSource.jobs.find((candidate) => candidate.id === "job-r2n-test-4");
  const fourthRealSampleBundle = fourthRealSampleJob ? dataSource.getBundle(fourthRealSampleJob.sourceBundleId) : undefined;
  const fourthRealSampleExecutionPlan = dataSource.getDeliveryExecutionPlan("job-r2n-test-4");
  const fourthRealSampleClips = dataSource.getClipEventsForJob("job-r2n-test-4");
  assert.ok(realSampleJob);
  assert.ok(realSampleExecutionPlan);
  assert.ok(realSampleExternalPackage);
  assert.ok(secondRealSampleJob);
  assert.ok(secondRealSampleBundle);
  assert.ok(secondRealSampleExecutionPlan);
  assert.ok(thirdRealSampleJob);
  assert.ok(thirdRealSampleBundle);
  assert.ok(thirdRealSampleExecutionPlan);
  assert.ok(fourthRealSampleJob);
  assert.ok(fourthRealSampleBundle);
  assert.ok(fourthRealSampleExecutionPlan);
  assert.equal(realSampleBundle?.sequenceName, "Timeline 1 (Resolve)");
  assert.ok(realSampleExecutionPlan?.preparedArtifacts.some((artifact) => artifact.executionStatus === "generated"));
  assert.ok(realSampleExternalPackage?.entries.some((entry) => entry.relativePath.endsWith("/package/external-execution-summary.json")));
  const productionAudioAssets = realSampleBundle?.assets.filter((asset) => asset.fileRole === "production_audio" && asset.status === "present") ?? [];
  const privateProductionAudioAssets = productionAudioAssets.filter((asset) => privateAudioFileNames.includes(asset.name));
  if (runPrivateSample && privateAudioPresent && isPrivateSampleTargetSelected("r2n-test-1")) {
    assert.ok(
      privateProductionAudioAssets.some((asset) =>
        (asset.name === "230407_002.WAV" && asset.hasIXml)
        || ((asset.name === "F2_002.WAV" || asset.name === "F2-BT_002.WAV") && asset.hasBwf),
      ),
    );
  } else {
    assert.equal(privateProductionAudioAssets.length, 0);
  }
  assert.equal(secondRealSampleJob?.sourceSnapshot.primaryStructuredSource, secondLightweightExpectation.structuredSource.primary);
  assert.equal(secondRealSampleJob?.sourceSnapshot.secondaryStructuredSource, secondLightweightExpectation.structuredSource.secondary);
  assert.equal(secondRealSampleJob?.sourceSnapshot.aafIntakeStatus, secondLightweightExpectation.structuredSource.aafIntakeStatus);
  assert.equal(secondRealSampleExecutionPlan?.generatedCount, secondLightweightExpectation.deliveryExecution.generatedCount);
  assert.equal(secondRealSampleExecutionPlan?.deferredCount, secondLightweightExpectation.deliveryExecution.deferredCount);
  assert.equal(
    secondRealSampleExecutionPlan?.preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").length,
    secondLightweightExpectation.deliveryExecution.unavailableCount,
  );
  assert.deepEqual(
    secondRealSampleExecutionPlan?.preparedArtifacts
      .map((artifact) => ({ fileName: artifact.fileName, executionStatus: artifact.executionStatus }))
      .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    secondLightweightExpectation.deliveryExecution.artifactStatuses,
  );
  assert.equal(thirdRealSampleJob?.sourceSnapshot.primaryStructuredSource, thirdLightweightExpectation.structuredSource.primary);
  assert.equal(thirdRealSampleJob?.sourceSnapshot.secondaryStructuredSource, thirdLightweightExpectation.structuredSource.secondary);
  assert.equal(thirdRealSampleJob?.sourceSnapshot.aafIntakeStatus, thirdLightweightExpectation.structuredSource.aafIntakeStatus);
  assert.equal(thirdRealSampleExecutionPlan?.generatedCount, thirdLightweightExpectation.deliveryExecution.generatedCount);
  assert.equal(thirdRealSampleExecutionPlan?.deferredCount, thirdLightweightExpectation.deliveryExecution.deferredCount);
  assert.equal(
    thirdRealSampleExecutionPlan?.preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").length,
    thirdLightweightExpectation.deliveryExecution.unavailableCount,
  );
  assert.deepEqual(
    thirdRealSampleExecutionPlan?.preparedArtifacts
      .map((artifact) => ({ fileName: artifact.fileName, executionStatus: artifact.executionStatus }))
      .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    thirdLightweightExpectation.deliveryExecution.artifactStatuses,
  );
  assert.ok(!thirdRealSampleBundle?.assets.some((asset) => thirdPrivateCompanionNames.has(asset.name)));
  const thirdFieldRecorderCounts = dataSource.getFieldRecorderCandidates("job-r2n-test-3").reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.status] = (counts[candidate.status] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(thirdFieldRecorderCounts, thirdLightweightExpectation.fieldRecorder.counts);
  assert.equal(fourthRealSampleJob?.sourceSnapshot.primaryStructuredSource, fourthLightweightExpectation.structuredSource.primary);
  assert.equal(fourthRealSampleJob?.sourceSnapshot.secondaryStructuredSource, fourthLightweightExpectation.structuredSource.secondary);
  assert.equal(fourthRealSampleJob?.sourceSnapshot.aafIntakeStatus, fourthLightweightExpectation.structuredSource.aafIntakeStatus);
  assert.equal(fourthRealSampleExecutionPlan?.generatedCount, fourthLightweightExpectation.deliveryExecution.generatedCount);
  assert.equal(fourthRealSampleExecutionPlan?.deferredCount, fourthLightweightExpectation.deliveryExecution.deferredCount);
  assert.equal(
    fourthRealSampleExecutionPlan?.preparedArtifacts.filter((artifact) => artifact.executionStatus === "unavailable").length,
    fourthLightweightExpectation.deliveryExecution.unavailableCount,
  );
  assert.deepEqual(
    fourthRealSampleExecutionPlan?.preparedArtifacts
      .map((artifact) => ({ fileName: artifact.fileName, executionStatus: artifact.executionStatus }))
      .sort((left, right) => left.fileName.localeCompare(right.fileName)),
    fourthLightweightExpectation.deliveryExecution.artifactStatuses,
  );
  assert.ok(!fourthRealSampleBundle?.assets.some((asset) => fourthPrivateCompanionNames.has(asset.name)));
  assert.ok(!fourthRealSampleBundle?.assets.some((asset) => asset.relativePath?.startsWith("DR17 Fairlight Intro Tutorial.dra/")));
  const fourthFieldRecorderCounts = dataSource.getFieldRecorderCandidates("job-r2n-test-4").reduce<Record<string, number>>((counts, candidate) => {
    counts[candidate.status] = (counts[candidate.status] ?? 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(fourthFieldRecorderCounts, fourthLightweightExpectation.fieldRecorder.counts);
  assert.deepEqual(
    fourthRealSampleClips
      .filter((clipEvent) =>
        (clipEvent.channelCount ?? 0) > 2
        || clipEvent.channelLayout === "poly_4"
        || clipEvent.channelLayout === "poly_8"
        || clipEvent.channelLayout === "5.1",
      )
      .map((clipEvent) => ({
        clipName: clipEvent.clipName,
        channelCount: clipEvent.channelCount,
        channelLayout: clipEvent.channelLayout,
        sourceFileName: clipEvent.sourceFileName,
      }))
      .sort((left, right) => left.clipName.localeCompare(right.clipName) || (left.sourceFileName ?? "").localeCompare(right.sourceFileName ?? "")),
    fourthLightweightExpectation.audioStructure.multichannelClips,
  );
  if (runPrivateSample && secondPrivateSamplePresent && isPrivateSampleTargetSelected("r2n-test-2")) {
    const secondFieldRecorderCandidates = dataSource.getFieldRecorderCandidates("job-r2n-test-2");
    const secondPrivateProductionAudio = secondRealSampleBundle?.assets
      .filter((asset) => asset.fileRole === "production_audio" && asset.status === "present")
      .map((asset) => ({ name: asset.name, hasIXml: Boolean(asset.hasIXml) }))
      .sort((left, right) => left.name.localeCompare(right.name));
    const secondFieldRecorderCounts = secondFieldRecorderCandidates.reduce<Record<string, number>>((counts, candidate) => {
      counts[candidate.status] = (counts[candidate.status] ?? 0) + 1;
      return counts;
    }, {});

    assert.deepEqual(
      secondPrivateProductionAudio,
      secondPrivateExpectation.productionAudio
        .map((asset) => ({ name: asset.name, hasIXml: asset.hasIXml }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
    assert.deepEqual(secondFieldRecorderCounts, secondPrivateExpectation.fieldRecorder.counts);
    assert.ok(!secondFieldRecorderCandidates.some((candidate) =>
      candidate.candidateAssetName === "ONE MIN SOUNDTRACK.wav"
    ));
    assert.ok(!secondFieldRecorderCandidates.some((candidate) => candidate.status === "linked"));
  } else {
    assert.ok(!secondRealSampleBundle?.assets.some((asset) => secondPrivateCompanionNames.has(asset.name)));
    assert.ok(!secondRealSampleBundle?.assets.some((asset) => asset.relativePath?.startsWith("OMO/")));
  }
  const mappingMetric = dataSource.dashboardMetrics.find((metric) => metric.label === "Mapping reviews");
  assert.ok(mappingMetric);
});

test("edited mapping state updates delivery planning summary for an imported fixture job", () => {
  const job = dataSource.getJob("job-rvr-205-aaf-only");
  const translationModel = job ? dataSource.getTranslationModel(job.translationModelId) : undefined;
  const report = job ? dataSource.getAnalysisReportForJob(job.id) : undefined;
  const mappingProfile = job ? dataSource.getMappingProfile(job.id) : undefined;
  const outputPreset = job ? dataSource.getOutputPreset(job.outputPresetId ?? job.templateId) : undefined;
  const candidate = job ? dataSource.getFieldRecorderCandidates(job.id)[0] : undefined;
  const preservationIssues = job ? dataSource.getPreservationIssues(job.id) : [];

  assert.ok(job);
  assert.ok(translationModel);
  assert.ok(report);
  assert.ok(mappingProfile);
  assert.ok(outputPreset);
  assert.ok(candidate);

  const initialPlan = planNuendoDeliverySync(
    job,
    translationModel,
    outputPreset,
    report,
    mappingProfile,
    preservationIssues,
  );
  const editedMapping = setFieldRecorderDecision(mappingProfile, candidate, "unresolved");
  const editedPlan = planNuendoDeliverySync(
    job,
    translationModel,
    outputPreset,
    report,
    editedMapping,
    preservationIssues,
  );

  assert.equal(initialPlan.exportArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report")?.status, "planned");
  assert.equal(editedPlan.exportArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report")?.status, "blocked");
  assert.notEqual(initialPlan.deliveryPackage.deliverySummary, editedPlan.deliveryPackage.deliverySummary);
});
