import assert from "node:assert/strict";
import test from "node:test";

import * as dataSource from "./data-source";

test("imported fixture data flows through exporter planning into dashboard and job selectors", () => {
  assert.equal(dataSource.dataMode, "imported");
  assert.equal(dataSource.jobs.length, 4);

  const job = dataSource.jobs[0];
  assert.ok(job);

  const deliveryPackage = dataSource.getDeliveryPackage(job.deliveryPackageId);
  const exportArtifacts = dataSource.getExportArtifacts(job.id);
  const dashboardMetric = dataSource.dashboardMetrics.find((metric) => metric.label === "Planned delivery files");
  const deliveryActivity = dataSource.activityFeed.find((item) => item.id.endsWith("-delivery"));

  assert.ok(deliveryPackage);
  assert.equal(exportArtifacts.length, 8);
  assert.equal(deliveryPackage?.artifacts.length, 8);
  assert.equal(exportArtifacts.filter((artifact) => artifact.status === "blocked").length, 1);
  assert.equal(dashboardMetric?.value, String(dataSource.jobs.length * 8).padStart(2, "0"));
  assert.match(dashboardMetric?.note ?? "", /exporter\.ts/);
  assert.match(deliveryActivity?.title ?? "", /exporter plan refreshed/i);
});
