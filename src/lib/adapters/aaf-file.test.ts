import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { extractAafFromFileSync } from "./aaf-file";
import type { IntakeAsset } from "../types";

const binaryAafFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only", "resolve", "RVR_205_R1_LOCK.aaf");
const adapterFixturePath = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only", "resolve", "RVR_205_R1_LOCK.aaf.adapter");

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

test("extractAafFromFileSync reads binary/container-aware AAF fixtures through the adapter sidecar", () => {
  const extracted = extractAafFromFileSync(binaryAafFixturePath, createContext());

  assert.equal(extracted.containerKind, "ole-compound");
  assert.match(extracted.adapterPath ?? "", /RVR_205_R1_LOCK\.aaf\.adapter$/);
  assert.equal(extracted.parsed?.timeline.name, "RVR_205_R1_AAF_PRIMARY");
  assert.equal(extracted.parsed?.clipEvents.length, 2);
});

test("extractAafFromFileSync keeps the legacy text fixture path as a fallback", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "conform-bridge-aaf-"));
  const tempAafPath = join(tempRoot, "fixture.aaf");

  try {
    writeFileSync(tempAafPath, readFileSync(adapterFixturePath, "utf8"), "utf8");

    const extracted = extractAafFromFileSync(tempAafPath, createContext());
    assert.equal(extracted.containerKind, "text");
    assert.equal(extracted.adapterPath, undefined);
    assert.equal(extracted.parsed?.timeline.name, "RVR_205_R1_AAF_PRIMARY");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
