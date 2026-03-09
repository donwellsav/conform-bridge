import { getReceiptSchemaDescriptor, matchReceiptSchema } from "./receipt-schema-registry";
import { stableToken } from "./writer-run-audit";
import type {
  ReceiptCompatibilityProfile,
  ReceiptImportProblem,
  ReceiptImportWarning,
  ReceiptNormalizationResult,
  ReceiptNormalizationStatus,
  ReceiptPayloadFingerprint,
  WriterRunReceiptEnvelope,
  WriterRunReceiptSourceFile,
  WriterRunTransportAdapterId,
  WriterRunTransportId,
} from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function fingerprintReceiptPayload(profile: ReceiptCompatibilityProfile, payload: unknown): ReceiptPayloadFingerprint {
  return `receipt-fingerprint-${stableToken(profile, stableStringify(payload))}`;
}

function stringValue(
  value: unknown,
  field: string,
  problems: ReceiptImportProblem[],
  { required = true }: { required?: boolean } = {},
) {
  if (typeof value === "string") {
    return value;
  }

  if (required) {
    problems.push({
      code: "missing_required_field",
      message: `Receipt field ${field} must be a string.`,
    });
  }

  return "";
}

function numberValue(
  value: unknown,
  field: string,
  problems: ReceiptImportProblem[],
  { required = true, fallback = 0 }: { required?: boolean; fallback?: number } = {},
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (required) {
    problems.push({
      code: "missing_required_field",
      message: `Receipt field ${field} must be a number.`,
    });
  }

  return fallback;
}

function objectValue(
  value: unknown,
  field: string,
  problems: ReceiptImportProblem[],
  { required = true }: { required?: boolean } = {},
) {
  if (isRecord(value)) {
    return value;
  }

  if (required) {
    problems.push({
      code: "missing_required_field",
      message: `Receipt field ${field} must be an object.`,
    });
  }

  return {};
}

function normalizeCanonicalReceipt(
  source: WriterRunReceiptSourceFile,
  parsed: Record<string, unknown>,
  payloadFingerprint: ReceiptPayloadFingerprint,
): ReceiptNormalizationResult {
  const problems: ReceiptImportProblem[] = [];
  const warnings: ReceiptImportWarning[] = [];
  const version = numberValue(parsed.version, "version", problems);

  const envelope: WriterRunReceiptEnvelope = {
    version: 1,
    id: stringValue(parsed.id, "id", problems),
    adapterId: stringValue(parsed.adapterId, "adapterId", problems) as WriterRunTransportAdapterId,
    transportId: stringValue(parsed.transportId, "transportId", problems) as WriterRunTransportId,
    dispatchId: stringValue(parsed.dispatchId, "dispatchId", problems),
    correlationId: stringValue(parsed.correlationId, "correlationId", problems),
    packageId: stringValue(parsed.packageId, "packageId", problems),
    requestId: stringValue(parsed.requestId, "requestId", problems),
    artifactId: stringValue(parsed.artifactId, "artifactId", problems),
    fileName: stringValue(parsed.fileName, "fileName", problems),
    sourceSignature: stringValue(parsed.sourceSignature, "sourceSignature", problems),
    reviewSignature: stringValue(parsed.reviewSignature, "reviewSignature", problems),
    deliveryPackageSignature: stringValue(parsed.deliveryPackageSignature, "deliveryPackageSignature", problems),
    source: stringValue(parsed.source, "source", problems) as WriterRunReceiptEnvelope["source"],
    compatibilityProfile: "canonical-filesystem-transport-v1",
    payloadSource: "canonical-json",
    payloadFingerprint,
    receiptSequence: numberValue(parsed.receiptSequence, "receiptSequence", problems),
    status: stringValue(parsed.status, "status", problems) as WriterRunReceiptEnvelope["status"],
    note: stringValue(parsed.note, "note", problems),
    payload: objectValue(parsed.payload, "payload", problems),
  };

  if (version !== 1) {
    warnings.push({
      code: "future_profile_partial",
      message: `Canonical receipt version ${version} is not the current schema and was normalized conservatively.`,
    });
  }

  const status: ReceiptNormalizationStatus = problems.length > 0
    ? "invalid"
    : version === 1
      ? "normalized"
      : "partially-compatible";

  return {
    id: `receipt-normalization-${source.id}`,
    sourceFileName: source.fileName,
    sourcePath: source.absolutePath,
    status,
    compatibilityProfile: "canonical-filesystem-transport-v1",
    schemaMatch: {
      profile: "canonical-filesystem-transport-v1",
      status: version === 1 ? "matched" : "unknown-version",
      detectedVersion: version,
      note: version === 1
        ? "Canonical receipt envelope was normalized without migration."
        : `Canonical receipt version ${version} required best-effort normalization.`,
    },
    payloadSource: "canonical-json",
    payloadFingerprint,
    envelope: problems.length > 0 ? undefined : envelope,
    warnings,
    problems,
    note: problems.length > 0
      ? "Canonical receipt payload failed required-field validation."
      : version === 1
        ? "Canonical receipt payload normalized successfully."
        : "Canonical receipt payload normalized with compatibility warnings.",
  };
}

