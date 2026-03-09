import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import * as importerModule from "./importer";

const fcpxmlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-203-r3");
const edlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-204-edl-only");
const aafOnlyFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-205-aaf-only");
const aafVsFcpxmlFixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-206-aaf-vs-fcpxml");
const manifestPath = resolve(fcpxmlFixtureRoot, "editorial", "manifest.json");
const metadataPath = resolve(fcpxmlFixtureRoot, "editorial", "RVR_203_METADATA.csv");
const importer = ("default" in importerModule ? importerModule.default : importerModule) as typeof importerModule;

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
  assert.equal(result.analysisReport.warningCount, 6);
  assert.equal(result.analysisReport.blockedCount, 1);

  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));
  assert.ok(issueCodes.includes("MISSING_EXPECTED_FILE"));
  assert.ok(issueCodes.includes("MISSING_PRODUCTION_ROLL"));
  assert.ok(issueCodes.includes("TRACK_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("CLIP_TIMECODE_MISMATCH"));
  assert.ok(issueCodes.includes("MARKER_COUNT_MISMATCH"));
  assert.ok(issueCodes.includes("SOURCE_FILE_MISSING_FROM_INTAKE"));
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
  assert.ok(!issueCodes.includes("AAF_TRACK_COUNT_MISMATCH"));
  assert.ok(!issueCodes.includes("AAF_EXPECTED_MEDIA_MISSING"));
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
  assert.ok(issueCodes.includes("AAF_SOURCE_FILE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_REEL_TAPE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_MARKER_COVERAGE_MISMATCH"));
  assert.ok(issueCodes.includes("AAF_EXPECTED_MEDIA_MISSING"));
});
