import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getJobReviewContext } from "../data-source";
import { createReviewStateSourceSignature } from "../review-state";
import { prepareDeliveryExecutionSync } from "./delivery-execution";
import { writeDeliveryStagingBundleSync } from "./delivery-staging-write";
import {
  createImportedBaseReviewInfluence,
  prepareDeliveryStagingSync,
} from "./delivery-staging";
import { planNuendoDeliverySync } from "./exporter";

function createBaseStagingBundle(jobId: string) {
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

  return prepareDeliveryStagingSync({
    job: context.job,
    bundle: context.bundle,
    deliveryPackage: deliveryPlan.deliveryPackage,
    exportArtifacts: deliveryPlan.exportArtifacts,
    executionPlan,
    preservationIssues: context.preservationIssues,
    sourceSignature: createReviewStateSourceSignature(context.job, context.bundle, context.timeline),
    reviewInfluence: createImportedBaseReviewInfluence(),
  });
}

test("prepareDeliveryStagingSync creates a deterministic staged bundle layout with generated and deferred files", () => {
  const stagingBundle = createBaseStagingBundle("job-rvr-205-aaf-only");
  const manifest = stagingBundle.entries.find((entry) => entry.relativePath.endsWith("/manifest.json"));
  const readme = stagingBundle.entries.find((entry) => entry.relativePath.endsWith("/README_NUENDO_IMPORT.txt"));
  const markerCsv = stagingBundle.entries.find((entry) => entry.relativePath.includes("/markers/") && entry.relativePath.endsWith(".csv"));
  const metadataCsv = stagingBundle.entries.find((entry) => entry.relativePath.includes("/metadata/") && entry.relativePath.endsWith(".csv"));
  const deferredAaf = stagingBundle.entries.find((entry) => entry.kind === "deferred_descriptor" && entry.fileKind === "aaf");
  const summary = stagingBundle.entries.find((entry) => entry.kind === "summary_file");

  assert.equal(stagingBundle.rootFolderName, "RVR_205_R1_AAF_PRIMARY");
  assert.ok(manifest && manifest.kind === "generated_file");
  assert.ok(readme && readme.kind === "generated_file");
  assert.ok(markerCsv && markerCsv.kind === "generated_file");
  assert.ok(metadataCsv && metadataCsv.kind === "generated_file");
  assert.ok(deferredAaf && deferredAaf.kind === "deferred_descriptor");
  assert.ok(summary && summary.kind === "summary_file");
  assert.match(manifest.content, /"jobCode": "RVR205R1"/);
  assert.match(readme.content, /Native Nuendo session\/project writing is not implemented/);
  assert.match(summary.content, /"rootFolderName": "RVR_205_R1_AAF_PRIMARY"/);
  assert.equal(stagingBundle.generatedCount, 7);
  assert.equal(stagingBundle.deferredCount, 2);
});

test("writeDeliveryStagingBundleSync materializes generated files and deferred descriptors to disk", () => {
  const stagingBundle = createBaseStagingBundle("job-rvr-205-aaf-only");
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "conform-bridge-staging-"));

  try {
    const writtenPaths = writeDeliveryStagingBundleSync(stagingBundle, tempRoot);
    const manifestPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "manifest.json")));
    const deferredPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "deferred", "RVR_205_R1_AAF_PRIMARY_NUENDO_READY.aaf.deferred.json")));
    const summaryPath = writtenPaths.find((item) => item.endsWith(path.join("RVR_205_R1_AAF_PRIMARY", "staging-summary.json")));

    assert.ok(manifestPath);
    assert.ok(deferredPath);
    assert.ok(summaryPath);
    assert.match(readFileSync(manifestPath, "utf8"), /"timelineName": "RVR_205_R1_AAF_PRIMARY"/);
    assert.match(readFileSync(deferredPath, "utf8"), /"nextBoundary": "future_writer"/);
    assert.match(readFileSync(summaryPath, "utf8"), /"generatedCount": 6/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
