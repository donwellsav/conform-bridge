import assert from "node:assert/strict";
import test from "node:test";

import {
  getDeliveryHandoffBundle,
  getExecutorCompatibilityBundle,
  getExternalExecutionPackage,
  getWriterAdapterBundle,
  getWriterRunReceiptIngestionBundle,
  getWriterRunBundle,
  getWriterRunTransportAdapterBundle,
  getWriterRunTransportBundle,
} from "../data-source";
import type { WriterRunDispatchEnvelope, WriterRunReceiptSourceFile } from "../types";
import { prepareExecutorCompatibilityBundleSync } from "./executor-compatibility";
import { ingestWriterRunReceiptsSync } from "./writer-run-receipt-ingestion";
import { createDefaultWriterRunTransportAdapters } from "./writer-run-transport-registry";

function createReceiptSource(jobId: string, fileName: string, payload: Record<string, unknown>): WriterRunReceiptSourceFile {
  return {
    id: `source-${fileName.toLowerCase()}`,
    jobId,
    fileName,
    source: "filesystem-inbound",
    content: JSON.stringify(payload, null, 2),
  };
}

function createCanonicalReceiptPayload(
  packageId: string,
  sourceSignature: string,
  reviewSignature: string,
  deliveryPackageSignature: string,
  dispatchEnvelope: WriterRunDispatchEnvelope,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    version: 1,
    id: `receipt-${dispatchEnvelope.artifactId}`,
    adapterId: dispatchEnvelope.adapterId,
    transportId: dispatchEnvelope.transportId,
    dispatchId: dispatchEnvelope.dispatchId,
    correlationId: dispatchEnvelope.correlationId,
    packageId,
    requestId: dispatchEnvelope.requestId,
    artifactId: dispatchEnvelope.artifactId,
    fileName: dispatchEnvelope.fileName,
    sourceSignature,
    reviewSignature,
    deliveryPackageSignature,
    source: "filesystem-inbound",
    receiptSequence: 1,
    status: "completed",
    note: `Completed external execution receipt for ${dispatchEnvelope.fileName}.`,
    payload: {
      dispatchId: dispatchEnvelope.dispatchId,
    },
    ...overrides,
  };
}

function createCompatibilityReceiptPayload(
  packageId: string,
  sourceSignature: string,
  reviewSignature: string,
  deliveryPackageSignature: string,
  dispatchEnvelope: WriterRunDispatchEnvelope,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    profile: "compatibility-filesystem-receipt-v1",
    schemaVersion: 1,
    id: `compat-${dispatchEnvelope.artifactId}`,
    dispatch: {
      id: dispatchEnvelope.dispatchId,
      correlationId: dispatchEnvelope.correlationId,
      packageId,
      requestId: dispatchEnvelope.requestId,
    },
    artifact: {
      id: dispatchEnvelope.artifactId,
      fileName: dispatchEnvelope.fileName,
    },
    signatures: {
      sourceSignature,
      reviewSignature,
      deliveryPackageSignature,
    },
    transport: {
      adapterId: dispatchEnvelope.adapterId,
      transportId: dispatchEnvelope.transportId,
      source: "filesystem-inbound",
    },
    receipt: {
      sequence: 1,
      status: "completed",
      note: `Compatibility receipt for ${dispatchEnvelope.fileName}.`,
    },
    payload: {
      dispatchId: dispatchEnvelope.dispatchId,
    },
    ...overrides,
  };
}

function createMigratedCompatibilityReceiptPayload(
  packageId: string,
  sourceSignature: string,
  reviewSignature: string,
  deliveryPackageSignature: string,
  dispatchEnvelope: WriterRunDispatchEnvelope,
) {
  return {
    profile: "compatibility-filesystem-receipt-v1",
    schemaVersion: 0,
    dispatch: {
      dispatchId: dispatchEnvelope.dispatchId,
      correlationId: dispatchEnvelope.correlationId,
      package: packageId,
      request: dispatchEnvelope.requestId,
    },
    artifact: {
      artifactId: dispatchEnvelope.artifactId,
      name: dispatchEnvelope.fileName,
    },
    signatures: {
      source: sourceSignature,
      review: reviewSignature,
      delivery: deliveryPackageSignature,
    },
    transport: {
      adapterId: dispatchEnvelope.adapterId,
      transportId: dispatchEnvelope.transportId,
      source: "filesystem-inbound",
    },
    receipt: {
      sequence: 2,
      status: "completed",
      note: `Migrated compatibility receipt for ${dispatchEnvelope.fileName}.`,
    },
    payload: {
      dispatchId: dispatchEnvelope.dispatchId,
    },
  };
}

