import assert from "node:assert/strict";
import test from "node:test";

import { getJobReviewContext } from "../data-source";
import {
  applyFieldRecorderReviewDecision,
  applyTrackOverride,
  buildReviewOverlay,
  createEmptyReviewState,
  createImportedReviewSignature,
  createReviewStateSignature,
  createReviewStateSourceSignature,
} from "../review-state";
import { prepareDeliveryExecutionSync } from "./delivery-execution";
import { prepareDeliveryHandoffSync } from "./delivery-handoff";
import { createImportedBaseReviewInfluence, prepareDeliveryStagingSync } from "./delivery-staging";
import { planNuendoDeliverySync } from "./exporter";

function createBaseHandoff(jobId: string) {
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

  return prepareDeliveryHandoffSync({
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
}

test("prepareDeliveryHandoffSync generates deterministic writer-input contracts and handoff manifests for deferred artifacts", () => {
  const handoffBundle = createBaseHandoff("job-rvr-205-aaf-only");

  assert.equal(handoffBundle.deferredWriterInput.version, 1);
  assert.equal(handoffBundle.deferredWriterInput.artifacts.length, 2);
  assert.equal(handoffBundle.summaryJson.readinessStatus, "ready-for-writer");
  assert.ok(handoffBundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/deferred-writer-inputs.json")));
  assert.ok(handoffBundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/delivery-handoff-manifest.json")));
  assert.ok(handoffBundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/delivery-handoff-summary.json")));

  const aafContract = handoffBundle.deferredWriterInput.artifacts.find((artifact) => artifact.artifactKind === "nuendo_ready_aaf");
  assert.ok(aafContract);
  assert.equal(aafContract.readinessStatus, "ready-for-writer");
  assert.equal(aafContract.requiredWriterCapability, "aaf_delivery_writer");
  assert.ok(aafContract.dependencies.some((dependency) => dependency.label === "Staged manifest" && dependency.status === "present"));
  assert.ok(aafContract.dependencies.some((dependency) => dependency.label === "Intake timeline exchange source" && dependency.status === "present"));

  const manifestJson = handoffBundle.entries.find((entry) => entry.payloadKind === "delivery_handoff_manifest");
  assert.ok(manifestJson);
  assert.match(manifestJson.content, /"reviewSignature": "imported-base::job-rvr-205-aaf-only/);
});

test("prepareDeliveryHandoffSync reflects blocked and partial readiness states from imported and saved-review contexts", () => {
  const blockedBase = createBaseHandoff("job-rvr-203-r3");
  assert.equal(blockedBase.summaryJson.readinessStatus, "blocked");
  assert.ok(blockedBase.deferredWriterInput.artifacts.some((artifact) => artifact.readinessStatus === "blocked"));

  const context = getJobReviewContext("job-rvr-205-aaf-only");
  assert.ok(context);
  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const baseState = createEmptyReviewState(context.job.id, sourceSignature);
  const candidate = context.fieldRecorderCandidates[0];
  const track = context.mappingProfile.trackMappings[0];

  assert.ok(candidate);
  assert.ok(track);

  const editedState = applyFieldRecorderReviewDecision(
    applyTrackOverride(baseState, context.mappingProfile, track.id, {
      action: "remap",
      targetLane: "DX REVIEW A",
    }),
    context.mappingProfile,
    context.fieldRecorderCandidates,
    candidate.id,
    {
      status: "unresolved",
      note: "Waiting on operator review.",
    },
  );
  const overlay = buildReviewOverlay(context, editedState);

  assert.equal(overlay.previewHandoff.summaryJson.readinessStatus, "blocked");
  assert.ok(overlay.previewHandoff.deferredWriterInput.artifacts.every((artifact) => artifact.readinessStatus === "blocked"));
  assert.equal(overlay.previewHandoff.deferredWriterInput.reviewSignature, createReviewStateSignature(editedState));
});
