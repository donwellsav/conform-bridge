import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import * as dataSource from "./data-source";

test("fixture matrix report matches the committed real-sample acceptance matrix", () => {
  const expectation = JSON.parse(
    readFileSync(resolve(process.cwd(), "fixtures", "expectations", "sample-matrix.json"), "utf8"),
  );

  assert.deepEqual(dataSource.fixtureMatrixReport, expectation);
});

test("real sample jobs expose stable AAF role classification in their source snapshots", () => {
  for (const entry of dataSource.fixtureMatrix) {
    const job = dataSource.getJob(entry.jobId);

    assert.ok(job);
    assert.equal(job?.sourceSnapshot.aafRole, entry.aaf.role);
    assert.equal(job?.sourceSnapshot.aafIntakeStatus, entry.aaf.intakeStatus);
    assert.equal(job?.sourceSnapshot.aafContainerKind, entry.aaf.containerKind);
    assert.equal(job?.sourceSnapshot.aafDirectCoverage, entry.aaf.directCoverage);
    assert.equal(job?.sourceSnapshot.aafRoleReason, entry.aaf.reason);
    assert.deepEqual(job?.sourceSnapshot.aafDiagnostics, entry.aaf.diagnostics);
  }
});
