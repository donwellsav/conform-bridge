import assert from "node:assert/strict";
import test from "node:test";

import { getExternalExecutionPackage } from "../data-source";
import { normalizeWriterAdapterInput, prepareWriterAdapterBundleSync } from "./writer-adapters";

test("normalizeWriterAdapterInput derives a stable adapter contract from the packaged external execution bundle", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  assert.ok(packageBundle);

  const input = normalizeWriterAdapterInput(packageBundle);

  assert.equal(input.version, 1);
  assert.equal(input.packageStatus, "ready");
  assert.equal(input.artifactInputs.length, 2);
  assert.deepEqual(
    input.artifactInputs.map((artifact) => artifact.requiredWriterCapability).sort((left, right) => left.localeCompare(right)),
    ["aaf_delivery_writer", "reference_video_handoff"],
  );
});

test("prepareWriterAdapterBundleSync matches deferred artifacts to available adapters and reports dry-run readiness", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  assert.ok(packageBundle);

  const bundle = prepareWriterAdapterBundleSync(packageBundle);
  const referenceAdapter = bundle.adapters.find((adapter) => adapter.id === "reference-noop-writer-adapter");
  const aafPlaceholder = bundle.adapters.find((adapter) => adapter.id === "future-nuendo-aaf-writer");

  assert.equal(bundle.readiness, "ready");
  assert.equal(bundle.artifactMatches.length, 2);
  assert.ok(bundle.artifactMatches.every((match) => match.matchedAdapterIds.includes("reference-noop-writer-adapter")));
  assert.equal(referenceAdapter?.validation.readiness, "ready");
  assert.equal(referenceAdapter?.dryRun.executionPlan.steps.length, 2);
  assert.equal(aafPlaceholder?.validation.readiness, "unsupported");
  assert.ok(aafPlaceholder?.validation.unsupportedReasons.some((reason) => reason.code === "adapter_not_implemented"));
});

test("prepareWriterAdapterBundleSync preserves blocked readiness and unsupported capability reporting", () => {
  const blockedPackage = getExternalExecutionPackage("job-rvr-203-r3");
  assert.ok(blockedPackage);

  const blockedBundle = prepareWriterAdapterBundleSync(blockedPackage);
  assert.equal(blockedBundle.readiness, "blocked");
  assert.ok(blockedBundle.adapters.some((adapter) => adapter.id === "reference-noop-writer-adapter" && adapter.validation.readiness === "blocked"));

  const readyPackage = getExternalExecutionPackage("job-rvr-205-aaf-only");
  assert.ok(readyPackage);

  const syntheticPackage = {
    ...readyPackage,
    status: "partial" as const,
    deferredInputsJson: {
      ...readyPackage.deferredInputsJson,
      inputs: readyPackage.deferredInputsJson.inputs.map((input, index) =>
        index === 0
          ? {
              ...input,
              requiredWriterCapability: "unsupported_writer_capability" as const,
              readinessStatus: "deferred-with-known-gaps" as const,
              blockers: ["No concrete writer capability exists for this deferred artifact."],
            }
          : input,
      ),
    },
  };

  const unsupportedBundle = prepareWriterAdapterBundleSync(syntheticPackage);
  const unsupportedMatch = unsupportedBundle.artifactMatches.find((match) => match.requiredCapability === "unsupported_writer_capability");

  assert.equal(unsupportedBundle.readiness, "unsupported");
  assert.equal(unsupportedMatch?.status, "unsupported");
  assert.equal(unsupportedMatch?.matchedAdapterIds.length, 0);
  assert.match(unsupportedMatch?.reason ?? "", /No registered writer adapter/i);
});
