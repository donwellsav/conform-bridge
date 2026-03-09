import assert from "node:assert/strict";
import test from "node:test";

import { getJobReviewContext } from "../data-source";
import type { DeliveryExecutionArtifactPayload } from "../types";
import { prepareDeliveryExecutionSync } from "./delivery-execution";
import { planNuendoDeliverySync } from "./exporter";

function getGeneratedPayload(
  preparedArtifacts: DeliveryExecutionArtifactPayload[],
  payloadKind: DeliveryExecutionArtifactPayload["payloadKind"],
) {
  return preparedArtifacts.find((artifact) => artifact.payloadKind === payloadKind);
}

test("prepareDeliveryExecutionSync generates manifest, readme, csv payloads, and deferred binary records for a stable fixture", () => {
  const context = getJobReviewContext("job-rvr-205-aaf-only");
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

  const manifest = getGeneratedPayload(executionPlan.preparedArtifacts, "manifest_json");
  const readme = getGeneratedPayload(executionPlan.preparedArtifacts, "readme_text");
  const markerCsv = getGeneratedPayload(executionPlan.preparedArtifacts, "marker_csv");
  const markerEdl = getGeneratedPayload(executionPlan.preparedArtifacts, "marker_edl");
  const metadataCsv = getGeneratedPayload(executionPlan.preparedArtifacts, "metadata_csv");
  const fieldRecorderReport = getGeneratedPayload(executionPlan.preparedArtifacts, "field_recorder_report");
  const aafDeferred = executionPlan.preparedArtifacts.find((artifact) => artifact.fileKind === "aaf");
  const referenceDeferred = executionPlan.preparedArtifacts.find((artifact) => artifact.fileRole === "reference_video");

  assert.ok(manifest && manifest.executionStatus === "generated");
  assert.match(manifest.content, /"jobCode": "RVR205R1"/);
  assert.match(manifest.content, /"timelineName": "RVR_205_R1_AAF_PRIMARY"/);

  assert.ok(readme && readme.executionStatus === "generated");
  assert.match(readme.content, /Native Nuendo session\/project writing is not implemented/);
  assert.match(readme.content, /Generated now/);

  assert.ok(markerCsv && markerCsv.executionStatus === "generated");
  assert.equal(markerCsv.rowCount, 1);
  assert.match(markerCsv.content, /timecode,frame,name,color,note/);
  assert.match(markerCsv.content, /01:00:22:00/);

  assert.ok(markerEdl && markerEdl.executionStatus === "generated");
  assert.equal(markerEdl.eventCount, 1);
  assert.match(markerEdl.content, /\* LOC: 01:00:22:00 YELLOW MARKER AAF-only marker/);

  assert.ok(metadataCsv && metadataCsv.executionStatus === "generated");
  assert.equal(metadataCsv.rowCount, 2);
  assert.match(metadataCsv.content, /timelineName,trackIndex,trackName,targetLane/);
  assert.match(metadataCsv.content, /BOOM_070A_01_A/);

  assert.ok(fieldRecorderReport && fieldRecorderReport.executionStatus === "generated");
  assert.equal(fieldRecorderReport.rowCount, context.fieldRecorderCandidates.length);
  assert.match(fieldRecorderReport.content, /clipName,sourceFileName,candidateAssetName,decision/);

  assert.ok(aafDeferred && aafDeferred.executionStatus === "deferred");
  assert.ok(referenceDeferred && referenceDeferred.executionStatus === "deferred");
});

test("prepareDeliveryExecutionSync is deterministic for the same fixture input", () => {
  const context = getJobReviewContext("job-rvr-205-aaf-only");
  assert.ok(context);

  const deliveryPlan = planNuendoDeliverySync(
    context.job,
    context.translationModel,
    context.outputPreset,
    context.report,
    context.mappingProfile,
    context.preservationIssues,
  );
  const first = prepareDeliveryExecutionSync({
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
  const second = prepareDeliveryExecutionSync({
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

  assert.deepEqual(first, second);
});
