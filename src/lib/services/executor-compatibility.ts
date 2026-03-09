import { joinPath, stableToken } from "./writer-run-audit";
import { validateExecutorPackageCompatibilitySync, type ExecutorPackageValidationInput } from "./executor-package-validation";
import type { ExecutorCompatibilityBundle, ExecutorCompatibilityEntry } from "../types";

function createEntry(
  rootRelativePath: string,
  fileName: ExecutorCompatibilityEntry["fileName"],
  payloadKind: ExecutorCompatibilityEntry["payloadKind"],
  content: string,
  summary: string,
): ExecutorCompatibilityEntry {
  return {
    kind: "executor_compatibility_entry",
    relativePath: joinPath(rootRelativePath, "handoff", fileName),
    fileName,
    payloadKind,
    mimeType: "application/json",
    content,
    summary,
  };
}

export function prepareExecutorCompatibilityBundleSync(input: ExecutorPackageValidationInput): ExecutorCompatibilityBundle {
  const { profile, profileResolution, result } = validateExecutorPackageCompatibilitySync(input);
  const entries: ExecutorCompatibilityEntry[] = [
    createEntry(
      input.packageBundle.rootRelativePath,
      "executor-profile-resolution.json",
      "executor_profile_resolution",
      JSON.stringify(profileResolution, null, 2),
      "Resolved executor compatibility profile, transport profile, and expected receipt compatibility contract for this package.",
    ),
    createEntry(
      input.packageBundle.rootRelativePath,
      "executor-compatibility-report.json",
      "executor_compatibility_report",
      JSON.stringify(result, null, 2),
      "Deterministic executor compatibility validation report covering package, handoff, transport, receipt, and deferred artifact readiness.",
    ),
    createEntry(
      input.packageBundle.rootRelativePath,
      "executor-compatibility-summary.json",
      "executor_compatibility_summary",
      JSON.stringify({
        version: 1,
        profileId: profile.id,
        profileLabel: profile.label,
        readiness: result.readiness,
        summary: result.summary,
        issueCount: result.issues.length,
        unsupportedReasons: result.unsupportedReasons,
        sourceSignature: result.sourceSignature,
        reviewSignature: result.reviewSignature,
        deliveryPackageSignature: result.deliveryPackageSignature,
      }, null, 2),
      "Compact executor compatibility summary for dispatch gating and operator review.",
    ),
  ].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  return {
    id: `executor-compatibility-bundle-${input.packageBundle.jobId}-${stableToken(input.packageBundle.id, profile.id, result.readiness)}`,
    jobId: input.packageBundle.jobId,
    deliveryPackageId: input.packageBundle.deliveryPackageId,
    rootRelativePath: joinPath(input.packageBundle.rootRelativePath, "handoff"),
    packageId: input.packageBundle.id,
    sourceSignature: input.packageBundle.sourceSignature,
    reviewSignature: input.packageBundle.reviewSignature,
    deliveryPackageSignature: input.packageBundle.deliveryPackageSignature,
    profile,
    profileResolution,
    result,
    entries,
    status: result.readiness,
    summary: result.summary.note,
  };
}
