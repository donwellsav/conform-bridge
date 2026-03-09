import assert from "node:assert/strict";
import test from "node:test";

import { getJobReviewContext } from "./data-source";
import {
  applyFieldRecorderReviewDecision,
  applyReconformReviewDecision,
  applyTrackOverride,
  applyValidationReviewDecision,
  buildReviewOverlay,
  createEmptyReviewState,
  createReviewStateSourceSignature,
} from "./review-state";

test("review-state overlay applies saved mapping deltas and updates delivery planning", () => {
  const context = getJobReviewContext("job-rvr-205-aaf-only");
  assert.ok(context);

  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const baseState = createEmptyReviewState(context.job.id, sourceSignature);
  const baseOverlay = buildReviewOverlay(context, baseState);
  const candidate = context.fieldRecorderCandidates[0];
  const track = context.mappingProfile.trackMappings[0];

  assert.ok(candidate);
  assert.ok(track);
  assert.equal(baseOverlay.previewPlan.exportArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report")?.status, "planned");

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
  const editedOverlay = buildReviewOverlay(context, editedState);

  assert.equal(editedOverlay.effectiveMappingProfile.trackMappings[0]?.targetLane, "DX REVIEW A");
  assert.equal(editedOverlay.effectiveMappingProfile.trackMappings[0]?.action, "remap");
  assert.equal(editedOverlay.previewPlan.exportArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report")?.status, "blocked");
  assert.ok(editedOverlay.reviewCounts.mappingOpenCount >= baseOverlay.reviewCounts.mappingOpenCount);
});

test("validation acknowledgements reduce unresolved summary counts without mutating imported issues", () => {
  const context = getJobReviewContext("job-rvr-203-r3");
  assert.ok(context);

  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const baseState = createEmptyReviewState(context.job.id, sourceSignature);
  const overlay = buildReviewOverlay(context, baseState);
  const issue = overlay.validationItems.find((item) => item.isActionable)?.issue;

  assert.ok(issue);

  const acknowledgedOverlay = buildReviewOverlay(
    context,
    applyValidationReviewDecision(baseState, issue, {
      status: "acknowledged",
      note: "Accepted for this turnover.",
    }),
  );

  assert.equal(acknowledgedOverlay.reviewCounts.validationAcknowledgedCount, 1);
  assert.equal(acknowledgedOverlay.reviewCounts.validationOpenCount, overlay.reviewCounts.validationOpenCount - 1);
  assert.equal(context.preservationIssues.length > 0, true);
});

test("reconform review decisions persist in the overlay and change unresolved counts", () => {
  const context = getJobReviewContext("job-rvr-203-r3");
  assert.ok(context);

  const sourceSignature = createReviewStateSourceSignature(context.job, context.bundle, context.timeline);
  const baseState = createEmptyReviewState(context.job.id, sourceSignature);
  const baseOverlay = buildReviewOverlay(context, baseState);
  const event = context.conformChangeEvents[0];

  assert.ok(event);

  const reviewState = applyReconformReviewDecision(baseState, event.id, {
    status: "acknowledged",
    note: "Reviewed against picture lock compare.",
  });
  const overlay = buildReviewOverlay(context, reviewState);
  const reviewedItem = overlay.reconformItems.find((item) => item.event.id === event.id);

  assert.equal(overlay.reviewCounts.reconformAcknowledgedCount, 1);
  assert.equal(overlay.reviewCounts.reconformOpenCount, baseOverlay.reviewCounts.reconformOpenCount - 1);
  assert.equal(reviewedItem?.status, "acknowledged");
  assert.equal(reviewedItem?.note, "Reviewed against picture lock compare.");
});
