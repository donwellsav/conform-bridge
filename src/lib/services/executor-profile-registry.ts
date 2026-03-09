import type {
  ExecutorCompatibilityProfile,
  ExecutorCompatibilityProfileId,
  ExecutorSupportedTransportProfile,
  ReceiptCompatibilityProfile,
  WriterRunTransportAdapterId,
} from "../types";

const BASE_REQUIRED_PACKAGE_MEMBERS = [
  "package/external-execution-manifest.json",
  "package/external-execution-index.json",
  "package/external-execution-summary.json",
  "package/generated-artifact-index.json",
  "package/deferred-writer-inputs.json",
  "package/checksums.json",
  "handoff/deferred-writer-inputs.json",
  "handoff/delivery-handoff-manifest.json",
  "handoff/delivery-handoff-summary.json",
].sort((left, right) => left.localeCompare(right));

const BASE_OPTIONAL_PACKAGE_MEMBERS = [
  "staged/staging-summary.json",
].sort((left, right) => left.localeCompare(right));

const PROFILES: Record<ExecutorCompatibilityProfileId, ExecutorCompatibilityProfile> = {
  "canonical-filesystem-executor-v1": {
    id: "canonical-filesystem-executor-v1",
    version: 1,
    label: "Canonical filesystem executor",
    description: "Primary compatibility target for the current deterministic filesystem dispatch flow.",
    capabilityMatrix: {
      packageVersions: {
        supportedVersions: [1],
        note: "Current external execution package schema.",
      },
      handoffVersions: {
        supportedVersions: [1],
        note: "Current deferred writer-input and handoff manifest schema.",
      },
      transportAdapterVersions: {
        supportedVersions: [1],
        note: "Current filesystem transport adapter schema.",
      },
      supportedTransportProfiles: ["filesystem-transport-adapter@1"],
      supportedReceiptProfiles: ["canonical-filesystem-transport-v1", "compatibility-filesystem-receipt-v1"],
      expectedReceiptProfile: "canonical-filesystem-transport-v1",
      supportedDeferredArtifactKinds: ["nuendo_ready_aaf", "reference_video_handoff", "native_nuendo_session"],
      requiredPackageMembers: BASE_REQUIRED_PACKAGE_MEMBERS,
      optionalPackageMembers: BASE_OPTIONAL_PACKAGE_MEMBERS,
      requiredGeneratedPayloadKinds: ["manifest_json", "readme_text"],
      optionalGeneratedPayloadKinds: ["marker_csv", "marker_edl", "metadata_csv", "field_recorder_report"],
    },
    unsupportedReasons: [],
  },
  "compatibility-filesystem-executor-v1": {
    id: "compatibility-filesystem-executor-v1",
    version: 1,
    label: "Compatibility filesystem executor",
    description: "Compatibility-target profile that accepts broader receipt variants while preserving the current filesystem contract.",
    capabilityMatrix: {
      packageVersions: {
        supportedVersions: [1],
        note: "Current external execution package schema.",
      },
      handoffVersions: {
        supportedVersions: [1],
        note: "Current deferred writer-input and handoff manifest schema.",
      },
      transportAdapterVersions: {
        supportedVersions: [1],
        note: "Current filesystem transport adapter schema.",
      },
      supportedTransportProfiles: ["filesystem-transport-adapter@1", "reference-noop-transport-adapter@1"],
      supportedReceiptProfiles: [
        "canonical-filesystem-transport-v1",
        "compatibility-filesystem-receipt-v1",
        "future-service-transport-placeholder",
      ],
      expectedReceiptProfile: "compatibility-filesystem-receipt-v1",
      supportedDeferredArtifactKinds: ["nuendo_ready_aaf", "reference_video_handoff", "native_nuendo_session"],
      requiredPackageMembers: BASE_REQUIRED_PACKAGE_MEMBERS,
      optionalPackageMembers: BASE_OPTIONAL_PACKAGE_MEMBERS,
      requiredGeneratedPayloadKinds: ["manifest_json", "readme_text"],
      optionalGeneratedPayloadKinds: ["marker_csv", "marker_edl", "metadata_csv", "field_recorder_report"],
    },
    unsupportedReasons: [],
  },
  "future-service-executor-placeholder": {
    id: "future-service-executor-placeholder",
    version: 1,
    label: "Future service executor placeholder",
    description: "Placeholder profile for a future service-backed execution environment that does not exist yet.",
    capabilityMatrix: {
      packageVersions: {
        supportedVersions: [1],
        note: "Current package schema is inspectable, but service execution is not implemented.",
      },
      handoffVersions: {
        supportedVersions: [1],
        note: "Current handoff schema is inspectable, but service execution is not implemented.",
      },
      transportAdapterVersions: {
        supportedVersions: [1],
        note: "Compatibility placeholder only.",
      },
      supportedTransportProfiles: [],
      supportedReceiptProfiles: ["future-service-transport-placeholder"],
      expectedReceiptProfile: "future-service-transport-placeholder",
      supportedDeferredArtifactKinds: ["nuendo_ready_aaf", "reference_video_handoff"],
      requiredPackageMembers: BASE_REQUIRED_PACKAGE_MEMBERS,
      optionalPackageMembers: BASE_OPTIONAL_PACKAGE_MEMBERS,
      requiredGeneratedPayloadKinds: ["manifest_json", "readme_text"],
      optionalGeneratedPayloadKinds: ["marker_csv", "marker_edl", "metadata_csv", "field_recorder_report"],
    },
    unsupportedReasons: [
      "Service-backed execution is not implemented in this repo.",
      "Only filesystem transport is currently real.",
    ],
  },
};