function createFuturePlaceholderReceiptPayload(
  packageId: string,
  sourceSignature: string,
  reviewSignature: string,
  deliveryPackageSignature: string,
  dispatchEnvelope: WriterRunDispatchEnvelope,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    profile: "future-service-transport-placeholder",
    schemaVersion: 2,
    id: `future-${dispatchEnvelope.artifactId}`,
    dispatchId: dispatchEnvelope.dispatchId,
    correlationId: dispatchEnvelope.correlationId,
    packageId,
    requestId: dispatchEnvelope.requestId,
    artifact: {
      id: dispatchEnvelope.artifactId,
      fileName: dispatchEnvelope.fileName,
    },
    signatures: {
      sourceSignature,
      reviewSignature,
      deliveryPackageSignature,
    },
    transport: {
      adapterId: dispatchEnvelope.adapterId,
      transportId: dispatchEnvelope.transportId,
      source: "filesystem-inbound",
    },
    result: {
      receiptSequence: 3,
      status: "partial",
      note: `Future placeholder receipt for ${dispatchEnvelope.fileName}.`,
    },
    payload: {
      dispatchId: dispatchEnvelope.dispatchId,
    },
    ...overrides,
  };
}

test("ingestWriterRunReceiptsSync imports matched canonical completed receipts deterministically", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  const compatibilityBundle = getExecutorCompatibilityBundle("job-rvr-205-aaf-only");
  assert.ok(compatibilityBundle);

  const receiptSources = adapterBundle.dispatchEnvelopes.map((dispatchEnvelope, index) =>
    createReceiptSource(
      packageBundle.jobId,
      `completed-${index + 1}.json`,
      createCanonicalReceiptPayload(
        packageBundle.id,
        packageBundle.sourceSignature,
        packageBundle.reviewSignature,
        packageBundle.deliveryPackageSignature,
        dispatchEnvelope,
        { receiptSequence: index + 1 },
      ),
    ),
  );

  const bundle = ingestWriterRunReceiptsSync(packageBundle, transportBundle, adapterBundle, receiptSources, compatibilityBundle);

  assert.equal(bundle.status, "completed");
  assert.equal(bundle.executorProfileId, "canonical-filesystem-executor-v1");
  assert.equal(bundle.transportReceipt.receiptNormalizedCount, 2);
  assert.equal(bundle.transportReceipt.receiptImportedCount, 2);
  assert.equal(bundle.transportReceipt.completedCount, 2);
  assert.ok(bundle.results.every((result) => result.importStatus === "receipt-imported"));
  assert.ok(bundle.results.every((result) => result.normalizationStatus === "normalized"));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-normalization.json")));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-compatibility-profiles.json")));
});

test("ingestWriterRunReceiptsSync normalizes compatibility receipts and records schema migration", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const writerAdapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const writerRunBundle = getWriterRunBundle("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  const compatibilityBundle = prepareExecutorCompatibilityBundleSync({
    packageBundle,
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle,
    transportBundle,
    transportAdapters: createDefaultWriterRunTransportAdapters(packageBundle.jobId),
    preferredProfileId: "compatibility-filesystem-executor-v1",
  });
  const [firstEnvelope, secondEnvelope] = adapterBundle.dispatchEnvelopes;
  assert.ok(firstEnvelope);
  assert.ok(secondEnvelope);

  const receiptSources: WriterRunReceiptSourceFile[] = [
    createReceiptSource(
      packageBundle.jobId,
      "compat-v1.json",
      createCompatibilityReceiptPayload(
        packageBundle.id,
        packageBundle.sourceSignature,
        packageBundle.reviewSignature,
        packageBundle.deliveryPackageSignature,
        firstEnvelope,
      ),
    ),
    createReceiptSource(
      packageBundle.jobId,
      "compat-v0.json",
      createMigratedCompatibilityReceiptPayload(
        packageBundle.id,
        packageBundle.sourceSignature,
        packageBundle.reviewSignature,
        packageBundle.deliveryPackageSignature,
        secondEnvelope,
      ),
    ),
  ];

  const bundle = ingestWriterRunReceiptsSync(packageBundle, transportBundle, adapterBundle, receiptSources, compatibilityBundle);

  assert.equal(bundle.transportReceipt.receiptImportedCount, 2);
  assert.equal(bundle.transportReceipt.receiptMigratedCount, 1);
  assert.equal(bundle.expectedReceiptProfile, "compatibility-filesystem-receipt-v1");
  assert.ok(bundle.results.some((result) => result.compatibilityProfile === "compatibility-filesystem-receipt-v1" && result.normalizationStatus === "normalized"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-migrated" && result.normalizationStatus === "migrated"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-migrated"));
});

