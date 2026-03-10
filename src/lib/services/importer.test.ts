import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import * as importerModule from "./importer";

const fcpxmlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-203-r3");
const edlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-204-edl-only");
const aafOnlyFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only");
const aafVsFcpxmlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-206-aaf-vs-fcpxml");
const aafMissingMediaFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-207-aaf-missing-media");
const broaderAafGraphFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-208-aaf-mob-graph");
const partialFallbackAafFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-209-aaf-partial-fallback");
const realResolveFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "r2n-test-1");
const r2nExpectationRoot = resolve(process.cwd(), "fixtures", "expectations", "r2n-test-1");
const manifestPath = resolve(fcpxmlFixtureRoot, "editorial", "manifest.json");
const metadataPath = resolve(fcpxmlFixtureRoot, "editorial", "RVR_203_METADATA.csv");
const importer = ("default" in importerModule ? importerModule.default : importerModule) as typeof importerModule;
const privateSampleFileNames = [
  "230407_002.WAV",
  "F2-BT_002.WAV",
  "F2_002.WAV",
  "Timeline 1.mp4",
  "Timeline 1.otioz",
];
const privateAudioFileNames = [
  "230407_002.WAV",
  "F2-BT_002.WAV",
  "F2_002.WAV",
];
const runPrivateSample = process.env.CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE === "1";
const privateSamplePresent = privateSampleFileNames.every((fileName) => existsSync(resolve(realResolveFixtureRoot, fileName)));
const privateSampleReason = privateSamplePresent
  ? "set CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1 to include the private r2n-test-1 regression assets"
  : "private r2n-test-1 regression assets are not present on disk";

type SampleExpectation = {
  timeline: {
    name: string;
    fps: string;
    startTimecode: string;
    durationTimecode: string;
    trackCount: number;
    clipCount: number;
    markerCount: number;
  };
  markers?: Array<{
    timecode: string;
    name: string;
  }>;
  issueCodes: string[];
  productionAudio?: Array<{
    name: string;
    sampleRate: number;
    bitDepth: number;
    channelCount: number;
    channelLayout: string;
    scene: string;
    take: string;
    startTimecode: string;
    endTimecode: string;
    hasBwf: boolean;
    hasIXml: boolean;
    hasSourceTimecode: boolean;
    recordingDevice: string;
  }>;
  fieldRecorder: {
    counts: Record<string, number>;
    candidates: Array<{
      status: string;
      candidateAssetName: string;
      clipName: string;
    }>;
  };
};

function readJsonFixture<T>(fileName: string) {
  return JSON.parse(readFileSync(resolve(r2nExpectationRoot, fileName), "utf8")) as T;
}

function createLightweightSampleCopy() {
  const tempRoot = mkdtempSync(join(tmpdir(), "conform-bridge-r2n-test-1-"));
  const inventory = readJsonFixture<{
    tier1Committed: Array<{
      fileName: string;
    }>;
  }>("inventory.json");
  const committedFiles = [
    "README.md",
    ...inventory.tier1Committed.map((entry) => entry.fileName),
  ];

  for (const relativeFileName of committedFiles) {
    const sourcePath = resolve(realResolveFixtureRoot, relativeFileName);
    const targetPath = resolve(tempRoot, relativeFileName);
    mkdirSync(dirname(targetPath), { recursive: true });
    copyFileSync(sourcePath, targetPath);
  }

  return tempRoot;
}

function summarizeFieldRecorderCandidates(result: importerModule.IntakeImportResult) {
  const counts = result.fieldRecorderCandidates.reduce<Record<string, number>>((totals, candidate) => {
    totals[candidate.status] = (totals[candidate.status] ?? 0) + 1;
    return totals;
  }, {});

  const candidates = result.fieldRecorderCandidates
    .map((candidate) => ({
      status: candidate.status,
      candidateAssetName: candidate.candidateAssetName,
      clipName: result.clipEvents.find((clipEvent) => clipEvent.id === candidate.clipEventId)?.clipName ?? candidate.clipEventId,
    }))
    .sort((left, right) =>
      left.clipName.localeCompare(right.clipName)
      || left.status.localeCompare(right.status)
      || left.candidateAssetName.localeCompare(right.candidateAssetName),
    );

  return { counts, candidates };
}