function normalizeCompatibilityReceipt(
  source: WriterRunReceiptSourceFile,
  parsed: Record<string, unknown>,
  payloadFingerprint: ReceiptPayloadFingerprint,
): ReceiptNormalizationResult {
  const problems: ReceiptImportProblem[] = [];
  const warnings: ReceiptImportWarning[] = [];
  const dispatch = objectValue(parsed.dispatch, "dispatch", problems);
  const artifact = objectValue(parsed.artifact, "artifact", problems);
  const signatures = objectValue(parsed.signatures, "signatures", problems);
  const receipt = objectValue(parsed.receipt, "receipt", problems);
  const transport = objectValue(parsed.transport, "transport", problems, { required: false });
  const version = numberValue(parsed.schemaVersion, "schemaVersion", problems);
  const migrated = version === 0;

  if (migrated) {
    warnings.push({
      code: "migrated_version",
      message: "Compatibility receipt schema v0 was migrated to the current v1 canonical receipt envelope.",
    });
  }

  const packageId = migrated
    ? stringValue(dispatch.packageId ?? dispatch.package, "dispatch.packageId", problems, { required: false })
    : stringValue(dispatch.packageId, "dispatch.packageId", problems, { required: false });
  const requestId = migrated
    ? stringValue(dispatch.requestId ?? dispatch.request, "dispatch.requestId", problems, { required: false })
    : stringValue(dispatch.requestId, "dispatch.requestId", problems, { required: false });
  const artifactFileName = migrated
    ? stringValue(artifact.fileName ?? artifact.name, "artifact.fileName", problems)
    : stringValue(artifact.fileName, "artifact.fileName", problems);
  const envelope: WriterRunReceiptEnvelope = {
    version: 1,
    id: stringValue(parsed.id ?? `compat-receipt-${payloadFingerprint}`, "id", problems, { required: false }) || `compat-receipt-${payloadFingerprint}`,
    adapterId: stringValue(transport.adapterId ?? "filesystem-transport-adapter", "transport.adapterId", problems, { required: false }) as WriterRunTransportAdapterId,
    transportId: stringValue(transport.transportId ?? "reference-noop-transport", "transport.transportId", problems, { required: false }) as WriterRunTransportId,
    dispatchId: migrated
      ? stringValue(dispatch.dispatchId ?? dispatch.id, "dispatch.dispatchId", problems)
      : stringValue(dispatch.id, "dispatch.id", problems),
    correlationId: stringValue(dispatch.correlationId, "dispatch.correlationId", problems),
    packageId,
    requestId,
    artifactId: migrated
      ? stringValue(artifact.artifactId ?? artifact.id, "artifact.artifactId", problems)
      : stringValue(artifact.id, "artifact.id", problems),
    fileName: artifactFileName,
    sourceSignature: migrated
      ? stringValue(signatures.source ?? signatures.sourceSignature, "signatures.sourceSignature", problems)
      : stringValue(signatures.sourceSignature, "signatures.sourceSignature", problems),
    reviewSignature: migrated
      ? stringValue(signatures.review ?? signatures.reviewSignature, "signatures.reviewSignature", problems)
      : stringValue(signatures.reviewSignature, "signatures.reviewSignature", problems),
    deliveryPackageSignature: migrated
      ? stringValue(signatures.delivery ?? signatures.deliveryPackageSignature, "signatures.deliveryPackageSignature", problems)
      : stringValue(signatures.deliveryPackageSignature, "signatures.deliveryPackageSignature", problems),
    source: stringValue(transport.source ?? source.source, "transport.source", problems, { required: false }) as WriterRunReceiptEnvelope["source"],
    compatibilityProfile: "compatibility-filesystem-receipt-v1",
    payloadSource: "compatibility-json",
    payloadFingerprint,
    receiptSequence: migrated
      ? numberValue(receipt.sequence ?? receipt.receiptSequence, "receipt.sequence", problems)
      : numberValue(receipt.sequence, "receipt.sequence", problems),
    status: stringValue(receipt.status, "receipt.status", problems) as WriterRunReceiptEnvelope["status"],
    note: stringValue(receipt.note ?? parsed.note, "receipt.note", problems, { required: false }),
    payload: objectValue(parsed.payload, "payload", problems, { required: false }),
  };

  if (!packageId) {
    warnings.push({
      code: "optional_field_missing",
      message: "Compatibility receipt omitted dispatch.packageId, so matching falls back to correlation and signatures.",
    });
  }

  if (!requestId) {
    warnings.push({
      code: "optional_field_missing",
      message: "Compatibility receipt omitted dispatch.requestId, so request matching stays correlation-driven.",
    });
  }

  const status: ReceiptNormalizationStatus = problems.length > 0
    ? "invalid"
    : migrated
      ? "migrated"
      : "normalized";

  return {
    id: `receipt-normalization-${source.id}`,
    sourceFileName: source.fileName,
    sourcePath: source.absolutePath,
    status,
    compatibilityProfile: "compatibility-filesystem-receipt-v1",
    schemaMatch: {
      profile: "compatibility-filesystem-receipt-v1",
      status: migrated ? "migrated" : version === 1 ? "matched" : "unknown-version",
      detectedVersion: version,
      note: migrated
        ? "Compatibility receipt was migrated from schema v0 into the canonical receipt envelope."
        : "Compatibility receipt normalized successfully.",
    },
    payloadSource: "compatibility-json",
    payloadFingerprint,
    envelope: problems.length > 0 ? undefined : envelope,
    warnings,
    problems,
    note: problems.length > 0
      ? "Compatibility receipt payload failed normalization."
      : migrated
        ? "Compatibility receipt payload normalized after schema migration."
        : "Compatibility receipt payload normalized successfully.",
  };
}

