import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import { outputPresets } from "../mock-data";
import * as exporterModule from "./exporter";
import * as importerModule from "./importer";

const fixtureRoot = resolve(process.cwd(), "fixtures", "intake", "rvr-203-r3");
const importer = ("default" in importerModule ? importerModule.default : importerModule) as typeof importerModule;
const exporter = ("default" in exporterModule ? exporterModule.default : exporterModule) as typeof exporterModule;

test("planNuendoDeliverySync generates deterministic planned and blocked delivery artifacts", () => {
  const imported = importer.importTurnoverFolderSync(fixtureRoot);
  const outputPreset = outputPresets.find((preset) => preset.id === imported.job.outputPresetId);

  assert.ok(outputPreset);

  const preservationIssues = imported.analysisReport.groups.flatMap((group) => group.findings);
  const plan = exporter.planNuendoDeliverySync(
    imported.job,
    imported.translationModel,
    outputPreset,
    imported.analysisReport,
    imported.mappingProfile,
    preservationIssues,
  );

  assert.equal(plan.deliveryPackage.id, imported.job.deliveryPackageId);
  assert.equal(plan.deliveryPackage.outputPresetId, outputPreset.id);
  assert.equal(plan.exportArtifacts.length, 8);

  const plannedAaf = plan.exportArtifacts.find((artifact) => artifact.fileRole === "timeline_exchange");
  const markerCsv = plan.exportArtifacts.find((artifact) => artifact.fileRole === "marker_export" && artifact.fileKind === "csv");
  const manifest = plan.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_manifest");
  const readme = plan.exportArtifacts.find((artifact) => artifact.fileRole === "delivery_readme");
  const referenceVideo = plan.exportArtifacts.find((artifact) => artifact.fileRole === "reference_video");
  const fieldRecorderReport = plan.exportArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report");

  assert.equal(plannedAaf?.status, "planned");
  assert.equal(markerCsv?.status, "planned");
  assert.equal(manifest?.status, "planned");
  assert.equal(readme?.status, "planned");
  assert.equal(referenceVideo?.status, "planned");
  assert.equal(fieldRecorderReport?.status, "blocked");
  assert.match(plan.deliveryPackage.deliverySummary, /Exporter planned 7 artifact\(s\), blocked 1, and left 0 as placeholders\./);
});
