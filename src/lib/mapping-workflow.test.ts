import assert from "node:assert/strict";
import test from "node:test";

import {
  bulkSetMetadataStatus,
  countMappingReviews,
  setFieldRecorderDecision,
  setMarkerAction,
  updateTrackMapping,
} from "./mapping-workflow";
import type { FieldRecorderCandidate, MappingProfile, MappingRule, Marker } from "./types";

test("mapping workflow updates stay deterministic across track, metadata, marker, and field recorder edits", () => {
  const mappingProfile: MappingProfile = {
    id: "mapping-test",
    jobId: "job-test",
    timecodePolicy: {
      timelineStart: "01:00:00:00",
      eventStartMode: "source_absolute",
      pullMode: "none",
      dropFrame: false,
    },
    trackMappings: [{
      id: "tm-1",
      sourceTrack: "DX 1",
      sourceRole: "dx",
      channelLayout: "mono",
      targetLane: "DX 1",
      targetType: "audio_track",
      action: "preserve",
    }],
    metadataMappings: [{
      id: "mm-1",
      field: "scene",
      sourceValue: "24A",
      targetValue: "24A",
      status: "mapped",
    }],
    fieldRecorderOverrides: [],
  };
  const mappingRules: MappingRule[] = [{
    id: "rule-track-1",
    jobId: "job-test",
    scope: "track",
    source: "DX 1",
    target: "DX 1",
    action: "preserve",
    status: "locked",
    note: "Default lock.",
  }];
  const marker: Marker = {
    id: "marker-1",
    timelineId: "timeline-1",
    name: "ADR note",
    timecode: "01:00:10:00",
    frame: 240,
    color: "yellow",
    note: "Check production rustle.",
  };
  const candidate: FieldRecorderCandidate = {
    id: "frc-1",
    jobId: "job-test",
    clipEventId: "clip-1",
    matchKeys: {
      timecode: "01:00:12:00",
      reel: "A001",
    },
    status: "linked",
    candidateAssetName: "ROLL_001A.BWF",
    note: "Initial field recorder candidate.",
  };

  const updatedTrackMapping = updateTrackMapping(mappingProfile, "tm-1", {
    action: "remap",
    targetLane: "DX BUS A",
  });
  const updatedMetadata = bulkSetMetadataStatus(updatedTrackMapping, "transformed");
  const updatedFieldRecorder = setFieldRecorderDecision(updatedMetadata, candidate, "unresolved");
  const updatedRules = setMarkerAction(mappingRules, "job-test", marker, "ignore");
  const summary = countMappingReviews(updatedFieldRecorder, updatedRules, [candidate]);

  assert.equal(updatedFieldRecorder.trackMappings[0]?.action, "remap");
  assert.equal(updatedFieldRecorder.trackMappings[0]?.targetLane, "DX BUS A");
  assert.equal(updatedFieldRecorder.metadataMappings[0]?.status, "transformed");
  assert.equal(updatedFieldRecorder.fieldRecorderOverrides[0]?.status, "unresolved");
  assert.equal(updatedRules.find((rule) => rule.scope === "marker")?.action, "ignore");
  assert.deepEqual(summary, {
    trackReviewCount: 1,
    metadataReviewCount: 1,
    fieldRecorderReviewCount: 1,
    markerReviewCount: 1,
    total: 4,
  });
});