function normalizeFuturePlaceholderReceipt(
  source: WriterRunReceiptSourceFile,
  parsed: Record<string, unknown>,
  payloadFingerprint: ReceiptPayloadFingerprint,
): ReceiptNormalizationResult {
  const problems: ReceiptImportProblem[] = [];
  const warnings: ReceiptImportWarning[] = [{
    code: "future_profile_partial",
    message: "Future service transport receipts are accepted as partially compatible compatibility payloads only.",
  }];
  const artifact = objectValue(parsed.artifact, "artifact", problems);
  const signatures = objectValue(parsed.signatures, "signatures", problems);
  const result = objectValue(parsed.result, "result", problems);
  const transport = objectValue(parsed.transport, "transport", problems, { required: false });
  const version = numberValue(parsed.schemaVersion, "schemaVersion", problems);

  const envelope: WriterRunReceiptEnvelope = {
    version: 1,
    id: stringValue(parsed.id ?? `future-receipt-${payloadFingerprint}`, "id", problems, { required: false }) || `future-receipt-${payloadFingerprint}`,
    adapterId: stringValue(transport.adapterId ?? "filesystem-transport-adapter", "transport.adapterId", problems, { required: false }) as WriterRunTransportAdapterId,
    transportId: stringValue(transport.transportId ?? "reference-noop-transport", "transport.transportId", problems, { required: false }) as WriterRunTransportId,
    dispatchId: stringValue(parsed.dispatchId, "dispatchId", problems),
    correlationId: stringValue(parsed.correlationId, "correlationId", problems),
    packageId: stringValue(parsed.packageId, "packageId", problems, { required: false }),
    requestId: stringValue(parsed.requestId, "requestId", problems, { required: false }),
    artifactId: stringValue(artifact.id ?? artifact.artifactId, "artifact.id", problems),
    fileName: stringValue(artifact.fileName ?? artifact.name, "artifact.fileName", problems),
    sourceSignature: stringValue(signatures.sourceSignature, "signatures.sourceSignature", problems),
    reviewSignature: stringValue(signatures.reviewSignature, "signatures.reviewSignature", problems),
    deliveryPackageSignature: stringValue(signatures.deliveryPackageSignature, "signatures.deliveryPackageSignature", problems),
    source: stringValue(transport.source ?? source.source, "transport.source", problems, { required: false }) as WriterRunReceiptEnvelope["source"],
    compatibilityProfile: "future-service-transport-placeholder",
    payloadSource: "future-placeholder-json",
    payloadFingerprint,
    receiptSequence: numberValue(result.receiptSequence ?? result.sequence ?? 1, "result.receiptSequence", problems, { required: false, fallback: 1 }),
    status: stringValue(result.status, "result.status", problems) as WriterRunReceiptEnvelope["status"],
    note: stringValue(result.note ?? parsed.note, "result.note", problems, { required: false }),
    payload: objectValue(parsed.payload, "payload", problems, { required: false }),
  };

  const status: ReceiptNormalizationStatus = problems.length > 0 ? "incompatible" : "partially-compatible";

  return {
    id: `receipt-normalization-${source.id}`,
    sourceFileName: source.fileName,
    sourcePath: source.absolutePath,
    status,
    compatibilityProfile: "future-service-transport-placeholder",
    schemaMatch: {
      profile: "future-service-transport-placeholder",
      status: version === 1 || version === 2 ? "matched" : "unknown-version",
      detectedVersion: version,
      note: "Future service transport placeholder receipts remain compatibility-only.",
    },
    payloadSource: "future-placeholder-json",
    payloadFingerprint,
    envelope: problems.length > 0 ? undefined : envelope,
    warnings,
    problems,
    note: problems.length > 0
      ? "Future placeholder receipt did not contain enough fields to normalize."
      : "Future placeholder receipt was partially normalized for deterministic compatibility handling.",
  };
}

