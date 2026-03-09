import assert from "node:assert/strict";
import test from "node:test";

import { getDeliveryHandoffBundle, getExternalExecutionPackage, getWriterAdapterBundle, getWriterRunBundle } from "../data-source";
import { prepareWriterRunTransportBundleSync } from "./writer-run-transport";

test("prepareWriterRunTransportBundleSync generates deterministic transport envelopes, dispatch records, and audit history", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const runBundle = getWriterRunBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(adapterBundle);
  assert.ok(runBundle);

  const bundle = prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle);
  const repeated = prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle);

  assert.equal(bundle.status, "receipt-recorded");
  assert.equal(bundle.transportResponse.status, "acknowledged");
  assert.equal(bundle.transportReceipt.status, "receipt-recorded");
  assert.equal(bundle.envelopes.length, 2);
  assert.ok(bundle.envelopes.every((envelope) => envelope.dispatchable));
  assert.ok(bundle.dispatchRecords.every((record) => record.status === "acknowledged"));
  assert.equal(bundle.transportReceipt.receiptRecordedCount, 2);
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-transport-envelopes.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-history.json")));
  assert.deepEqual(
    bundle.envelopes.map((envelope) => envelope.correlationId),
    repeated.envelopes.map((envelope) => envelope.correlationId),
  );
});

test("prepareWriterRunTransportBundleSync keeps blocked requests blocked before dispatch", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-203-r3");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-203-r3");
  const adapterBundle = getWriterAdapterBundle("job-rvr-203-r3");
  const runBundle = getWriterRunBundle("job-rvr-203-r3");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(adapterBundle);
  assert.ok(runBundle);

  const bundle = prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle);

  assert.equal(bundle.status, "runner-blocked");
  assert.equal(bundle.transportResponse.status, "runner-blocked");
  assert.ok(bundle.envelopes.every((envelope) => !envelope.dispatchable));
  assert.ok(bundle.dispatchRecords.every((record) => record.status === "runner-blocked"));
  assert.ok(bundle.history.every((item) => item.currentStatus === "runner-blocked"));
});

test("prepareWriterRunTransportBundleSync records timeout, cancellation, and retry state deterministically", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const runBundle = getWriterRunBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(adapterBundle);
  assert.ok(runBundle);

  const [firstRequest, secondRequest] = runBundle.request.requests;
  assert.ok(firstRequest);
  assert.ok(secondRequest);

  const bundle = prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle, {
    timedOutArtifactIds: [firstRequest.artifactId],
    cancelledArtifactIds: [secondRequest.artifactId],
  });

  const timedOutItem = bundle.history.find((item) => item.artifactId === firstRequest.artifactId);
  const cancelledItem = bundle.history.find((item) => item.artifactId === secondRequest.artifactId);

  assert.equal(bundle.status, "transport-failed");
  assert.equal(bundle.transportResponse.status, "transport-failed");
  assert.equal(timedOutItem?.currentStatus, "transport-failed");
  assert.equal(timedOutItem?.retryState.mode, "retryable");
  assert.equal(cancelledItem?.currentStatus, "cancelled");
  assert.equal(cancelledItem?.cancellationState.mode, "cancelled");
});

test("prepareWriterRunTransportBundleSync supports superseded request state when signatures change", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const runBundle = getWriterRunBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(adapterBundle);
  assert.ok(runBundle);

  const bundle = prepareWriterRunTransportBundleSync(packageBundle, handoffBundle, adapterBundle, runBundle, {
    supersededBy: {
      sourceSignature: `${runBundle.input.sourceSignature}::next`,
      reviewSignature: `${runBundle.input.reviewSignature}::next`,
    },
  });

  assert.equal(bundle.status, "cancelled");
  assert.ok(bundle.history.every((item) => item.cancellationState.mode === "superseded"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "superseded"));
});
