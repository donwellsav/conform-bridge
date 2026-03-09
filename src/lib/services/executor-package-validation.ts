import { stableToken } from "./writer-run-audit";
import {
  createExecutorTransportProfileId,
  getExecutorCompatibilityProfile,
  resolveExecutorCompatibilityProfileId,
} from "./executor-profile-registry";
import type {
  DeliveryHandoffBundle,
  ExecutorCompatibilityArtifactResult,
  ExecutorCompatibilityIssue,
  ExecutorCompatibilityProfile,
  ExecutorCompatibilityProfileId,
  ExecutorCompatibilitySummary,
  ExecutorPackageCompatibilityResult,
  ExecutorPackageReadiness,
  ExecutorPackageUnsupportedReason,
  ExecutorProfileResolution,
  ExternalExecutionPackage,
  WriterAdapterBundle,
  WriterReadinessStatus,
  WriterRunTransportAdapter,
  WriterRunTransportAdapterReadiness,
  WriterRunTransportBundle,
  WriterRunBundle,
} from "../types";

export interface ExecutorPackageValidationInput {
  packageBundle: ExternalExecutionPackage;
  handoffBundle: DeliveryHandoffBundle;
  writerAdapterBundle: WriterAdapterBundle;
  writerRunBundle: WriterRunBundle;
  transportBundle: WriterRunTransportBundle;
  transportAdapters: WriterRunTransportAdapter[];
  preferredProfileId?: ExecutorCompatibilityProfileId;
}

function transportReadinessRank(status: WriterRunTransportAdapterReadiness) {
  switch (status) {
    case "ready":
      return 0;
    case "partial":
      return 1;
    case "blocked":
      return 2;
    case "unsupported":
      return 3;
  }
}

function createIssue(
  input: ExecutorPackageValidationInput,
  profileId: ExecutorCompatibilityProfileId,
  code: ExecutorCompatibilityIssue["code"],
  severity: ExecutorCompatibilityIssue["severity"],
  scope: ExecutorCompatibilityIssue["scope"],
  message: string,
  followUp: string,
  options: {
    artifactId?: string;
    relativePath?: string;
    expected?: string;
    actual?: string;
    blocking?: boolean;
  } = {},
): ExecutorCompatibilityIssue {
  return {
    id: `executor-compatibility-issue-${stableToken(input.packageBundle.id, profileId, code, message, options.artifactId ?? "", options.relativePath ?? "")}`,
    code,
    severity,
    scope,
    artifactId: options.artifactId,
    relativePath: options.relativePath,
    expected: options.expected,
    actual: options.actual,
    message,
    followUp,
    blocking: options.blocking ?? severity === "error",
  };
}

function createUnsupportedReason(
  code: ExecutorPackageUnsupportedReason["code"],
  message: string,
  artifactId?: string,
): ExecutorPackageUnsupportedReason {
  return {
    code,
    message,
    artifactId,
  };
}

function chooseActiveTransportAdapter(input: ExecutorPackageValidationInput) {
  return input.transportAdapters
    .map((adapter) => ({
      adapter,
      validation: adapter.validate(input.transportBundle),
    }))
    .sort((left, right) =>
      transportReadinessRank(left.validation.readiness) - transportReadinessRank(right.validation.readiness)
      || Number(left.adapter.id !== "filesystem-transport-adapter") - Number(right.adapter.id !== "filesystem-transport-adapter")
      || left.adapter.label.localeCompare(right.adapter.label),
    )[0];
}

function hasPackageMember(packageBundle: ExternalExecutionPackage, suffix: string) {
  return packageBundle.entries.some((entry) => entry.relativePath.endsWith(suffix));
}