function summarizeProductionAudio(result: importerModule.IntakeImportResult) {
  return result.sourceBundle.assets
    .filter((asset) => asset.fileRole === "production_audio" && asset.status === "present" && privateAudioFileNames.includes(asset.name))
    .map((asset) => ({
      name: asset.name,
      sampleRate: asset.sampleRate ?? 0,
      bitDepth: asset.bitDepth ?? 0,
      channelCount: asset.channelCount ?? 0,
      channelLayout: asset.channelLayout ?? "unknown",
      scene: asset.scene ?? "",
      take: asset.take ?? "",
      startTimecode: asset.startTimecode ?? "",
      endTimecode: asset.endTimecode ?? "",
      hasBwf: Boolean(asset.hasBwf),
      hasIXml: Boolean(asset.hasIXml),
      hasSourceTimecode: Boolean(asset.hasSourceTimecode),
      recordingDevice: asset.recordingDevice ?? "",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function summarizeRealSample(result: importerModule.IntakeImportResult): SampleExpectation {
  const issueCodes = [...new Set(result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code)))].sort();
  const markers = result.markers
    .map((marker) => ({ timecode: marker.timecode, name: marker.name }))
    .sort((left, right) => left.timecode.localeCompare(right.timecode) || left.name.localeCompare(right.name));

  return {
    timeline: {
      name: result.timeline.name,
      fps: result.timeline.fps,
      startTimecode: result.timeline.startTimecode,
      durationTimecode: result.timeline.durationTimecode,
      trackCount: result.tracks.length,
      clipCount: result.clipEvents.length,
      markerCount: result.markers.length,
    },
    markers,
    issueCodes,
    productionAudio: summarizeProductionAudio(result),
    fieldRecorder: summarizeFieldRecorderCandidates(result),
  };
}

test("parseManifestText reads intake expectations from manifest.json", () => {
  const manifest = importer.parseManifestText(readFileSync(manifestPath, "utf8"));

  assert.equal(manifest.bundleName, "RVR_203_R3_TURNOVER");
  assert.equal(manifest.sequenceName, "RVR_203_R3");
  assert.equal(manifest.fps, "23.976");
  assert.deepEqual(manifest.expectedProductionRolls, [
    "ROLL_054A_01.BWF",
    "ROLL_054A_LAV_ALT.WAV",
    "ROLL_054B_02.BWF",
  ]);
});

test("parseMetadataCsvText preserves known values and explicit unknowns", () => {
  const rows = importer.parseMetadataCsvText(readFileSync(metadataPath, "utf8"));

  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.timelineName, "RVR_203_R3");
  assert.equal(rows[0]?.clipName, "BOOM_054A_01_A");
  assert.equal(rows[0]?.isPolyWav, true);
  assert.equal(rows[1]?.take, undefined);
  assert.equal(rows[1]?.hasIXml, false);
  assert.equal(rows[2]?.isOffline, true);
});

test("importTurnoverFolderSync prefers FCPXML over metadata and EDL, then records reconciliation issues", () => {
  const result = importer.importTurnoverFolderSync(fcpxmlFixtureRoot);

  assert.equal(result.sourceBundle.stage, "intake");
  assert.equal(result.sourceBundle.folderPath, "fixtures/intake/rvr-203-r3");
  assert.equal(result.translationModel.sourceBundleId, result.sourceBundle.id);
  assert.equal(result.timeline.name, "RVR_203_R3_FCPXML_PRIMARY");
  assert.equal(result.timeline.startFrame, 86400);
  assert.equal(result.timeline.trackIds.length, 2);
  assert.equal(result.clipEvents.length, 3);
  assert.equal(result.markers.length, 1);

  const manifestAsset = result.sourceBundle.assets.find((asset) => asset.name === "manifest.json");
  const aafAsset = result.sourceBundle.assets.find((asset) => asset.name === "RVR_203_R3_LOCK.aaf");
  const productionRoll = result.sourceBundle.assets.find((asset) => asset.name === "ROLL_054A_01.BWF");
  const missingRoll = result.sourceBundle.assets.find((asset) => asset.name === "ROLL_054B_02.BWF");
  const lavClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "LAV_054A_01_B");

  assert.equal(manifestAsset?.fileRole, "intake_manifest");
  assert.equal(manifestAsset?.origin, "editorial");
  assert.equal(aafAsset?.fileKind, "aaf");
  assert.equal(aafAsset?.origin, "resolve");
  assert.equal(productionRoll?.origin, "production-audio");
  assert.equal(missingRoll?.status, "missing");
  assert.equal(lavClip?.recordIn, "01:00:20:08");
  assert.equal(lavClip?.take, undefined);

  assert.equal(result.analysisReport.totals.trackCount, 2);
  assert.equal(result.analysisReport.totals.clipCount, 3);
  assert.equal(result.analysisReport.totals.markerCount, 1);
  assert.equal(result.analysisReport.totals.offlineAssetCount, 1);
  assert.equal(result.analysisReport.highRiskCount, 2);
  assert.equal(result.analysisReport.warningCount, 7);
  assert.equal(result.analysisReport.blockedCount, 1);

  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));
  assert.ok(issueCodes.includes("MISSING_EXPECTED_FILE"));
  assert.ok(issueCodes.includes("MISSING_PRODUCTION_ROLL"));
  assert.ok(issueCodes.includes("TRACK_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("CLIP_TIMECODE_MISMATCH"));
  assert.ok(issueCodes.includes("MARKER_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("SOURCE_FILE_MISSING_FROM_INTAKE"));
  assert.ok(issueCodes.includes("TIMELINE_EDL_MISMATCH"));
  assert.ok(issueCodes.includes("UNRESOLVED_METADATA"));
  assert.ok(issueCodes.includes("DELIVERY_ARTIFACT_BLOCKED"));
  assert.ok(!("deliveryPackage" in result));
});

test("importTurnoverFolderSync falls back to EDL before metadata-only hydration", () => {
  const result = importer.importTurnoverFolderSync(edlFixtureRoot);

  assert.equal(result.timeline.name, "RVR_204_EDL_ONLY");
  assert.equal(result.timeline.trackIds.length, 1);
  assert.equal(result.clipEvents.length, 2);
  assert.equal(result.markers.length, 1);

  const firstClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_061A_01_A");
  assert.equal(firstClip?.recordIn, "01:10:00:00");
  assert.equal(firstClip?.take, "3");

  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));
  assert.ok(!issueCodes.includes("TRACK_COUNT_MISMATCH"));
  assert.ok(!issueCodes.includes("CLIP_TIMECODE_MISMATCH"));
  assert.ok(!issueCodes.includes("MARKER_COUNT_MISMATCH"));
});

