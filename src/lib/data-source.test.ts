import assert from "node:assert/strict";
import test from "node:test";

import * as dataSource from "./data-source";
import { setFieldRecorderDecision } from "./mapping-workflow";
import { planNuendoDeliverySync } from "./services/exporter";

test("imported fixture data flows through exporter planning into dashboard and job selectors", () => {
  assert.equal(dataSource.dataMode, "imported");
  assert.equal(dataSource.jobs.length, 7);

  const job = dataSource.jobs[0];
  assert.ok(job);

  const deliveryPackage = dataSource.getDeliveryPackage(job.deliveryPackageId);
  const executionPlan = dataSource.getDeliveryExecutionPlan(job.id);
  const externalExecutionPackage = dataSource.getExternalExecutionPackage(job.id);
  const writerAdapterBundle = dataSource.getWriterAdapterBundle(job.id);
  const writerRunBundle = dataSource.getWriterRunBundle(job.id);
  const handoffBundle = dataSource.getDeliveryHandoffBundle(job.id);
  const stagingBundle = dataSource.getDeliveryStagingBundle(job.id);
  const exportArtifacts = dataSource.getExportArtifacts(job.id);
  const dashboardMetric = dataSource.dashboardMetrics.find((metric) => metric.label === "Planned delivery files");
  const deliveryActivity = dataSource.activityFeed.find((item) => item.id.endsWith("-delivery"));

  assert.ok(deliveryPackage);
  assert.ok(executionPlan);
  assert.ok(externalExecutionPackage);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
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
  assert.ok(writerAdapterBundle?.artifactMatches.length);
  assert.ok(writerAdapterBundle?.adapters.some((adapter) => adapter.id === "reference-noop-writer-adapter"));
  assert.ok(writerRunBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-requests.json")));
  assert.ok(writerRunBundle?.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipts.json")));
  assert.ok(writerRunBundle?.receipt.summary.simulatedCount >= 0);
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