function cloneProfile(profile: ExecutorCompatibilityProfile): ExecutorCompatibilityProfile {
  return {
    ...profile,
    capabilityMatrix: {
      ...profile.capabilityMatrix,
      packageVersions: {
        ...profile.capabilityMatrix.packageVersions,
        supportedVersions: [...profile.capabilityMatrix.packageVersions.supportedVersions],
      },
      handoffVersions: {
        ...profile.capabilityMatrix.handoffVersions,
        supportedVersions: [...profile.capabilityMatrix.handoffVersions.supportedVersions],
      },
      transportAdapterVersions: {
        ...profile.capabilityMatrix.transportAdapterVersions,
        supportedVersions: [...profile.capabilityMatrix.transportAdapterVersions.supportedVersions],
      },
      supportedTransportProfiles: [...profile.capabilityMatrix.supportedTransportProfiles],
      supportedReceiptProfiles: [...profile.capabilityMatrix.supportedReceiptProfiles],
      supportedDeferredArtifactKinds: [...profile.capabilityMatrix.supportedDeferredArtifactKinds],
      requiredPackageMembers: [...profile.capabilityMatrix.requiredPackageMembers],
      optionalPackageMembers: [...profile.capabilityMatrix.optionalPackageMembers],
      requiredGeneratedPayloadKinds: [...profile.capabilityMatrix.requiredGeneratedPayloadKinds],
      optionalGeneratedPayloadKinds: [...profile.capabilityMatrix.optionalGeneratedPayloadKinds],
    },
    unsupportedReasons: [...profile.unsupportedReasons],
  };
}

export function createExecutorTransportProfileId(adapterId: WriterRunTransportAdapterId): ExecutorSupportedTransportProfile {
  switch (adapterId) {
    case "filesystem-transport-adapter":
      return "filesystem-transport-adapter@1";
    case "reference-noop-transport-adapter":
      return "reference-noop-transport-adapter@1";
  }
}

export function listExecutorCompatibilityProfiles(): ExecutorCompatibilityProfile[] {
  return Object.values(PROFILES)
    .map((profile) => cloneProfile(profile))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getExecutorCompatibilityProfile(profileId: ExecutorCompatibilityProfileId): ExecutorCompatibilityProfile {
  return cloneProfile(PROFILES[profileId]);
}

export function resolveExecutorCompatibilityProfileId(
  transportProfile: ExecutorSupportedTransportProfile,
  preferredProfileId?: ExecutorCompatibilityProfileId,
): ExecutorCompatibilityProfileId {
  if (preferredProfileId) {
    return preferredProfileId;
  }

  if (transportProfile === "filesystem-transport-adapter@1") {
    return "canonical-filesystem-executor-v1";
  }

  if (transportProfile === "reference-noop-transport-adapter@1") {
    return "compatibility-filesystem-executor-v1";
  }

  return "future-service-executor-placeholder";
}

export function isReceiptProfileSupportedByExecutor(
  profileId: ExecutorCompatibilityProfileId,
  receiptProfile: ReceiptCompatibilityProfile,
) {
  return PROFILES[profileId].capabilityMatrix.supportedReceiptProfiles.includes(receiptProfile);
}
