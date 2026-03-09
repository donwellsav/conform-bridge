import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { parseAafText } from "./aaf";
import type { IntakeAsset } from "../types";

const missingMediaAafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-207-aaf-missing-media", "resolve", "RVR_207_R1_LOCK.aaf.adapter");
const normalizedAafPayload = JSON.stringify({
  format: "conform-bridge-aaf-derived/v2",
  composition: {
    name: "RVR_205_R1_AAF_PRIMARY",
    mobName: "RVR_205_R1_COMPOSITION",
    editRate: "24000/1001",
    sampleRate: 48000,
    startTimecode: "01:00:00:00",
    durationTimecode: "00:08:10:00",
    dropFrame: false,
  },
  tracks: [
    {
      slotId: "1",
      index: 1,
      name: "DX BOOM A",
      role: "dx",
      channelCount: 1,
      channelLayout: "mono",
    },
    {
      slotId: "2",
      index: 2,
      name: "DX BOOM B",
      role: "dx",
      channelCount: 1,
      channelLayout: "mono",
    },
  ],
  mediaRefs: [
    {
      id: "mr-1",
      fileName: "ROLL_070A_01.BWF",
      mobName: "ROLL_070A_01",
      reel: "070A",
      tape: "R070A",
      channelCount: 8,
      channelLayout: "poly_8",
      hasBwf: true,
      hasIXml: true,
      missing: false,
    },
    {
      id: "mr-2",
      fileName: "ROLL_070A_02.BWF",
      mobName: "ROLL_070A_02",
      reel: "070A",
      tape: "R070A",
      channelCount: 8,
      channelLayout: "poly_8",
      hasBwf: true,
      hasIXml: true,
      missing: false,
    },
  ],
  events: [
    {
      id: "evt-1",
      trackSlotId: "1",
      trackIndex: 1,
      clipName: "BOOM_070A_01_A",
      mediaRefId: "mr-1",
      timing: {
        recordIn: "01:00:12:00",
        recordOut: "01:00:16:12",
        sourceIn: "09:10:00:00",
        sourceOut: "09:10:04:12",
      },
      metadata: {
        reel: "070A",
        tape: "R070A",
        scene: "12C",
        take: "3",
        notes: "Primary boom event from the AAF-derived fixture.",
      },
      effects: {
        fadeIn: true,
        fadeOut: false,
        speedRatio: "1/1",
      },
      flags: {
        offline: false,
        nested: false,
        flattened: true,
      },
    },
    {
      id: "evt-2",
      trackSlotId: "2",
      trackIndex: 2,
      clipName: "BOOM_070A_02_B",
      mediaRefId: "mr-2",
      timing: {
        recordIn: "01:00:20:00",
        recordOut: "01:00:24:00",
        sourceIn: "09:10:08:00",
        sourceOut: "09:10:12:00",
      },
      metadata: {
        reel: "070A",
        tape: "R070A",
        scene: "12C",
        take: "4",
      },
      effects: {
        fadeIn: false,
        fadeOut: true,
        speedRatio: "1001/960",
      },
      flags: {
        offline: false,
        nested: false,
        flattened: true,
      },
    },
  ],
  markers: [
    {
      timecode: "01:00:22:00",
      name: "AAF-only marker",
      color: "yellow",
      note: "Parsed from the richer AAF-derived fixture.",
    },
  ],
});

const assets: IntakeAsset[] = [
  {
    id: "asset-roll-070a-01",
    bundleId: "bundle-rvr-205-aaf-only",
    stage: "intake",
    origin: "production-audio",
    fileKind: "bwf",
    fileRole: "production_audio",
    name: "ROLL_070A_01.BWF",
    sizeLabel: "64 B",
    status: "present",
    note: "Fixture roll.",
    channelCount: 8,
    channelLayout: "poly_8",
    sampleRate: 48000,
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
  },
  {
    id: "asset-roll-070a-02",
    bundleId: "bundle-rvr-205-aaf-only",
    stage: "intake",
    origin: "production-audio",
    fileKind: "bwf",
    fileRole: "production_audio",
    name: "ROLL_070A_02.BWF",
    sizeLabel: "64 B",
    status: "present",
    note: "Fixture roll.",
    channelCount: 8,
    channelLayout: "poly_8",
    sampleRate: 48000,
    isPolyWav: true,
    hasBwf: true,
    hasIXml: true,
  },
];

test("parseAafText hydrates timeline, tracks, clips, and markers from the normalized AAF adapter payload", () => {
  const parsed = parseAafText(normalizedAafPayload, {
    bundleId: "bundle-rvr-205-aaf-only",
    translationModelId: "model-rvr-205-aaf-only",
    timelineId: "timeline-rvr-205-aaf-only",
    assets,
    fallbackName: "RVR_205_R1",
    fallbackFps: "23.976",
    fallbackSampleRate: 48000,
    fallbackStartTimecode: "01:00:00:00",
    fallbackDropFrame: false,
  });

  assert.ok(parsed);
  assert.equal(parsed?.timeline.name, "RVR_205_R1_AAF_PRIMARY");
  assert.equal(parsed?.timeline.fps, "23.976");
  assert.equal(parsed?.tracks.length, 2);
  assert.equal(parsed?.clipEvents.length, 2);
  assert.equal(parsed?.markers.length, 1);

  const firstClip = parsed?.clipEvents[0];
  const secondClip = parsed?.clipEvents[1];
  assert.equal(firstClip?.sourceFileName, "ROLL_070A_01.BWF");
  assert.equal(firstClip?.recordIn, "01:00:12:00");
  assert.equal(firstClip?.channelCount, 8);
  assert.equal(firstClip?.channelLayout, "poly_8");
  assert.equal(firstClip?.hasFadeIn, true);
  assert.equal(firstClip?.hasIXml, true);
  assert.equal(firstClip?.isOffline, false);
  assert.match(firstClip?.clipNotes ?? "", /AAF mob: ROLL_070A_01/);
  assert.equal(secondClip?.hasSpeedEffect, true);
});

test("parseAafText preserves missing-media and mob-name details from richer AAF-derived fixtures", () => {
  const parsed = parseAafText(readFileSync(missingMediaAafFixturePath, "utf8"), {
    bundleId: "bundle-rvr-207-aaf-missing-media",
    translationModelId: "model-rvr-207-aaf-missing-media",
    timelineId: "timeline-rvr-207-aaf-missing-media",
    assets: [
      {
        id: "asset-roll-090a-01",
        bundleId: "bundle-rvr-207-aaf-missing-media",
        stage: "intake",
        origin: "production-audio",
        fileKind: "bwf",
        fileRole: "production_audio",
        name: "ROLL_090A_01.BWF",
        sizeLabel: "64 B",
        status: "present",
        note: "Fixture roll.",
        channelCount: 8,
        channelLayout: "poly_8",
        sampleRate: 48000,
        isPolyWav: true,
        hasBwf: true,
        hasIXml: true,
      },
    ],
    fallbackName: "RVR_207_R1",
    fallbackFps: "23.976",
    fallbackSampleRate: 48000,
    fallbackStartTimecode: "01:00:00:00",
    fallbackDropFrame: false,
  });

  assert.ok(parsed);
  const missingClip = parsed?.clipEvents.find((clipEvent) => clipEvent.clipName === "LAV_090B_02_B");
  assert.equal(missingClip?.sourceFileName, "ROLL_090B_02.BWF");
  assert.equal(missingClip?.isOffline, true);
  assert.match(missingClip?.clipNotes ?? "", /AAF mob: ROLL_090B_02/);
});