function determineArtifactReadiness(
  issues: ExecutorCompatibilityIssue[],
  handoffReadiness: WriterReadinessStatus,
): ExecutorPackageReadiness {
  if (issues.some((issue) => issue.code === "unsupported_deferred_artifact_kind")) {
    return "unsupported";
  }

  if (issues.some((issue) => issue.code === "unsupported_transport_profile" || issue.code === "unsupported_receipt_profile")) {
    return "incompatible";
  }

  if (issues.some((issue) => issue.blocking)) {
    return "blocked";
  }

  if (handoffReadiness === "partial" || handoffReadiness === "deferred-with-known-gaps") {
    return "partial";
  }

  if (issues.some((issue) => issue.severity === "warning")) {
    return "compatible-with-warnings";
  }

  return "compatible";
}

function buildArtifactResults(
  input: ExecutorPackageValidationInput,
  profile: ExecutorCompatibilityProfile,
  selectedTransportProfile: string,
): ExecutorCompatibilityArtifactResult[] {
  return input.handoffBundle.deferredWriterInput.artifacts
    .map((artifact) => {
      const issues: ExecutorCompatibilityIssue[] = [];
      const adapterMatch = input.writerAdapterBundle.artifactMatches.find((item) => item.artifactId === artifact.artifactId);
      const runnerRequest = input.writerRunBundle.request.requests.find((item) => item.artifactId === artifact.artifactId);
      const transportEnvelope = input.transportBundle.envelopes.find((item) => item.artifactId === artifact.artifactId);

      if (!profile.capabilityMatrix.supportedDeferredArtifactKinds.includes(artifact.artifactKind)) {
        issues.push(
          createIssue(
            input,
            profile.id,
            "unsupported_deferred_artifact_kind",
            "error",
            "artifact",
            `${artifact.fileName} uses deferred artifact kind ${artifact.artifactKind}, which ${profile.label} does not support.`,
            "Use a compatible executor profile or keep this artifact deferred until a matching executor path exists.",
            {
              artifactId: artifact.artifactId,
              expected: profile.capabilityMatrix.supportedDeferredArtifactKinds.join(", "),
              actual: artifact.artifactKind,
              blocking: true,
            },
          ),
        );
      }

      if (artifact.readinessStatus === "blocked") {
        issues.push(
          createIssue(
            input,
            profile.id,
            "blocked_deferred_artifact",
            "error",
            "artifact",
            `${artifact.fileName} is still blocked before external execution.`,
            artifact.blockers[0] ?? "Resolve the blocking handoff prerequisites before dispatch.",
            {
              artifactId: artifact.artifactId,
              blocking: true,
            },
          ),
        );
      } else if (artifact.readinessStatus === "partial" || artifact.readinessStatus === "deferred-with-known-gaps") {
        issues.push(
          createIssue(
            input,
            profile.id,
            "partial_deferred_artifact",
            "warning",
            "artifact",
            `${artifact.fileName} still has known handoff gaps.`,
            artifact.explanation,
            {
              artifactId: artifact.artifactId,
              blocking: false,
            },
          ),
        );
      }

      if (adapterMatch?.status === "blocked" || adapterMatch?.status === "unsupported") {
        issues.push(
          createIssue(
            input,
            profile.id,
            "adapter_readiness_gap",
            adapterMatch.status === "unsupported" ? "error" : "warning",
            "artifact",
            adapterMatch.reason,
            "Resolve adapter compatibility gaps before external execution.",
            {
              artifactId: artifact.artifactId,
              blocking: adapterMatch.status === "unsupported",
            },
          ),
        );
      }

      if (runnerRequest?.requestReadiness === "blocked" || runnerRequest?.requestReadiness === "unsupported") {
        issues.push(
          createIssue(
            input,
            profile.id,
            "runner_readiness_gap",
            runnerRequest.requestReadiness === "unsupported" ? "error" : "warning",
            "artifact",
            runnerRequest.blockedReasons[0]?.message ?? `${artifact.fileName} is not runnable in the current writer-runner layer.`,
            "Resolve runner prerequisites before dispatch.",
            {
              artifactId: artifact.artifactId,
              blocking: runnerRequest.requestReadiness === "unsupported",
            },
          ),
        );
      } else if (runnerRequest?.requestReadiness === "partial") {
        issues.push(
          createIssue(
            input,
            profile.id,
            "partial_deferred_artifact",
            "warning",
            "artifact",
            `${artifact.fileName} is only partially runnable in the current runner layer.`,
            runnerRequest.blockedReasons[0]?.message ?? "Resolve runner dependency gaps before dispatch.",
            {
              artifactId: artifact.artifactId,
              blocking: false,
            },
          ),
        );
      }

      if (transportEnvelope && !transportEnvelope.dispatchable) {
        issues.push(
          createIssue(
            input,
            profile.id,
            "blocked_deferred_artifact",
            "warning",
            "transport",
            `${artifact.fileName} is not dispatchable through ${selectedTransportProfile}.`,
            transportEnvelope.blockedReasons[0]?.message ?? transportEnvelope.dispatchReason,
            {
              artifactId: artifact.artifactId,
              blocking: artifact.readinessStatus === "blocked",
            },
          ),
        );
      }

      const readiness = determineArtifactReadiness(issues, artifact.readinessStatus);

      return {
        artifactId: artifact.artifactId,
        fileName: artifact.fileName,
        artifactKind: artifact.artifactKind,
        requiredWriterCapability: artifact.requiredWriterCapability,
        readiness,
        issues,
        warnings: issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message),
      };
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

function buildProfileResolution(
  input: ExecutorPackageValidationInput,
  profile: ExecutorCompatibilityProfile,
  selectedTransportProfile: string,
) {
  const acceptedReceiptProfiles = [...profile.capabilityMatrix.supportedReceiptProfiles].sort((left, right) => left.localeCompare(right));

  return {
    id: `executor-profile-resolution-${stableToken(input.packageBundle.id, profile.id, selectedTransportProfile)}`,
    packageId: input.packageBundle.id,
    selectedProfileId: profile.id,
    selectedTransportProfile: selectedTransportProfile as ExecutorProfileResolution["selectedTransportProfile"],
    expectedReceiptProfile: profile.capabilityMatrix.expectedReceiptProfile,
    acceptedReceiptProfiles,
    packageVersion: input.packageBundle.version,
    handoffVersion: input.handoffBundle.deferredWriterInput.version,
    sourceSignature: input.packageBundle.sourceSignature,
    reviewSignature: input.packageBundle.reviewSignature,
    deliveryPackageSignature: input.packageBundle.deliveryPackageSignature,
    note: `Executor compatibility resolved to ${profile.id} against transport profile ${selectedTransportProfile}.`,
  } satisfies ExecutorProfileResolution;
}

function buildPackageIssues(
  input: ExecutorPackageValidationInput,
  profile: ExecutorCompatibilityProfile,
  selectedTransportProfile: string,
  activeAdapter: WriterRunTransportAdapter,
) {
  const issues: ExecutorCompatibilityIssue[] = [];
  const unsupportedReasons: ExecutorPackageUnsupportedReason[] = [];

  if (profile.unsupportedReasons.length > 0) {
    unsupportedReasons.push(
      ...profile.unsupportedReasons.map((message) =>
        createUnsupportedReason("profile_not_supported", message),
      ),
    );
  }

  if (!profile.capabilityMatrix.packageVersions.supportedVersions.includes(input.packageBundle.version)) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "unsupported_package_version",
        "error",
        "package",
        `External execution package version ${input.packageBundle.version} is not supported by ${profile.label}.`,
        profile.capabilityMatrix.packageVersions.note,
        {
          expected: profile.capabilityMatrix.packageVersions.supportedVersions.join(", "),
          actual: String(input.packageBundle.version),
          blocking: true,
        },
      ),
    );
    unsupportedReasons.push(
      createUnsupportedReason(
        "version_not_supported",
        `Package version ${input.packageBundle.version} is not supported by ${profile.id}.`,
      ),
    );
  }

  if (!profile.capabilityMatrix.handoffVersions.supportedVersions.includes(input.handoffBundle.deferredWriterInput.version)) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "unsupported_handoff_version",
        "error",
        "handoff",
        `Handoff contract version ${input.handoffBundle.deferredWriterInput.version} is not supported by ${profile.label}.`,
        profile.capabilityMatrix.handoffVersions.note,
        {
          expected: profile.capabilityMatrix.handoffVersions.supportedVersions.join(", "),
          actual: String(input.handoffBundle.deferredWriterInput.version),
          blocking: true,
        },
      ),
    );
    unsupportedReasons.push(
      createUnsupportedReason(
        "version_not_supported",
        `Handoff version ${input.handoffBundle.deferredWriterInput.version} is not supported by ${profile.id}.`,
      ),
    );
  }

  if (!profile.capabilityMatrix.transportAdapterVersions.supportedVersions.includes(activeAdapter.version)) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "unsupported_transport_profile",
        "error",
        "transport",
        `Transport adapter version ${activeAdapter.version} is not supported by ${profile.label}.`,
        profile.capabilityMatrix.transportAdapterVersions.note,
        {
          expected: profile.capabilityMatrix.transportAdapterVersions.supportedVersions.join(", "),
          actual: String(activeAdapter.version),
          blocking: true,
        },
      ),
    );
  }

  if (!profile.capabilityMatrix.supportedTransportProfiles.includes(selectedTransportProfile as ExecutorProfileResolution["selectedTransportProfile"])) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "unsupported_transport_profile",
        "error",
        "transport",
        `${selectedTransportProfile} is not supported by ${profile.label}.`,
        "Use a compatible executor profile or change the active transport adapter.",
        {
          expected: profile.capabilityMatrix.supportedTransportProfiles.join(", "),
          actual: selectedTransportProfile,
          blocking: true,
        },
      ),
    );
    unsupportedReasons.push(
      createUnsupportedReason(
        "transport_profile_not_supported",
        `${selectedTransportProfile} is not supported by ${profile.id}.`,
      ),
    );
  }

  if (!activeAdapter.receiptCompatibilityProfiles.includes(profile.capabilityMatrix.expectedReceiptProfile)) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "unsupported_receipt_profile",
        "error",
        "receipt",
        `${profile.label} expects ${profile.capabilityMatrix.expectedReceiptProfile}, but ${activeAdapter.id} does not declare it.`,
        "Use a compatible executor profile or transport adapter.",
        {
          expected: profile.capabilityMatrix.expectedReceiptProfile,
          actual: activeAdapter.receiptCompatibilityProfiles.join(", "),
          blocking: true,
        },
      ),
    );
    unsupportedReasons.push(
      createUnsupportedReason(
        "receipt_profile_not_supported",
        `${activeAdapter.id} does not support expected receipt profile ${profile.capabilityMatrix.expectedReceiptProfile}.`,
      ),
    );
  }

  activeAdapter.receiptCompatibilityProfiles
    .filter((receiptProfile) => !profile.capabilityMatrix.supportedReceiptProfiles.includes(receiptProfile))
    .forEach((receiptProfile) => {
      issues.push(
        createIssue(
          input,
          profile.id,
          "receipt_profile_warning",
          "warning",
          "receipt",
          `${activeAdapter.id} declares receipt profile ${receiptProfile}, which is outside ${profile.label}.`,
          "Keep receipt imports on the supported compatibility profiles for this executor.",
          {
            expected: profile.capabilityMatrix.supportedReceiptProfiles.join(", "),
            actual: receiptProfile,
            blocking: false,
          },
        ),
      );
    });

  profile.capabilityMatrix.requiredPackageMembers.forEach((relativePath) => {
    if (!hasPackageMember(input.packageBundle, relativePath)) {
      issues.push(
        createIssue(
          input,
          profile.id,
          "missing_required_package_member",
          "error",
          "package",
          `Required package member ${relativePath} is missing.`,
          "Regenerate the external execution package before dispatch.",
          {
            relativePath,
            blocking: true,
          },
        ),
      );
    }
  });

  profile.capabilityMatrix.optionalPackageMembers.forEach((relativePath) => {
    if (!hasPackageMember(input.packageBundle, relativePath)) {
      issues.push(
        createIssue(
          input,
          profile.id,
          "optional_member_missing",
          "warning",
          "package",
          `Optional package member ${relativePath} is not present.`,
          "This does not block dispatch, but some external inspection detail is unavailable.",
          {
            relativePath,
            blocking: false,
          },
        ),
      );
    }
  });

  const generatedPayloadKinds = input.packageBundle.generatedArtifactIndexJson.artifacts.map((artifact) => artifact.payloadKind);
  profile.capabilityMatrix.requiredGeneratedPayloadKinds.forEach((payloadKind) => {
    if (!generatedPayloadKinds.includes(payloadKind)) {
      issues.push(
        createIssue(
          input,
          profile.id,
          "missing_required_generated_payload",
          "error",
          "package",
          `Required generated payload ${payloadKind} is missing from the external execution package.`,
          "Regenerate delivery execution prep and staging before dispatch.",
          {
            actual: generatedPayloadKinds.join(", "),
            expected: payloadKind,
            blocking: true,
          },
        ),
      );
    }
  });

  if (input.packageBundle.status === "blocked") {
    issues.push(
      createIssue(
        input,
        profile.id,
        "package_status_blocked",
        "error",
        "package",
        "The external execution package is currently blocked.",
        input.packageBundle.summaryJson.note,
        {
          blocking: true,
        },
      ),
    );
  } else if (input.packageBundle.status === "partial") {
    issues.push(
      createIssue(
        input,
        profile.id,
        "package_status_partial",
        "warning",
        "package",
        "The external execution package is only partially ready.",
        input.packageBundle.summaryJson.note,
        {
          blocking: false,
        },
      ),
    );
  }

  const signatureDrift = [
    input.packageBundle.sourceSignature !== input.handoffBundle.deferredWriterInput.sourceSignature
      || input.packageBundle.sourceSignature !== input.writerRunBundle.input.sourceSignature
      || input.packageBundle.sourceSignature !== input.transportBundle.sourceSignature,
    input.packageBundle.reviewSignature !== input.handoffBundle.deferredWriterInput.reviewSignature
      || input.packageBundle.reviewSignature !== input.writerRunBundle.input.reviewSignature
      || input.packageBundle.reviewSignature !== input.transportBundle.reviewSignature,
    input.packageBundle.deliveryPackageSignature !== input.handoffBundle.deferredWriterInput.deliveryPackageSignature
      || input.packageBundle.deliveryPackageSignature !== input.writerRunBundle.input.deliveryPackageSignature
      || input.packageBundle.deliveryPackageSignature !== input.transportBundle.deliveryPackageSignature,
  ].some(Boolean);

  if (signatureDrift) {
    issues.push(
      createIssue(
        input,
        profile.id,
        "signature_mismatch",
        "error",
        "signature",
        "Source, review, or delivery package signatures drift across package, handoff, runner, and transport layers.",
        "Rebuild downstream delivery layers from the current imported base and saved review overlay before dispatch.",
        {
          blocking: true,
        },
      ),
    );
  }

  return {
    issues,
    unsupportedReasons,
  };
}