test("importTurnoverFolderSync uses AAF as the primary timeline source when FCPXML is absent", () => {
  const result = importer.importTurnoverFolderSync(aafOnlyFixtureRoot);

  assert.equal(result.timeline.name, "RVR_205_R1_AAF_PRIMARY");
  assert.equal(result.timeline.trackIds.length, 2);
  assert.equal(result.clipEvents.length, 2);
  assert.equal(result.markers.length, 1);
  assert.equal(result.analysisReport.blockedCount, 0);

  const firstClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_070A_01_A");
  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));

  assert.equal(firstClip?.hasFadeIn, true);
  assert.equal(firstClip?.hasIXml, true);
  assert.equal(firstClip?.isOffline, false);
  assert.match(result.clipEvents[0]?.clipNotes ?? "", /AAF mob: ROLL_070A_01/);
  assert.equal(result.clipEvents[1]?.hasSpeedEffect, true);
  assert.ok(!issueCodes.includes("AAF_TRACK_COUNT_MISMATCH"));
  assert.ok(!issueCodes.includes("AAF_EXPECTED_MEDIA_MISSING"));
  assert.ok(!issueCodes.includes("AAF_ADAPTER_FALLBACK"));
});

test("importTurnoverFolderSync keeps FCPXML primary, enriches from AAF, and records AAF reconciliation issues", () => {
  const result = importer.importTurnoverFolderSync(aafVsFcpxmlFixtureRoot);

  assert.equal(result.timeline.name, "RVR_206_R2_FCPXML_PRIMARY");
  assert.equal(result.timeline.trackIds.length, 2);
  assert.equal(result.clipEvents.length, 2);
  assert.equal(result.markers.length, 1);

  const firstClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_080A_01_A");
  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));

  assert.equal(firstClip?.tape, "R080A");
  assert.equal(firstClip?.hasFadeIn, true);
  assert.ok(issueCodes.includes("AAF_TRACK_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_CLIP_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_CLIP_TIMING_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_SOURCE_CLIP_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_SOURCE_FILE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_REEL_TAPE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_MARKER_COVERAGE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_EXPECTED_MEDIA_MISSING"));
  assert.ok(!issueCodes.includes("AAF_ADAPTER_FALLBACK"));
});

test("importTurnoverFolderSync preserves explicit missing-media issues for AAF-primary fixtures", () => {
  const result = importer.importTurnoverFolderSync(aafMissingMediaFixtureRoot);

  assert.equal(result.timeline.name, "RVR_207_R1_AAF_PRIMARY");
  assert.equal(result.timeline.trackIds.length, 2);
  assert.equal(result.clipEvents.length, 2);
  assert.equal(result.markers.length, 3);

  const missingClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "LAV_090B_02_B");
  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));

  assert.equal(missingClip?.isOffline, true);
  assert.equal(missingClip?.sourceFileName, "ROLL_090B_02.BWF");
  assert.ok(issueCodes.includes("SOURCE_FILE_MISSING_FROM_INTAKE"));
  assert.ok(issueCodes.includes("MISSING_PRODUCTION_ROLL"));
  assert.ok(issueCodes.includes("AAF_EXPECTED_MEDIA_MISSING"));
  assert.ok(!issueCodes.includes("AAF_ADAPTER_FALLBACK"));
});

