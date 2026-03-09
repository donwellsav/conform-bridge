import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getJobReviewContext } from "../data-source";
import { createImportedReviewSignature, createReviewStateSourceSignature } from "../review-state";
import { prepareDeliveryExecutionSync } from "./delivery-execution";
import { prepareExternalExecutionPackageSync } from "./external-execution-package";
import { writeExternalExecutionPackageSync } from "./external-execution-package-write";
import { prepareDeliveryHandoffSync } from "./delivery-handoff";
import { createImportedBaseReviewInfluence, prepareDeliveryStagingSync } from "./delivery-staging";
import { planNuendoDeliverySync } from "./exporter";

function createBaseExternalExecutionPackage(jobId: string) {
  const context = getJobReviewContext(jobId);
  assert.ok(context);

  const deliveryPlan = planNuendoDeliverySync(
    context.job,
    context.translationModel,
    context.outputPreset,
    context.report,
    context.mappingProfile,
    context.preservationIssues,
  );
  const executionPlan = prepareDeliveryExecutionSync({
    job: context.job,
    bundle: context.bundle,
    translationModel: context.translationModel,
    timelineName: context.timeline.name,
    tracks: context.tracks,
    clipEvents: context.clipEvents,
    markers: context.markers,
    analysisReport: context.report,
    mappingProfile: context.mappingProfile,
    fieldRecorderCandidates: context.fieldRecorderCandidates,
    preservationIssues: context.preservationIssues,
    deliveryPackage: deliveryPlan.deliveryPackage,
    exportArtifacts: deliveryPlan.exportArtifacts,
  });
  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const stagingBundle = prepareDeliveryStagingSync({
    job: context.job,
    bundle: context.bundle,
    deliveryPackage: deliveryPlan.deliveryPackage,
    exportArtifacts: deliveryPlan.exportArtifacts,
    executionPlan,
    preservationIssues: context.preservationIssues,
    sourceSignature,
    reviewInfluence: createImportedBaseReviewInfluence(),
  });
  const handoffBundle = prepareDeliveryHandoffSync({
    job: context.job,
    bundle: context.bundle,
    translationModel: context.translationModel,
    deliveryPackage: deliveryPlan.deliveryPackage,
    exportArtifacts: deliveryPlan.exportArtifacts,
    executionPlan,
    stagingBundle,
    preservationIssues: context.preservationIssues,
    sourceSignature,
    reviewSignature: createImportedReviewSignature(context.job.id, sourceSignature),
  });

  return prepareExternalExecutionPackageSync({
    job: context.job,
    bundle: context.bundle,
    deliveryPackage: deliveryPlan.deliveryPackage,
    executionPlan,
    stagingBundle,
    handoffBundle,
  });
}

test("prepareExternalExecutionPackageSync generates deterministic manifest, index, and checksum outputs", () => {
  const packageBundle = createBaseExternalExecutionPackage("job-rvr-205-aaf-only");

  assert.equal(packageBundle.status, "ready");
  assert.ok(packageBundle.entries.some((entry) => entry.relativePath.endsWith("/staged/manifest.json")));
  assert.ok(packageBundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/deferred-writer-inputs.json")));
  assert.ok(packageBundle.entries.some((entry) => entry.relativePath.endsWith("/package/external-execution-manifest.json")));
  assert.ok(packageBundle.entries.some((entry) => entry.relativePath.endsWith("/package/external-execution-index.json")));
  assert.ok(packageBundle.entries.some((entry) => entry.relativePath.endsWith("/package/checksums.json")));
  assert.equal(packageBundle.manifestJson.packageStatus, "ready");
  assert.equal(packageBundle.deferredInputsJson.inputs.length, 2);
  assert.ok(packageBundle.checksumsJson.entries.some((entry) => entry.relativePath.endsWith("/staged/manifest.json")));
  assert.ok(packageBundle.checksumsJson.entries.some((entry) => entry.relativePath.endsWith("/handoff/delivery-handoff-summary.json")));
  assert.ok(packageBundle.generatedArtifactIndexJson.artifacts.some((artifact) => artifact.relativePath.endsWith("/staged/metadata/RVR_205_R1_AAF_PRIMARY_METADATA.csv")));
});

test("prepareExternalExecutionPackageSync reflects blocked package readiness when deferred handoff stays blocked", () => {
  const packageBundle = createBaseExternalExecutionPackage("job-rvr-203-r3");

  assert.equal(packageBundle.status, "blocked");
  assert.ok(packageBundle.summaryJson.reasons.length > 0);
});

test("writeExternalExecutionPackageSync materializes staged, handoff, and package metadata files to disk", () => {
  const packageBundle = createBaseExternalExecutionPackage("job-rvr-205-aaf-only");
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "conform-bridge-package-"));

  try {
    const writtenPaths = writeExternalExecutionPackageSync(packageBundle, tempRoot);
    const stagedManifestPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "staged", "manifest.json")));
    const handoffSummaryPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "handoff", "delivery-handoff-summary.json")));
    const packageSummaryPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "package", "external-execution-summary.json")));

    assert.ok(stagedManifestPath);
    assert.ok(handoffSummaryPath);
    assert.ok(packageSummaryPath);
    assert.match(readFileSync(stagedManifestPath, "utf8"), /"timelineName": "RVR_205_R1_AAF_PRIMARY"/);
    assert.match(readFileSync(handoffSummaryPath, "utf8"), /"readinessStatus": "ready-for-writer"/);
    assert.match(readFileSync(packageSummaryPath, "utf8"), /"packageStatus": "ready"/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
