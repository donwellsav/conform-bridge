import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import * as importerModule from "./importer";

const fixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-203-r3");
const manifestPath = resolve(fixtureRoot, "editorial", "manifest.json");
const metadataPath = resolve(fixtureRoot, "editorial", "RVR_203_METADATA.csv");
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

test("importTurnoverFolderSync classifies intake assets and stops at canonical hydration", () => {
  const result = importer.importTurnoverFolderSync(fixtureRoot);

  assert.equal(result.sourceBundle.stage, "intake");
  assert.equal(result.sourceBundle.folderPath, "fixtures/intake/rvr-203-r3");
  assert.equal(result.translationModel.sourceBundleId, result.sourceBundle.id);
  assert.equal(result.timeline.startFrame, 86400);
  assert.equal(result.timeline.trackIds.length, 3);
  assert.equal(result.clipEvents.length, 3);
  assert.equal(result.markers.length, 2);

  const manifestAsset = result.sourceBundle.assets.find((asset) => asset.name === "manifest.json");
  const aafAsset = result.sourceBundle.assets.find((asset) => asset.name === "RVR_203_R3_LOCK.aaf");
  const productionRoll = result.sourceBundle.assets.find((asset) => asset.name === "ROLL_054A_01.BWF");
  const missingRoll = result.sourceBundle.assets.find((asset) => asset.name === "ROLL_054B_02.BWF");

  assert.equal(manifestAsset?.fileRole, "intake_manifest");
  assert.equal(manifestAsset?.origin, "editorial");
  assert.equal(aafAsset?.fileKind, "aaf");
  assert.equal(aafAsset?.origin, "resolve");
  assert.equal(productionRoll?.origin, "production-audio");
  assert.equal(missingRoll?.status, "missing");

  assert.equal(result.analysisReport.totals.trackCount, 3);
  assert.equal(result.analysisReport.totals.clipCount, 3);
  assert.equal(result.analysisReport.totals.markerCount, 2);
  assert.equal(result.analysisReport.totals.offlineAssetCount, 1);
  assert.equal(result.analysisReport.highRiskCount, 1);
  assert.equal(result.analysisReport.warningCount, 3);
  assert.equal(result.analysisReport.blockedCount, 1);

  const issueCodes = result.analysisReport.groups.flatMap((group) => group.findings.map((finding) => finding.code));
  assert.ok(issueCodes.includes("MISSING_EXPECTED_FILE"));
  assert.ok(issueCodes.includes("MISSING_PRODUCTION_ROLL"));
  assert.ok(issueCodes.includes("UNRESOLVED_METADATA"));
  assert.ok(issueCodes.includes("DELIVERY_ARTIFACT_BLOCKED"));
  assert.ok(!("deliveryPackage" in result));
});
