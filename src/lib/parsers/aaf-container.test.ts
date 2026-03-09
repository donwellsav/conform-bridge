import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import {
  createEmbeddedAafContainerBuffer,
  inspectAafContainerBuffer,
  parseAafContainerBuffer,
} from "./aaf-container";
import type { IntakeAsset } from "../types";

const directAafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only", "resolve", "RVR_205_R1_LOCK.aaf");
const broaderStreamLayoutFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-206-aaf-vs-fcpxml", "resolve", "RVR_206_R2_LOCK.aaf");
const broaderDirectAafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-208-aaf-mob-graph", "resolve", "RVR_208_R4_LOCK.aaf");
const partialDirectFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-209-aaf-partial-fallback", "resolve", "RVR_209_R1_LOCK.aaf");

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

function createContext() {
  return {
    bundleId: "bundle-rvr-205-aaf-only",
    translationModelId: "model-rvr-205-aaf-only",
    timelineId: "timeline-rvr-205-aaf-only",
    assets,
    fallbackName: "RVR_205_R1",
    fallbackFps: "23.976" as const,
    fallbackSampleRate: 48000 as const,
    fallbackStartTimecode: "01:00:00:00",
    fallbackDropFrame: false,
  };
}

function createBroaderGraphContext() {
  return {
    bundleId: "bundle-rvr-208-aaf-mob-graph",
    translationModelId: "model-rvr-208-aaf-mob-graph",
    timelineId: "timeline-rvr-208-aaf-mob-graph",
    assets: [
      {
        id: "asset-roll-110a-01",
        bundleId: "bundle-rvr-208-aaf-mob-graph",
        stage: "intake",
        origin: "production-audio",
        fileKind: "bwf",
        fileRole: "production_audio",
        name: "ROLL_110A_01.BWF",
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
        id: "asset-roll-110a-02",
        bundleId: "bundle-rvr-208-aaf-mob-graph",
        stage: "intake",
        origin: "production-audio",
        fileKind: "bwf",
        fileRole: "production_audio",
        name: "ROLL_110A_02.BWF",
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
    fallbackName: "RVR_208_R4",
    fallbackFps: "23.976" as const,
    fallbackSampleRate: 48000 as const,
    fallbackStartTimecode: "01:00:00:00",
    fallbackDropFrame: false,
  };
}

test("parseAafContainerBuffer extracts canonical AAF data directly from binary fixtures", () => {
  const parsed = parseAafContainerBuffer(readFileSync(directAafFixturePath), createContext());

  assert.ok(parsed);
  assert.equal(parsed?.timeline.name, "RVR_205_R1_AAF_PRIMARY");
  assert.equal(parsed?.tracks.length, 2);
  assert.equal(parsed?.clipEvents.length, 2);
  assert.equal(parsed?.markers.length, 1);
  assert.equal(parsed?.clipEvents[0]?.sourceFileName, "ROLL_070A_01.BWF");
});

test("createEmbeddedAafContainerBuffer writes a directly parseable in-repo AAF payload", () => {
  const payload = JSON.stringify({
    format: "conform-bridge-aaf-derived/v2",
    composition: {
      name: "INLINE_AAF_TEST",
      editRate: "24/1",
      sampleRate: 48000,
      startTimecode: "01:00:00:00",
      durationTimecode: "00:00:04:00",
      dropFrame: false,
    },
    tracks: [
      {
        slotId: "1",
        index: 1,
        name: "DX A",
        role: "dx",
        channelCount: 1,
        channelLayout: "mono",
      },
    ],
    mediaRefs: [
      {
        id: "mr-1",
        fileName: "ROLL_070A_01.BWF",
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
        clipName: "INLINE_CLIP",
        mediaRefId: "mr-1",
        timing: {
          recordIn: "01:00:00:00",
          recordOut: "01:00:04:00",
          sourceIn: "09:00:00:00",
          sourceOut: "09:00:04:00",
        },
        metadata: {
          reel: "070A",
          tape: "R070A",
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
    ],
    markers: [],
  });
  const parsed = parseAafContainerBuffer(createEmbeddedAafContainerBuffer(payload), createContext());

  assert.ok(parsed);
  assert.equal(parsed?.timeline.name, "INLINE_AAF_TEST");
  assert.equal(parsed?.clipEvents[0]?.hasFadeIn, true);
});

test("parseAafContainerBuffer traverses broader graph payloads including locators and media descriptors", () => {
  const parsed = parseAafContainerBuffer(readFileSync(broaderDirectAafFixturePath), createBroaderGraphContext());

  assert.ok(parsed);
  assert.equal(parsed?.timeline.name, "RVR_208_R4_AAF_GRAPH");
  assert.equal(parsed?.tracks.length, 2);
  assert.equal(parsed?.clipEvents.length, 3);
  assert.equal(parsed?.markers.length, 3);

  const firstClip = parsed?.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_110A_01_A");
  const transitionClip = parsed?.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_110A_02_B");
  const locatorMarker = parsed?.markers.find((marker) => marker.name === "ADR check");

  assert.equal(firstClip?.sourceFileName, "ROLL_110A_01.BWF");
  assert.equal(firstClip?.channelLayout, "poly_8");
  assert.equal(firstClip?.hasIXml, true);
  assert.match(firstClip?.clipNotes ?? "", /Source clip: SC_110A_A/);
  assert.match(firstClip?.clipNotes ?? "", /Media locator: AUDIO\/ROLL_110A_01\.BWF/);
  assert.equal(firstClip?.hasFadeOut, true);
  assert.equal(transitionClip?.hasSpeedEffect, true);
  assert.match(transitionClip?.clipNotes ?? "", /Resolve crossfade/);
  assert.match(locatorMarker?.note ?? "", /Check lav rustle/);
});

test("parseAafContainerBuffer directly traverses broader OLE-layout streams without adapter help", () => {
  const parsed = parseAafContainerBuffer(readFileSync(broaderStreamLayoutFixturePath), createContext());

  assert.ok(parsed);
  assert.equal(parsed?.timeline.name, "RVR_206_R2_AAF_SECONDARY");
  assert.equal(parsed?.tracks.length, 3);
  assert.equal(parsed?.clipEvents.length, 3);
  assert.equal(parsed?.markers.length, 2);
  assert.equal(parsed?.clipEvents[0]?.sourceFileName, "ROLL_080A_01.BWF");
  assert.equal(parsed?.clipEvents[1]?.isOffline, true);
});

test("inspectAafContainerBuffer reports partial direct coverage when a layout still needs adapter fallback", () => {
  const inspected = inspectAafContainerBuffer(readFileSync(partialDirectFixturePath), createContext());

  assert.equal(inspected.parsed, null);
  assert.equal(inspected.directCoverage, "partial");
  assert.match(inspected.fallbackReason ?? "", /could not hydrate any clip events/i);
  assert.ok(inspected.diagnostics.some((diagnostic) => /unsupported segment kind/i.test(diagnostic)));
});
