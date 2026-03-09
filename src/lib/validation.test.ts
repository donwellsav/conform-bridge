import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { outputPresets } from "./mock-data";
import { planNuendoDeliverySync } from "./services/exporter";
import { importTurnoverFolderSync } from "./services/importer";
import { buildOperatorValidationIssues, rebuildAnalysisReport } from "./validation";

const fixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-203-r3");

test("validation rules add blocked-delivery and unresolved coverage without dropping importer reconciliation issues", () => {
  const imported = importTurnoverFolderSync(fixtureRoot);
  const outputPreset = outputPresets.find((preset) => preset.id === imported.job.outputPresetId);

  assert.ok(outputPreset);

  const existingIssues = imported.analysisReport.groups.flatMap((group) => group.findings);
  const deliveryPlan = planNuendoDeliverySync(
    imported.job,
    imported.translationModel,
    outputPreset,
    imported.analysisReport,
    imported.mappingProfile,
    existingIssues,
  );
  const validationIssues = buildOperatorValidationIssues({
    job: imported.job,
    sourceBundle: imported.sourceBundle,
    clipEvents: imported.clipEvents,
    markers: imported.markers,
    exportArtifacts: deliveryPlan.exportArtifacts,
    fieldRecorderCandidates: imported.fieldRecorderCandidates,
    mappingProfile: imported.mappingProfile,
    mappingRules: imported.mappingRules,
    existingIssues,
  });
  const report = rebuildAnalysisReport(
    imported.analysisReport,
    imported.sourceBundle,
    imported.clipEvents,
    imported.markers,
    deliveryPlan.exportArtifacts,
    validationIssues,
    imported.mappingProfile,
    imported.mappingRules,
    imported.fieldRecorderCandidates,
  );
  const codes = validationIssues.map((issue) => issue.code);

  assert.ok(codes.includes("MISSING_EXPECTED_FILE"));
  assert.ok(codes.includes("MISSING_PRODUCTION_ROLL"));
  assert.ok(codes.includes("UNRESOLVED_METADATA"));
  assert.ok(codes.includes("DELIVERY_ARTIFACT_BLOCKED"));
  assert.ok(codes.includes("TRACK_COUNT_MISMATCH"));
  assert.equal(report.blockedCount, deliveryPlan.exportArtifacts.filter((artifact) => artifact.status === "blocked").length);
  assert.match(report.deliveryReadinessSummary, /mapping review item/);
});