test("importTurnoverFolderSync keeps adapter fallback available for partially parsed AAF layouts and reports why it was needed", () => {
  const result = importer.importTurnoverFolderSync(partialFallbackAafFixtureRoot);

  assert.equal(result.timeline.name, "RVR_209_R1_AAF_FALLBACK");
  assert.equal(result.timeline.trackIds.length, 1);
  assert.equal(result.clipEvents.length, 1);
  assert.equal(result.markers.length, 1);

  const fallbackIssue = result.analysisReport.groups
    .flatMap((group) => group.findings)
    .find((finding) => finding.code === "AAF_ADAPTER_FALLBACK");

  assert.ok(fallbackIssue);
  assert.match(fallbackIssue?.description ?? "", /compatibility adapter payload/i);
  assert.ok(fallbackIssue?.affectedItems.some((item) => /unsupported segment kind/i.test(item)));
  assert.ok(fallbackIssue?.affectedItems.some((item) => /could not hydrate any clip events/i.test(item)));
});

test("importTurnoverFolderSync directly traverses broader AAF mob graphs and preserves locator and descriptor detail", () => {
  const result = importer.importTurnoverFolderSync(broaderAafGraphFixtureRoot);

  assert.equal(result.timeline.name, "RVR_208_R4_AAF_GRAPH");
  assert.equal(result.timeline.trackIds.length, 2);
  assert.equal(result.clipEvents.length, 3);
  assert.equal(result.markers.length, 3);

  const firstClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_110A_01_A");
  const speedClip = result.clipEvents.find((clipEvent) => clipEvent.clipName === "BOOM_110A_02_B");
  const locatorMarker = result.markers.find((marker) => marker.name === "ADR check");
  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));

  assert.equal(firstClip?.sourceFileName, "ROLL_110A_01.BWF");
  assert.equal(firstClip?.channelCount, 8);
  assert.equal(firstClip?.hasIXml, true);
  assert.match(firstClip?.clipNotes ?? "", /Source clip: SC_110A_A/);
  assert.match(firstClip?.clipNotes ?? "", /Media locator: AUDIO\/ROLL_110A_01\.BWF/);
  assert.equal(speedClip?.hasSpeedEffect, true);
  assert.equal(speedClip?.hasFadeIn, true);
  assert.equal(locatorMarker?.timecode, "01:00:32:00");
  assert.match(locatorMarker?.note ?? "", /Check lav rustle/);
  assert.ok(!issueCodes.includes("AAF_ADAPTER_FALLBACK"));
});

test("importTurnoverFolderSync succeeds on the shareable r2n-test-1 fixture tier and matches the committed lightweight expectation", () => {
  const lightweightRoot = createLightweightSampleCopy();

  try {
    const result = importer.importTurnoverFolderSync(lightweightRoot);
    const expectation = readJsonFixture<SampleExpectation>("expected-lightweight.json");
    const summary = summarizeRealSample(result);
    const otioAsset = result.sourceBundle.assets.find((asset) => asset.name === "Timeline 1.otio");
    const drtAsset = result.sourceBundle.assets.find((asset) => asset.name === "Timeline 1.drt");

    assert.deepEqual(summary, {
      ...expectation,
      productionAudio: [],
    });
    assert.equal(result.sourceBundle.sampleRate, 48000);
    assert.match(otioAsset?.note ?? "", /auxiliary reference artifact/i);
    assert.match(drtAsset?.note ?? "", /auxiliary reference artifact/i);
  } finally {
    rmSync(lightweightRoot, { recursive: true, force: true });
  }
});

if (privateSamplePresent && runPrivateSample) {
  test("importTurnoverFolderSync enriches r2n-test-1 from local private sample assets and matches the committed local-private expectation", () => {
    const result = importer.importTurnoverFolderSync(realResolveFixtureRoot);
    const expectation = readJsonFixture<SampleExpectation>("expected-local-private.json");
    const summary = summarizeRealSample(result);
    const stereoRoll = result.sourceBundle.assets.find((asset) => asset.name === "230407_002.WAV");

    assert.deepEqual(summary.issueCodes, expectation.issueCodes);
    assert.deepEqual(summary.timeline, expectation.timeline);
    assert.deepEqual(summary.productionAudio, expectation.productionAudio);
    assert.deepEqual(summary.fieldRecorder, expectation.fieldRecorder);
    assert.match(stereoRoll?.note ?? "", /Direct WAV scan found BWF\/LIST metadata but no explicit source timecode string/i);
    assert.match(stereoRoll?.note ?? "", /Editorial metadata CSV supplies source TC/i);
  });
} else {
  test("importTurnoverFolderSync enriches r2n-test-1 from local private sample assets and matches the committed local-private expectation", {
    skip: privateSampleReason,
  }, () => {});
}
