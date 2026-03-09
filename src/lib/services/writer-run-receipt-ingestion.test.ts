import assert from "node:assert/strict";
import test from "node:test";

import {
  getExternalExecutionPackage,
  getWriterRunReceiptIngestionBundle,
  getWriterRunTransportAdapterBundle,
  getWriterRunTransportBundle,
} from "../data-source";
import type { WriterRunReceiptEnvelope, WriterRunReceiptSourceFile } from "../types";
import { ingestWriterRunReceiptsSync } from "./writer-run-receipt-ingestion";

function createReceiptSource(
  jobId: string,
  fileName: string,
  envelope: WriterRunReceiptEnvelope,
  overrides: Partial<WriterRunReceiptEnvelope> = {},
): WriterRunReceiptSourceFile {
  return {
    id: `source-${fileName.toLowerCase()}`,
    jobId,
    fileName,
    source: "filesystem-inbound",
    content: JSON.stringify({
      ...envelope,
      ...overrides,
    }, null, 2),
  };
}

test("ingestWriterRunReceiptsSync imports matched completed receipts deterministically", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  assert.ok(adapterBundle.dispatchEnvelopes[0]);
  assert.ok(adapterBundle.dispatchEnvelopes[1]);

  const receiptSources = adapterBundle.dispatchEnvelopes.map((dispatchEnvelope, index) =>
    createReceiptSource(
      packageBundle.jobId,
      `completed-${index + 1}.json`,
      {
        version: 1,
        id: `receipt-${dispatchEnvelope.artifactId}`,
        adapterId: dispatchEnvelope.adapterId,
        transportId: dispatchEnvelope.transportId,
        dispatchId: dispatchEnvelope.dispatchId,
        correlationId: dispatchEnvelope.correlationId,
        packageId: packageBundle.id,
        requestId: dispatchEnvelope.requestId,
        artifactId: dispatchEnvelope.artifactId,
        fileName: dispatchEnvelope.fileName,
        sourceSignature: packageBundle.sourceSignature,
        reviewSignature: packageBundle.reviewSignature,
        deliveryPackageSignature: packageBundle.deliveryPackageSignature,
        source: "filesystem-inbound",
        receiptSequence: index + 1,
        status: "completed",
        note: `Completed external execution receipt ${index + 1}.`,
        payload: {
          dispatchId: dispatchEnvelope.dispatchId,
        },
      },
    ),
  );

  const bundle = ingestWriterRunReceiptsSync(packageBundle, transportBundle, adapterBundle, receiptSources);

  assert.equal(bundle.status, "completed");
  assert.equal(bundle.transportReceipt.receiptImportedCount, 2);
  assert.equal(bundle.transportReceipt.completedCount, 2);
  assert.ok(bundle.results.every((result) => result.importStatus === "receipt-imported"));
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-import-results.json")));
});

test("ingestWriterRunReceiptsSync classifies duplicate, stale, unmatched, and invalid receipts", () => {
  const packageBundle = getExternalExecutionPackage("job-rvr-205-aaf-only");
  const transportBundle = getWriterRunTransportBundle("job-rvr-205-aaf-only");
  const adapterBundle = getWriterRunTransportAdapterBundle("job-rvr-205-aaf-only");

  assert.ok(packageBundle);
  assert.ok(transportBundle);
  assert.ok(adapterBundle);
  const [firstEnvelope] = adapterBundle.dispatchEnvelopes;
  assert.ok(firstEnvelope);

  const baseReceipt: WriterRunReceiptEnvelope = {
    version: 1,
    id: `receipt-${firstEnvelope.artifactId}`,
    adapterId: firstEnvelope.adapterId,
    transportId: firstEnvelope.transportId,
    dispatchId: firstEnvelope.dispatchId,
    correlationId: firstEnvelope.correlationId,
    packageId: packageBundle.id,
    requestId: firstEnvelope.requestId,
    artifactId: firstEnvelope.artifactId,
    fileName: firstEnvelope.fileName,
    sourceSignature: packageBundle.sourceSignature,
    reviewSignature: packageBundle.reviewSignature,
    deliveryPackageSignature: packageBundle.deliveryPackageSignature,
    source: "filesystem-inbound",
    receiptSequence: 1,
    status: "completed",
    note: "Imported complete receipt.",
    payload: {
      dispatchId: firstEnvelope.dispatchId,
    },
  };
  const receiptSources: WriterRunReceiptSourceFile[] = [
    createReceiptSource(packageBundle.jobId, "matched.json", baseReceipt),
    createReceiptSource(packageBundle.jobId, "duplicate.json", baseReceipt, { id: "receipt-duplicate", receiptSequence: 2 }),
    createReceiptSource(packageBundle.jobId, "stale.json", baseReceipt, {
      id: "receipt-stale",
      sourceSignature: `${packageBundle.sourceSignature}::stale`,
    }),
    createReceiptSource(packageBundle.jobId, "unmatched.json", baseReceipt, {
      id: "receipt-unmatched",
      correlationId: "writer-run-correlation-unmatched",
      dispatchId: "dispatch-unmatched",
      artifactId: "artifact-unmatched",
    }),
    {
      id: "source-invalid.json",
      jobId: packageBundle.jobId,
      fileName: "invalid.json",
      source: "filesystem-inbound",
      content: "{\"version\":999}",
    },
  ];

  const bundle = ingestWriterRunReceiptsSync(packageBundle, transportBundle, adapterBundle, receiptSources);

  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-imported"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-duplicate"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-stale"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-unmatched"));
  assert.ok(bundle.results.some((result) => result.importStatus === "receipt-invalid"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-duplicate"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-stale"));
  assert.ok(bundle.auditRecord.events.some((event) => event.eventType === "receipt-invalid"));
});

test("data-source exposes receipt-ingestion bundles for imported jobs", () => {
  const bundle = getWriterRunReceiptIngestionBundle("job-rvr-205-aaf-only");

  assert.ok(bundle);
  assert.ok(bundle.entries.some((entry) => entry.relativePath.endsWith("/handoff/writer-run-receipt-history.json")));
});
