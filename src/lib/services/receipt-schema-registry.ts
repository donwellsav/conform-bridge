import type {
  ReceiptCompatibilityProfile,
  ReceiptSchemaDescriptor,
  ReceiptSchemaMatchResult,
} from "../types";

const RECEIPT_SCHEMA_DESCRIPTORS: ReceiptSchemaDescriptor[] = [
  {
    profile: "canonical-filesystem-transport-v1",
    currentVersion: 1,
    supportedVersions: [1],
    requiredFields: [
      "version",
      "id",
      "adapterId",
      "transportId",
      "dispatchId",
      "correlationId",
      "packageId",
      "requestId",
      "artifactId",
      "fileName",
      "sourceSignature",
      "reviewSignature",
      "deliveryPackageSignature",
      "source",
      "receiptSequence",
      "status",
      "note",
      "payload",
    ],
    optionalFields: [],
    payloadSource: "canonical-json",
    normalizationRule: "canonical",
  },
  {
    profile: "compatibility-filesystem-receipt-v1",
    currentVersion: 1,
    supportedVersions: [0, 1],
    requiredFields: [
      "profile",
      "schemaVersion",
      "dispatch",
      "artifact",
      "signatures",
      "receipt",
    ],
    optionalFields: [
      "transport",
      "payload",
    ],
    payloadSource: "compatibility-json",
    normalizationRule: "compatibility",
  },
  {
    profile: "future-service-transport-placeholder",
    currentVersion: 1,
    supportedVersions: [1, 2],
    requiredFields: [
      "profile",
      "schemaVersion",
      "correlationId",
      "dispatchId",
      "artifact",
      "signatures",
      "result",
    ],
    optionalFields: [
      "transport",
      "payload",
      "requestId",
      "packageId",
    ],
    payloadSource: "future-placeholder-json",
    normalizationRule: "future-placeholder",
    unsupportedReason: "Future service-style receipts remain compatibility-only until a real service transport adapter exists.",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function detectCanonicalReceiptShape(payload: Record<string, unknown>) {
  return typeof payload.version === "number"
    && typeof payload.adapterId === "string"
    && typeof payload.transportId === "string"
    && typeof payload.correlationId === "string"
    && typeof payload.artifactId === "string";
}

function detectCompatibilityReceiptShape(payload: Record<string, unknown>) {
  return payload.profile === "compatibility-filesystem-receipt-v1"
    && isRecord(payload.dispatch)
    && isRecord(payload.artifact)
    && isRecord(payload.signatures);
}

function detectFuturePlaceholderShape(payload: Record<string, unknown>) {
  return payload.profile === "future-service-transport-placeholder"
    && typeof payload.correlationId === "string"
    && typeof payload.dispatchId === "string";
}

export function listReceiptSchemaDescriptors(): ReceiptSchemaDescriptor[] {
  return RECEIPT_SCHEMA_DESCRIPTORS.map((descriptor) => ({
    ...descriptor,
    supportedVersions: [...descriptor.supportedVersions],
    requiredFields: [...descriptor.requiredFields],
    optionalFields: [...descriptor.optionalFields],
  }));
}

export function getReceiptSchemaDescriptor(profile: ReceiptCompatibilityProfile): ReceiptSchemaDescriptor {
  const descriptor = RECEIPT_SCHEMA_DESCRIPTORS.find((candidate) => candidate.profile === profile);
  if (!descriptor) {
    throw new Error(`Unknown receipt compatibility profile ${profile}.`);
  }

  return {
    ...descriptor,
    supportedVersions: [...descriptor.supportedVersions],
    requiredFields: [...descriptor.requiredFields],
    optionalFields: [...descriptor.optionalFields],
  };
}

export function matchReceiptSchema(payload: unknown): ReceiptSchemaMatchResult {
  if (!isRecord(payload)) {
    return {
      profile: "canonical-filesystem-transport-v1",
      status: "incompatible",
      note: "Receipt payload must be a JSON object.",
    };
  }

  if (detectCanonicalReceiptShape(payload)) {
    const version = typeof payload.version === "number" ? payload.version : undefined;
    return {
      profile: "canonical-filesystem-transport-v1",
      status: version === 1 ? "matched" : "unknown-version",
      detectedVersion: version,
      note: version === 1
        ? "Receipt matches the canonical filesystem transport schema."
        : `Canonical receipt version ${String(version)} requires compatibility handling.`,
    };
  }

  if (detectCompatibilityReceiptShape(payload)) {
    const version = typeof payload.schemaVersion === "number" ? payload.schemaVersion : undefined;
    return {
      profile: "compatibility-filesystem-receipt-v1",
      status: version === 1 ? "matched" : version === 0 ? "migrated" : "unknown-version",
      detectedVersion: version,
      note: version === 1
        ? "Receipt matches the compatibility filesystem receipt schema."
        : version === 0
          ? "Receipt matches a migrated compatibility filesystem receipt schema."
          : `Compatibility receipt version ${String(version)} requires best-effort normalization.`,
    };
  }

  if (detectFuturePlaceholderShape(payload)) {
    const version = typeof payload.schemaVersion === "number" ? payload.schemaVersion : undefined;
    return {
      profile: "future-service-transport-placeholder",
      status: version === 1 || version === 2 ? "matched" : "unknown-version",
      detectedVersion: version,
      note: "Receipt matches the future service transport placeholder schema.",
    };
  }

  return {
    profile: "canonical-filesystem-transport-v1",
    status: "incompatible",
    note: "Receipt payload did not match any registered compatibility profile.",
  };
}