test("ingestWriterRunReceiptsSync handles duplicate, stale, superseded, unmatched, invalid, incompatible, and partially-compatible receipts", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  const compatibilityBundle = getExecutorCompatibilityBundle("job-rvr-205-aaf-only");
  assert.ok(compatibilityBundle);
  const [firstEnvelope, secondEnvelope] = adapterBundle.dispatchEnvelopes;
  assert.ok(firstEnvelope);
  assert.ok(secondEnvelope);

  const baseReceipt = createCanonicalReceiptPayload(
    packageBundle.id,
    packageBundle.sourceSignature,
    packageBundle.reviewSignature,
    packageBundle.deliveryPackageSignature,
    firstEnvelope,
  );
  const receiptSources: WriterRunReceiptSourceFile[] = [
    createReceiptSource(packageBundle.jobId, "matched.json", baseReceipt),
    createReceiptSource(packageBundle.jobId, "duplicate.json", { ...baseReceipt, id: "receipt-duplicate", receiptSequence: 2 }),
    createReceiptSource(packageBundle.jobId, "stale.json", {
      ...baseReceipt,
      id: "receipt-stale",
      reviewSignature: `${packageBundle.reviewSignature}::stale`,
    }),
    createReceiptSource(packageBundle.jobId, "superseded.json", {
      ...baseReceipt,
      id: "receipt-superseded",
      correlationId: `${firstEnvelope.correlationId}::old`,
      dispatchId: `${firstEnvelope.dispatchId}::old`,
      sourceSignature: `${packageBundle.sourceSignature}::old`,
      reviewSignature: `${packageBundle.reviewSignature}::old`,
      deliveryPackageSignature: `${packageBundle.deliveryPackageSignature}::old`,
    }),
    createReceiptSource(packageBundle.jobId, "unmatched.json", {
      ...baseReceipt,
      id: "receipt-unmatched",
      correlationId: "writer-run-correlation-unmatched",
      dispatchId: "dispatch-unmatched",
      artifactId: "artifact-unmatched",
    }),
    createReceiptSource(
      packageBundle.jobId,
      "partial.json",
      createFuturePlaceholderReceiptPayload(
        packageBundle.id,
        packageBundle.sourceSignature,
        packageBundle.reviewSignature,
        packageBundle.deliveryPackageSignature,
        secondEnvelope,
      ),
    ),
    createReceiptSource(
      packageBundle.jobId,
      "incompatible.json",
      {
        profile: "future-service-transport-placeholder",
        schemaVersion: 99,
        dispatchId: "dispatch-broken",
        correlationId: "broken-correlation",
        artifact: {},
        signatures: {},
        result: {},
      },
    ),
    {
      id: "source-invalid.json",
      jobId: packageBundle.jobId,
      fileName: "invalid.json",
      source: "filesystem-inbound",
      content: "{\"version\":999}",
    },
  ];

  const bundle = ingestWriterRunReceiptsSync(packageBundle, transportBundle, adapterBundle, receiptSources, compatibilityBundle);

  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-imported"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-duplicate"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-stale" && result.signatureMatch === "drifted"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-superseded"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-unmatched"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-incompatible"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-incompatible"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-invalid"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "superseded"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-incompatible"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-invalid"));
});

test("ingestWriterRunReceiptsSync accepts compatibility-profile drift as partial when the executor profile allows it", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const handoffBundle = getDeliveryHandoffBundle("job-rvr-205-aaf-only");
  const writerAdapterBundle = getWriterAdapterBundle("job-rvr-205-aaf-only");
  const writerRunBundle = getWriterRunBundle("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(handoffBundle);
  assert.ok(writerAdapterBundle);
  assert.ok(writerRunBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  const compatibilityBundle = prepareExecutorCompatibilityBundleSync({
    packageBundle,
    handoffBundle,
    writerAdapterBundle,
    writerRunBundle,
    transportBundle,
    transportAdapters: createDefaultWriterRunTransportAdapters(packageBundle.jobId),
    preferredProfileId: "compatibility-filesystem-executor-v1",
  });
  const [envelope] = adapterBundle.dispatchEnvelopes;
  assert.ok(envelope);

  const bundle = ingestWriterRunReceiptsSync(
    packageBundle,
    transportBundle,
    adapterBundle,
    [
      createReceiptSource(
        packageBundle.jobId,
        "future-placeholder.json",
        createFuturePlaceholderReceiptPayload(
          packageBundle.id,
          packageBundle.sourceSignature,
          packageBundle.reviewSignature,
          packageBundle.deliveryPackageSignature,
          envelope,
        ),
      ),
    ],
    compatibilityBundle,
  );

  assert.equal(bundle.expectedReceiptProfile, "compatibility-filesystem-receipt-v1");
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-partial" && result.validationStatus === "partially-compatible"));
});

test("data-source exposes receipt-ingestion bundles for imported jobs", () => {
  const bundle = getWriterRunReceiptIngestionBundle("job-rvr-205-aaf-only");

  assert.ok(bundle);
  assert.ok(bundle.normalizationResults.length >= 0);
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-history.json")));
});