function buildSummary(
  readiness: ExecutorPackageReadiness,
  issues: ExecutorCompatibilityIssue[],
  artifactResults: ExecutorCompatibilityArtifactResult[],
) {
  return {
    compatibleArtifactCount: artifactResults.filter((artifact) => artifact.readiness === "compatible").length,
    warningArtifactCount: artifactResults.filter((artifact) => artifact.readiness === "compatible-with-warnings").length,
    partialArtifactCount: artifactResults.filter((artifact) => artifact.readiness === "partial").length,
    incompatibleArtifactCount: artifactResults.filter((artifact) => artifact.readiness === "incompatible" || artifact.readiness === "unsupported").length,
    blockedArtifactCount: artifactResults.filter((artifact) => artifact.readiness === "blocked").length,
    issueCount: issues.length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    blockingCount: issues.filter((issue) => issue.blocking).length,
    note: readiness === "compatible"
      ? "External execution package is fully compatible with the selected executor profile."
      : readiness === "compatible-with-warnings"
        ? "External execution package is compatible, but warnings should be reviewed before dispatch."
        : readiness === "partial"
          ? "External execution package is partially compatible and still has known gaps."
          : readiness === "blocked"
            ? "External execution package is blocked by missing prerequisites or blocked deferred artifacts."
            : readiness === "incompatible"
              ? "External execution package is incompatible with the selected executor profile."
              : "External execution package is unsupported by the selected executor profile.",
  } satisfies ExecutorCompatibilitySummary;
}

