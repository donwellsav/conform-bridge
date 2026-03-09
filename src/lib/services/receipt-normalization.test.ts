import assert from "node:assert/strict";
import test from "node:test";

import type { WriterRunReceiptSourceFile } from "../types";
import { normalizeReceiptSource } from "./receipt-normalization";

function createSource(fileName: string, payload: Record<string, unknown>): WriterRunReceiptSourceFile {
  return {
    id: `receipt-source-${fileName.toLowerCase()}`,
    jobId: "job-test",
    fileName,
    source: "filesystem-inbound",
    content: JSON.stringify(payload, null, 2),
  };
}

test("normalizeReceiptSource normalizes canonical filesystem receipts", () => {
  const result = normalizeReceiptSource(createSource("canonical.json", {
    version: 1,
    id: "receipt-canonical",
    adapterId: "filesystem-transport-adapter",
    transportId: "reference-noop-transport",
    dispatchId: "dispatch-1",
    correlationId: "correlation-1",
    packageId: "package-1",
    requestId: "request-1",
    artifactId: "artifact-1",
    fileName: "RVR_205_NUENDO_READY.aaf",
    sourceSignature: "source-1",
    reviewSignature: "review-1",
    deliveryPackageSignature: "delivery-1",
    source: "filesystem-inbound",
    receiptSequence: 1,
    status: "completed",
    note: "Canonical receipt.",
    payload: { dispatchId: "dispatch-1" },
  }));

  assert.equal(result.status, "normalized");
  assert.equal(result.compatibilityProfile, "canonical-filesystem-transport-v1");
  assert.equal(result.envelope?.artifactId, "artifact-1");
  assert.equal(result.payloadSource, "canonical-json");
});

test("normalizeReceiptSource normalizes compatibility filesystem receipts", () => {
  const result = normalizeReceiptSource(createSource("compatibility.json", {
    profile: "compatibility-filesystem-receipt-v1",
    schemaVersion: 1,
    dispatch: {
      id: "dispatch-2",
      correlationId: "correlation-2",
      packageId: "package-2",
      requestId: "request-2",
    },
    artifact: {
      id: "artifact-2",
      fileName: "RVR_205_REF.mov",
    },
    signatures: {
      sourceSignature: "source-2",
      reviewSignature: "review-2",
      deliveryPackageSignature: "delivery-2",
    },
    transport: {
      adapterId: "filesystem-transport-adapter",
      transportId: "reference-noop-transport",
      source: "filesystem-inbound",
    },
    receipt: {
      sequence: 2,
      status: "completed",
      note: "Compatibility receipt.",
    },
    payload: { dispatchId: "dispatch-2" },
  }));

  assert.equal(result.status, "normalized");
  assert.equal(result.compatibilityProfile, "compatibility-filesystem-receipt-v1");
  assert.equal(result.envelope?.dispatchId, "dispatch-2");
  assert.equal(result.payloadSource, "compatibility-json");
});

test("normalizeReceiptSource migrates older compatibility schemas", () => {
  const result = normalizeReceiptSource(createSource("compatibility-v0.json", {
    profile: "compatibility-filesystem-receipt-v1",
    schemaVersion: 0,
    dispatch: {
      dispatchId: "dispatch-3",
      correlationId: "correlation-3",
      package: "package-3",
      request: "request-3",
    },
    artifact: {
      artifactId: "artifact-3",
      name: "RVR_205_MARKERS.csv",
    },
    signatures: {
      source: "source-3",
      review: "review-3",
      delivery: "delivery-3",
    },
    transport: {
      adapterId: "filesystem-transport-adapter",
      transportId: "reference-noop-transport",
      source: "filesystem-inbound",
    },
    receipt: {
      sequence: 3,
      status: "completed",
      note: "Migrated compatibility receipt.",
    },
    payload: { dispatchId: "dispatch-3" },
  }));

  assert.equal(result.status, "migrated");
  assert.equal(result.envelope?.dispatchId, "dispatch-3");
  assert.ok(result.warnings.some((warning) => warning.code === "migrated_version"));
});

test("normalizeReceiptSource preserves future placeholder receipts as partially compatible", () => {
  const result = normalizeReceiptSource(createSource("future.json", {
    profile: "future-service-transport-placeholder",
    schemaVersion: 2,
    id: "future-receipt",
    dispatchId: "dispatch-4",
    correlationId: "correlation-4",
    packageId: "package-4",
    requestId: "request-4",
    artifact: {
      id: "artifact-4",
      fileName: "RVR_205_NUENDO_READY.aaf",
    },
    signatures: {
      sourceSignature: "source-4",
      reviewSignature: "review-4",
      deliveryPackageSignature: "delivery-4",
    },
    result: {
      receiptSequence: 4,
      status: "partial",
      note: "Future placeholder receipt.",
    },
  }));

  assert.equal(result.status, "partially-compatible");
  assert.equal(result.compatibilityProfile, "future-service-transport-placeholder");
  assert.ok(result.envelope);
  assert.ok(result.warnings.some((warning) => warning.code === "future_profile_partial"));
});
