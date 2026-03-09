import { joinPath, stableToken } from "./writer-run-audit";
import { createDefaultWriterRunTransportAdapters } from "./writer-run-transport-registry";
import type {
  ExternalExecutionPackage,
  WriterRunDispatchEnvelope,
  WriterRunDispatchFile,
  WriterRunDispatchResult,
  WriterRunDispatchResultStatus,
  WriterRunTransportAdapter,
  WriterRunTransportAdapterBundle,
  WriterRunTransportAdapterEntry,
  WriterRunTransportBundle,
} from "../types";

function sortResults(results: WriterRunDispatchResult[]) {
  return [...results].sort((left, right) => left.fileName.localeCompare(right.fileName) || left.id.localeCompare(right.id));
}

function chooseActiveAdapter(adapters: WriterRunTransportAdapter[]) {
  return [...adapters].sort((left, right) =>
    left.id === "filesystem-transport-adapter"
      ? -1
      : right.id === "filesystem-transport-adapter"
        ? 1
        : left.label.localeCompare(right.label),
  )[0];
}

function createDispatchId(jobId: string, artifactId: string, correlationId: string) {
  return `dispatch-${jobId}-${artifactId}-${stableToken(jobId, artifactId, correlationId)}`;
}

function createDispatchFiles(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  envelope: WriterRunTransportBundle["envelopes"][number],
  dispatchId: string,
  relativeOutboundRoot: string,
): WriterRunDispatchFile[] {
  const packageEntrySummaries = packageBundle.entries
    .map((entry) => ({
      relativePath: entry.relativePath,
      layer: entry.layer,
      classification: entry.classification,
      summary: entry.summary,
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const transportHistory = transportBundle.history.find((item) => item.artifactId === envelope.artifactId);
  const packageReference = {
    schemaVersion: 1,
    dispatchId,
    packageId: packageBundle.id,
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    sourceSignature: envelope.sourceSignature,
    reviewSignature: envelope.reviewSignature,
    deliveryPackageSignature: envelope.deliveryPackageSignature,
    currentTransportStatus: transportHistory?.currentStatus ?? envelope.envelopeStatus,
    packageReferences: packageEntrySummaries,
  };
  const summary = {
    schemaVersion: 1,
    dispatchId,
    adapterId: "filesystem-transport-adapter",
    transportId: envelope.transportId,
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    dispatchable: envelope.dispatchable,
    dispatchReason: envelope.dispatchReason,
    dependencyIds: envelope.dependencyIds,
    blockedReasons: envelope.blockedReasons,
    outboundRoot: relativeOutboundRoot,
  };

  return [
    {
      relativePath: joinPath(relativeOutboundRoot, "envelope.json"),
      fileName: "envelope.json",
      mimeType: "application/json",
      content: JSON.stringify(envelope, null, 2),
      summary: `Dispatch envelope for ${envelope.fileName}.`,
    },
    {
      relativePath: joinPath(relativeOutboundRoot, "dispatch-summary.json"),
      fileName: "dispatch-summary.json",
      mimeType: "application/json",
      content: JSON.stringify(summary, null, 2),
      summary: `Dispatch summary for ${envelope.fileName}.`,
    },
    {
      relativePath: joinPath(relativeOutboundRoot, "package-reference.json"),
      fileName: "package-reference.json",
      mimeType: "application/json",
      content: JSON.stringify(packageReference, null, 2),
      summary: `Package and transport references for ${envelope.fileName}.`,
    },
  ];
}

function createDispatchEnvelope(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  adapter: WriterRunTransportAdapter,
  envelope: WriterRunTransportBundle["envelopes"][number],
): WriterRunDispatchEnvelope {
  const dispatchId = createDispatchId(packageBundle.jobId, envelope.artifactId, envelope.correlationId);
  const relativeOutboundRoot = joinPath(adapter.endpoint.outboundPath, dispatchId);
  const files = createDispatchFiles(packageBundle, transportBundle, envelope, dispatchId, relativeOutboundRoot);
  const dispatchStatus: WriterRunDispatchResultStatus = envelope.dispatchable ? "dispatched" : envelope.envelopeStatus === "cancelled" ? "blocked" : "dispatch-failed";

  return {
    version: 1,
    id: `writer-run-dispatch-envelope-${envelope.artifactId}-${stableToken(dispatchId, envelope.id)}`,
    adapterId: adapter.id,
    transportId: envelope.transportId,
    dispatchId,
    correlationId: envelope.correlationId,
    jobId: envelope.jobId,
    deliveryPackageId: envelope.deliveryPackageId,
    packageId: packageBundle.id,
    requestId: envelope.requestId,
    requestArtifactId: envelope.requestArtifactId,
    responseId: envelope.responseId,
    receiptId: envelope.receiptId,
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    requestReadiness: envelope.requestReadiness,
    dispatchStatus,
    dispatchable: envelope.dispatchable,
    dispatchReason: envelope.dispatchReason,
    sourceSignature: envelope.sourceSignature,
    reviewSignature: envelope.reviewSignature,
    deliveryPackageSignature: envelope.deliveryPackageSignature,
    adapterIdUsed: envelope.adapterId,
    runnerId: envelope.runnerId,
    endpoint: adapter.endpoint,
    outboundRoot: adapter.endpoint.outboundPath,
    relativeOutboundRoot,
    dependencyIds: [...envelope.dependencyIds].sort((left, right) => left.localeCompare(right)),
    blockedReasons: [...envelope.blockedReasons].sort((left, right) =>
      `${left.code}:${left.artifactId ?? ""}:${left.message}`.localeCompare(`${right.code}:${right.artifactId ?? ""}:${right.message}`),
    ),
    payload: {
      ...envelope.payload,
      dispatchId,
      adapterId: adapter.id,
      endpoint: adapter.endpoint,
    },
    files,
  };
}

function createDispatchResult(envelope: WriterRunDispatchEnvelope): WriterRunDispatchResult {
  return {
    id: `writer-run-dispatch-result-${envelope.artifactId}-${stableToken(envelope.id, envelope.dispatchStatus)}`,
    adapterId: envelope.adapterId,
    dispatchId: envelope.dispatchId,
    correlationId: envelope.correlationId,
    artifactId: envelope.artifactId,
    fileName: envelope.fileName,
    status: envelope.dispatchStatus,
    endpoint: envelope.endpoint,
    outboundRoot: envelope.outboundRoot,
    relativeOutboundRoot: envelope.relativeOutboundRoot,
    filePaths: envelope.files.map((file) => file.relativePath).sort((left, right) => left.localeCompare(right)),
    note: envelope.dispatchable
      ? `${envelope.fileName} is ready for filesystem dispatch packaging.`
      : envelope.dispatchReason,
  };
}

function createEntry(
  relativePath: string,
  fileName: string,
  payloadKind: WriterRunTransportAdapterEntry["payloadKind"],
  content: string,
  summary: string,
  kind: WriterRunTransportAdapterEntry["kind"] = "writer_run_transport_adapter_entry",
): WriterRunTransportAdapterEntry {
  return {
    kind,
    relativePath,
    fileName,
    payloadKind,
    mimeType: "application/json",
    content,
    summary,
  };
}

export function prepareWriterRunTransportAdapterBundleSync(
  packageBundle: ExternalExecutionPackage,
  transportBundle: WriterRunTransportBundle,
  adapters: WriterRunTransportAdapter[] = createDefaultWriterRunTransportAdapters(packageBundle.jobId),
): WriterRunTransportAdapterBundle {
  const adapterResults = adapters.map((adapter) => ({
    id: adapter.id,
    version: adapter.version,
    label: adapter.label,
    capabilities: adapter.capabilities,
    endpoint: adapter.endpoint,
    validation: adapter.validate(transportBundle),
  })).sort((left, right) => left.label.localeCompare(right.label));
  const activeAdapter = chooseActiveAdapter(adapters);
  const activeAdapterResult = adapterResults.find((adapter) => adapter.id === activeAdapter.id);
  const dispatchEnvelopes = transportBundle.envelopes
    .map((envelope) => createDispatchEnvelope(packageBundle, transportBundle, activeAdapter, envelope))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
  const dispatchResults = sortResults(dispatchEnvelopes.map((envelope) => createDispatchResult(envelope)));
  const readiness = activeAdapterResult?.validation.readiness ?? "unsupported";
  const entries: WriterRunTransportAdapterEntry[] = [
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-transport-adapters.json"),
      "writer-run-transport-adapters.json",
      "writer_run_transport_adapters",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        adapters: adapterResults,
        activeAdapterId: activeAdapter.id,
      }, null, 2),
      "Available transport adapters and validation results for the current writer-run transport bundle.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-dispatch-envelopes.json"),
      "writer-run-dispatch-envelopes.json",
      "writer_run_dispatch_envelopes",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        activeAdapterId: activeAdapter.id,
        dispatchEnvelopes,
      }, null, 2),
      "Normalized outbound dispatch envelopes for the active transport adapter.",
    ),
    createEntry(
      joinPath(packageBundle.rootRelativePath, "handoff", "writer-run-dispatch-results.json"),
      "writer-run-dispatch-results.json",
      "writer_run_dispatch_results",
      JSON.stringify({
        version: 1,
        packageId: packageBundle.id,
        activeAdapterId: activeAdapter.id,
        dispatchResults,
      }, null, 2),
      "Deterministic dispatch results for the active transport adapter.",
    ),
    ...dispatchEnvelopes.flatMap((envelope) =>
      envelope.files.map((file) =>
        createEntry(
          joinPath(packageBundle.rootRelativePath, file.relativePath),
          file.fileName,
          "writer_run_dispatch_payload",
          file.content,
          file.summary,
          "writer_run_dispatch_file_entry",
        ),
      ),
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `writer-run-transport-adapter-bundle-${packageBundle.jobId}`,
    jobId: packageBundle.jobId,
    deliveryPackageId: packageBundle.deliveryPackageId,
    rootRelativePath: joinPath(packageBundle.rootRelativePath, "handoff"),
    packageId: packageBundle.id,
    sourceSignature: packageBundle.sourceSignature,
    reviewSignature: packageBundle.reviewSignature,
    deliveryPackageSignature: packageBundle.deliveryPackageSignature,
    adapters: adapterResults,
    activeAdapterId: activeAdapter.id,
    dispatchEnvelopes,
    dispatchResults,
    readiness,
    entries,
    summary: readiness === "ready"
      ? `Filesystem dispatch packages are ready for every transport envelope in ${packageBundle.rootFolderName}.`
      : readiness === "partial"
        ? `Filesystem dispatch packages are ready for some transport envelopes in ${packageBundle.rootFolderName}, while others remain blocked.`
        : readiness === "blocked"
          ? `Filesystem dispatch packaging remains blocked by current transport readiness in ${packageBundle.rootFolderName}.`
          : `No active transport adapter can package the current transport envelopes for ${packageBundle.rootFolderName}.`,
  };
}