function determineResultReadiness(
  issues: ExecutorCompatibilityIssue[],
  unsupportedReasons: ExecutorPackageUnsupportedReason[],
  artifactResults: ExecutorCompatibilityArtifactResult[],
): ExecutorPackageReadiness {
  if (unsupportedReasons.some((reason) =>
    reason.code === "profile_not_supported"
    || reason.code === "artifact_kind_not_supported"
    || reason.code === "version_not_supported",
  )) {
    return "unsupported";
  }

  if (issues.some((issue) => issue.code === "unsupported_transport_profile" || issue.code === "unsupported_receipt_profile" || issue.code === "unsupported_package_version")) {
    return "incompatible";
  }

  if (issues.some((issue) => issue.blocking)) {
    return "blocked";
  }

  if (artifactResults.some((artifact) => artifact.readiness === "partial")) {
    return "partial";
  }

  if (issues.some((issue) => issue.severity === "warning") || artifactResults.some((artifact) => artifact.readiness === "compatible-with-warnings")) {
    return "compatible-with-warnings";
  }

  return "compatible";
}

export function validateExecutorPackageCompatibilitySync(input: ExecutorPackageValidationInput) {
  const { adapter: activeAdapter } = chooseActiveTransportAdapter(input);
  const selectedTransportProfile = createExecutorTransportProfileId(activeAdapter.id);
  const selectedProfileId = resolveExecutorCompatibilityProfileId(selectedTransportProfile, input.preferredProfileId);
  const profile = getExecutorCompatibilityProfile(selectedProfileId);
  const profileResolution = buildProfileResolution(input, profile, selectedTransportProfile);
  const packageIssues = buildPackageIssues(input, profile, selectedTransportProfile, activeAdapter);
  const artifactResults = buildArtifactResults(input, profile, selectedTransportProfile);
  const issues = [...packageIssues.issues, ...artifactResults.flatMap((artifact) => artifact.issues)]
    .sort((left, right) => left.id.localeCompare(right.id));
  const unsupportedReasons = [...packageIssues.unsupportedReasons].sort((left, right) =>
    `${left.code}:${left.artifactId ?? ""}:${left.message}`.localeCompare(`${right.code}:${right.artifactId ?? ""}:${right.message}`),
  );
  const readiness = determineResultReadiness(issues, unsupportedReasons, artifactResults);
  const summary = buildSummary(readiness, issues, artifactResults);

  return {
    profile,
    profileResolution,
    result: {
      id: `executor-compatibility-result-${stableToken(input.packageBundle.id, selectedProfileId, readiness)}`,
      packageId: input.packageBundle.id,
      jobId: input.packageBundle.jobId,
      deliveryPackageId: input.packageBundle.deliveryPackageId,
      profileId: selectedProfileId,
      sourceSignature: input.packageBundle.sourceSignature,
      reviewSignature: input.packageBundle.reviewSignature,
      deliveryPackageSignature: input.packageBundle.deliveryPackageSignature,
      readiness,
      issues,
      unsupportedReasons,
      artifactResults,
      summary,
    } satisfies ExecutorPackageCompatibilityResult,
  };
}
