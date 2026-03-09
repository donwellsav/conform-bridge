import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { getExecutorCompatibilityBundle, getExternalExecutionPackage, getWriterRunTransportBundle } from "../data-source";
import { writeWriterRunTransportAdapterBundleSync } from "./writer-run-transport-adapters-write";
import { prepareWriterRunTransportAdapterBundleSync } from "./writer-run-transport-adapters";

test("prepareWriterRunTransportAdapterBundleSync prefers the filesystem adapter and builds deterministic outbound dispatch packages", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  const compatibilityBundle = getExecutorCompatibilityBundle("job-rvr-205-aaf-only");
  assert.ok(compatibilityBundle);

  const bundle = prepareWriterRunTransportAdapterBundleSync(packageBundle, transportBundle, undefined, compatibilityBundle);
  const repeated = prepareWriterRunTransportAdapterBundleSync(packageBundle, transportBundle, undefined, compatibilityBundle);

  assert.equal(bundle.activeAdapterId, "filesystem-transport-adapter");
  assert.equal(bundle.readiness, "ready");
  assert.equal(bundle.executorProfileId, "canonical-filesystem-executor-v1");
  assert.equal(bundle.dispatchEnvelopes.length, transportBundle.envelopes.length);
  assert.ok(bundle.dispatchEnvelopes.every((envelope) => envelope.expectedReceiptProfile === "canonical-filesystem-transport-v1"));
  assert.ok(bundle.dispatchEnvelopes.every((envelope) => envelope.executorProfileId === "canonical-filesystem-executor-v1"));
  assert.ok(bundle.dispatchEnvelopes.every((envelope) => envelope.files.length >= 4));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-transport-adapters.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-compatibility-profiles.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.includes("/transport/job-rvr-205-aaf-only/outbound/")));
  assert.deepEqual(
    bundle.dispatchResults.map((result) => result.id),
    repeated.dispatchResults.map((result) => result.id),
  );
});

test("writeWriterRunTransportAdapterBundleSync materializes deterministic outbound filesystem dispatch layout", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  const compatibilityBundle = getExecutorCompatibilityBundle("job-rvr-205-aaf-only");
  assert.ok(compatibilityBundle);

  const bundle = prepareWriterRunTransportAdapterBundleSync(packageBundle, transportBundle, undefined, compatibilityBundle);
  const tempRoot = path.join(os.tmpdir(), `conform-bridge-transport-${process.pid}-${Date.now()}`);

  try {
    const writtenPaths = writeWriterRunTransportAdapterBundleSync(bundle, tempRoot);

    assert.ok(writtenPaths.some((writtenPath) => writtenPath.endsWith(`${path.sep}handoff${path.sep}writer-run-dispatch-results.json`)));
    assert.ok(writtenPaths.some((writtenPath) => writtenPath.endsWith(`${path.sep}envelope.json`)));
    assert.ok(writtenPaths.some((writtenPath) => writtenPath.endsWith(`${path.sep}receipt-compatibility-profile.json`)));
    assert.ok(existsSync(path.join(tempRoot, ...bundle.entries[0]!.relativePath.split("/"))));
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

test("prepareWriterRunTransportAdapterBundleSync keeps blocked envelopes explicit for non-dispatchable packages", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-203-r3");
  const transportBundle = getWriterRunTransportBundle("job-rvr-203-r3");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  const compatibilityBundle = getExecutorCompatibilityBundle("job-rvr-203-r3");
  assert.ok(compatibilityBundle);

  const bundle = prepareWriterRunTransportAdapterBundleSync(packageBundle, transportBundle, undefined, compatibilityBundle);

  assert.equal(bundle.activeAdapterId, "filesystem-transport-adapter");
  assert.equal(bundle.executorReadiness, "blocked");
  assert.equal(bundle.adapters.find((adapter) => adapter.id === "filesystem-transport-adapter")?.validation.readiness, "blocked");
  assert.ok(bundle.dispatchResults.every((result) => result.status !== "dispatched"));
});