export function normalizeReceiptSource(source: WriterRunReceiptSourceFile): ReceiptNormalizationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source.content);
  } catch (error) {
    return {
      id: `receipt-normalization-${source.id}`,
      sourceFileName: source.fileName,
      sourcePath: source.absolutePath,
      status: "invalid",
      compatibilityProfile: "canonical-filesystem-transport-v1",
      schemaMatch: {
        profile: "canonical-filesystem-transport-v1",
        status: "incompatible",
        note: "Receipt payload is not valid JSON.",
      },
      payloadSource: "unknown-json",
      payloadFingerprint: fingerprintReceiptPayload("canonical-filesystem-transport-v1", source.content),
      warnings: [],
      problems: [{
        code: "invalid_json",
        message: error instanceof Error ? error.message : "Receipt content is not valid JSON.",
      }],
      note: "Receipt payload is not valid JSON.",
    };
  }

  const schemaMatch = matchReceiptSchema(parsed);
  const descriptor = getReceiptSchemaDescriptor(schemaMatch.profile);
  const payloadFingerprint = fingerprintReceiptPayload(schemaMatch.profile, parsed);

  if (!isRecord(parsed)) {
    return {
      id: `receipt-normalization-${source.id}`,
      sourceFileName: source.fileName,
      sourcePath: source.absolutePath,
      status: "invalid",
      compatibilityProfile: schemaMatch.profile,
      schemaMatch,
      payloadSource: descriptor.payloadSource,
      payloadFingerprint,
      warnings: [],
      problems: [{
        code: "invalid_json",
        message: "Receipt payload must be a JSON object.",
      }],
      note: "Receipt payload must be a JSON object.",
    };
  }

  switch (descriptor.normalizationRule) {
    case "canonical":
      return normalizeCanonicalReceipt(source, parsed, payloadFingerprint);
    case "compatibility":
      return normalizeCompatibilityReceipt(source, parsed, payloadFingerprint);
    case "future-placeholder":
      return normalizeFuturePlaceholderReceipt(source, parsed, payloadFingerprint);
  }
}
