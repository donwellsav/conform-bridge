import assert from "node:assert/strict";
import test from "node:test";

import { getExternalExecutionPackage, getWriterAdapterBundle } from "../data-source";
import { prepareWriterRunBundleSync } from "./writer-runner";

test("prepareWriterRunBundleSync generates deterministic runnable requests, responses, and receipts", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const adapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(adapterBundle);

  const bundle = prepareWriterRunBundleSync(packageBundle, adapterBundle);

  assert.equal(bundle.readiness, "ready");
  assert.equal(bundle.request.readiness, "ready");
  assert.equal(bundle.response.status, "simulated-noop");
  assert.equal(bundle.receipt.summary.runnableCount, 2);
  assert.equal(bundle.receipt.summary.simulatedCount, 2);
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-requests.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-responses.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipts.json")));
  assert.equal(bundle.request.sourceSignature, packageBundle.sourceSignature);
  assert.equal(bundle.request.reviewSignature, packageBundle.reviewSignature);
});

test("prepareWriterRunBundleSync keeps blocked requests blocked when deferred prerequisites are unresolved", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-203-r3");
  const adapterBundle = getWriterAdapterBundle("job-rvr-203-r3");

  assert.ok(packageBundle);
  assert.ok(adapterBundle);

  const bundle = prepareWriterRunBundleSync(packageBundle, adapterBundle);

  assert.equal(bundle.readiness, "blocked");
  assert.equal(bundle.request.readiness, "blocked");
  assert.equal(bundle.response.status, "blocked");
  assert.ok(bundle.request.requests.every((request) => request.requestReadiness === "blocked"));
  assert.ok(bundle.receipt.artifacts.every((artifact) => artifact.responseStatus === "blocked"));
});

test("prepareWriterRunBundleSync preserves unsupported runner records when no runner matches the adapter output", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const adapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(adapterBundle);

  const unsupportedAdapterBundle = {
    ...adapterBundle,
    input: {
      ...adapterBundle.input,
      artifactInputs: adapterBundle.input.artifactInputs.map((artifact, index) =>
        index === 0
          ? {
              ...artifact,
              requiredWriterCapability: "unsupported_writer_capability" as const,
            }
          : artifact,
      ),
    },
    artifactMatches: adapterBundle.artifactMatches.map((match, index) =>
      index === 0
        ? {
            ...match,
            requiredCapability: "unsupported_writer_capability" as const,
            matchedAdapterIds: [],
            status: "unsupported" as const,
            reason: "No registered writer adapter currently matches unsupported_writer_capability.",
          }
        : match,
    ),
  };

  const bundle = prepareWriterRunBundleSync(packageBundle, unsupportedAdapterBundle);
  const unsupportedRequest = bundle.request.requests.find((request) => request.requiredCapability === "unsupported_writer_capability");

  assert.equal(bundle.readiness, "unsupported");
  assert.equal(unsupportedRequest?.requestReadiness, "unsupported");
  assert.equal(unsupportedRequest?.runnerId, undefined);
  assert.ok(unsupportedRequest?.blockedReasons.some((reason) => reason.code === "runner_not_available"));
  assert.ok(bundle.receipt.artifacts.some((artifact) => artifact.responseStatus === "unsupported"));
});
