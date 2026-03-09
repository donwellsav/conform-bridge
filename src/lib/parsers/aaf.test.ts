import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { parseAafText } from "./aaf";
import type { IntakeAsset } from "../types";

const aafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only", "resolve", "RVR_205_R1_LOCK.aaf");
const missingMediaAafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-207-aaf-missing-media", "resolve", "RVR_207_R1_LOCK.aaf");

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

test("parseAafText hydrates timeline, tracks, clips, and markers from the AAF text dump", () => {
  const parsed = parseAafText(readFileSync(aafFixturePath, "utf8"), {
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
