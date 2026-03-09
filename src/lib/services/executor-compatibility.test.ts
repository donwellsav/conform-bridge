import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeliveryHandoffBundle,
  getExternalExecutionPackage,
  getExecutorCompatibilityBundle,
  getWriterAdapterBundle,
  getWriterRunBundle,
  getWriterRunTransportBundle,
} from "../data-source";
import { prepareExecutorCompatibilityBundleSync } from "./executor-compatibility";
import { createDefaultWriterRunTransportAdapters } from "./writer-run-transport-registry";

test("prepareExecutorCompatibilityBundleSync generates a deterministic canonical filesystem compatibility report", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const writerAdapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const writerRunBundle = getWriterRunBundle("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(transportBundle);

  const transportAdapters = createDefaultWriterRunTransportAdapters(packageBundle.jobId);
  const bundle = prepareExecutorCompatibilityBundleSync({
    packageBundle,
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle,
    transportBundle,
    transportAdapters,
  });
  const repeated = prepareExecutorCompatibilityBundleSync({
    packageBundle,
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle,
    transportBundle,
    transportAdapters,
  });

  assert.equal(bundle.profile.id, "canonical-filesystem-executor-v1");
  assert.equal(bundle.status, "compatible-with-warnings");
  assert.equal(bundle.profileResolution.selectedTransportProfile, "filesystem-transport-adapter@1");
  assert.equal(bundle.profileResolution.expectedReceiptProfile, "canonical-filesystem-transport-v1");
  assert.ok(bundle.result.issues.some((issue) => issue.code === "receipt_profile_warning"));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/executor-compatibility-report.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/executor-profile-resolution.json")));
  assert.deepEqual(bundle.result, repeated.result);
});

test("prepareExecutorCompatibilityBundleSync reports transport-profile incompatibility when only the noop transport profile is available", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const writerAdapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const writerRunBundle = getWriterRunBundle("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(transportBundle);

  const noopOnly = createDefaultWriterRunTransportAdapters(packageBundle.jobId)
    .filter((adapter) => adapter.id === "reference-noop-transport-adapter");
  const bundle = prepareExecutorCompatibilityBundleSync({
    packageBundle,
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle,
    transportBundle,
    transportAdapters: noopOnly,
    preferredProfileId: "canonical-filesystem-executor-v1",
  });

  assert.equal(bundle.status, "incompatible");
  assert.ok(bundle.result.issues.some((issue) => issue.code === "unsupported_transport_profile"));
  assert.ok(bundle.result.unsupportedReasons.some((reason) => reason.code === "transport_profile_not_supported"));
});

test("prepareExecutorCompatibilityBundleSync surfaces blocked compatibility for signature drift and unsupported versions", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const writerAdapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const writerRunBundle = getWriterRunBundle("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(transportBundle);

  const bundle = prepareExecutorCompatibilityBundleSync({
    packageBundle: {
      ...packageBundle,
      version: 99 as typeof packageBundle.version,
    },
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle: {
      ...writerRunBundle,
      input: {
        ...writerRunBundle.input,
        reviewSignature: `${writerRunBundle.input.reviewSignature}::drifted`,
      },
    },
    transportBundle,
    transportAdapters: createDefaultWriterRunTransportAdapters(packageBundle.jobId),
  });

  assert.equal(bundle.status, "unsupported");
  assert.ok(bundle.result.issues.some((issue) => issue.code === "unsupported_package_version"));
  assert.ok(bundle.result.issues.some((issue) => issue.code === "signature_mismatch"));
});

test("data-source exposes executor compatibility bundles for imported jobs", () => {
  const bundle = getExecutorCompatibilityBundle("job-rvr-205-aaf-only");

  assert.ok(bundle);
  assert.equal(bundle.profile.id, "canonical-filesystem-executor-v1");
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/executor-compatibility-summary.json")));
});
