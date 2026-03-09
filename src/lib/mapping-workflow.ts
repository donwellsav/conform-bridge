import type {
  FieldRecorderCandidate,
  FieldRecorderOverride,
  FieldRecorderOverrideStatus,
  MappingAction,
  MappingProfile,
  MappingRule,
  Marker,
  MetadataStatus,
} from "./types";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cloneProfile(mappingProfile: MappingProfile): MappingProfile {
  return {
    ...mappingProfile,
    trackMappings: [...mappingProfile.trackMappings],
    metadataMappings: [...mappingProfile.metadataMappings],
    fieldRecorderOverrides: [...mappingProfile.fieldRecorderOverrides],
  };
}

function defaultCandidateDecision(candidate: FieldRecorderCandidate): FieldRecorderOverrideStatus {
  return candidate.status === "linked" ? "linked" : "unresolved";
}

function findCandidateOverrideIndex(overrides: FieldRecorderOverride[], candidate: FieldRecorderCandidate) {
  const candidateKey = candidate.matchKeys.timecode ?? candidate.clipEventId;
  return overrides.findIndex((override) =>
    override.matchField === "timecode"
    && override.sourceValue === candidateKey,
  );
}

export function countMappingReviews(
  mappingProfile: MappingProfile,
  mappingRules: MappingRule[] = [],
  fieldRecorderCandidates: FieldRecorderCandidate[] = [],
) {
  const trackRules = mappingRules.filter((rule) => rule.scope === "track");
  const markerRules = mappingRules.filter((rule) => rule.scope === "marker");
  const trackReviewCount = mappingProfile.trackMappings.filter((track) => {
    const matchingRule = trackRules.find((rule) => rule.source === track.sourceTrack);
    return track.action !== "preserve" || (matchingRule?.status !== undefined && matchingRule.status !== "locked");
  }).length;
  const metadataReviewCount = mappingProfile.metadataMappings.filter((mapping) => mapping.status !== "mapped").length;
  const fieldRecorderReviewCount = fieldRecorderCandidates.length > 0
    ? fieldRecorderCandidates.filter((candidate) => getFieldRecorderDecision(mappingProfile, candidate) !== "linked").length
    : mappingProfile.fieldRecorderOverrides.filter((override) => override.status !== "linked").length;
  const markerReviewCount = markerRules.filter((rule) => rule.status !== "locked").length;

  return {
    trackReviewCount,
    metadataReviewCount,
    fieldRecorderReviewCount,
    markerReviewCount,
    total: trackReviewCount + metadataReviewCount + fieldRecorderReviewCount + markerReviewCount,
  };
}

export function updateTrackMapping(
  mappingProfile: MappingProfile,
  mappingId: string,
  patch: Partial<MappingProfile["trackMappings"][number]>,
) {
  const nextProfile = cloneProfile(mappingProfile);
  nextProfile.trackMappings = nextProfile.trackMappings.map((trackMapping) =>
    trackMapping.id === mappingId
      ? {
          ...trackMapping,
          ...patch,
        }
      : trackMapping,
  );
  return nextProfile;
}

export function bulkSetTrackAction(mappingProfile: MappingProfile, action: MappingAction) {
  const nextProfile = cloneProfile(mappingProfile);
  nextProfile.trackMappings = nextProfile.trackMappings.map((trackMapping) => ({
    ...trackMapping,
    action,
  }));
  return nextProfile;
}

export function updateMetadataMapping(
  mappingProfile: MappingProfile,
  mappingId: string,
  patch: Partial<MappingProfile["metadataMappings"][number]>,
) {
  const nextProfile = cloneProfile(mappingProfile);
  nextProfile.metadataMappings = nextProfile.metadataMappings.map((metadataMapping) =>
    metadataMapping.id === mappingId
      ? {
          ...metadataMapping,
          ...patch,
        }
      : metadataMapping,
  );
  return nextProfile;
}

export function bulkSetMetadataStatus(mappingProfile: MappingProfile, status: MetadataStatus) {
  const nextProfile = cloneProfile(mappingProfile);
  nextProfile.metadataMappings = nextProfile.metadataMappings.map((metadataMapping) => ({
    ...metadataMapping,
    status,
  }));
  return nextProfile;
}

export function getFieldRecorderDecision(mappingProfile: MappingProfile, candidate: FieldRecorderCandidate) {
  const overrideIndex = findCandidateOverrideIndex(mappingProfile.fieldRecorderOverrides, candidate);
  if (overrideIndex >= 0) {
    return mappingProfile.fieldRecorderOverrides[overrideIndex]?.status ?? defaultCandidateDecision(candidate);
  }

  return defaultCandidateDecision(candidate);
}

export function setFieldRecorderDecision(
  mappingProfile: MappingProfile,
  candidate: FieldRecorderCandidate,
  status: FieldRecorderOverrideStatus,
) {
  const nextProfile = cloneProfile(mappingProfile);
  const overrideIndex = findCandidateOverrideIndex(nextProfile.fieldRecorderOverrides, candidate);
  const sourceValue = candidate.matchKeys.timecode ?? candidate.clipEventId;
  const override: FieldRecorderOverride = {
    id: `fro-${slugify(candidate.id)}`,
    matchField: "timecode",
    sourceValue,
    targetValue: candidate.candidateAssetName,
    status,
  };

  if (overrideIndex >= 0) {
    nextProfile.fieldRecorderOverrides[overrideIndex] = override;
  } else {
    nextProfile.fieldRecorderOverrides = [...nextProfile.fieldRecorderOverrides, override];
  }

  return nextProfile;
}

export function bulkSetFieldRecorderDecision(
  mappingProfile: MappingProfile,
  candidates: FieldRecorderCandidate[],
  status: FieldRecorderOverrideStatus,
) {
  return candidates.reduce(
    (profile, candidate) => setFieldRecorderDecision(profile, candidate, status),
    mappingProfile,
  );
}

function buildMarkerRule(marker: Marker, jobId: string, action: MappingAction): MappingRule {
  return {
    id: `rule-marker-${slugify(marker.id)}`,
    jobId,
    scope: "marker",
    source: marker.id,
    target: action === "ignore" ? "marker-suppressed" : marker.name,
    action,
    status: action === "preserve" ? "locked" : action === "remap" ? "review" : "issue",
    note: action === "ignore"
      ? "Operator chose to suppress this marker from delivery exports."
      : action === "remap"
        ? "Operator chose to review this marker before delivery export."
        : "Marker should remain preserved in delivery exports.",
  };
}

export function getMarkerAction(mappingRules: MappingRule[], marker: Marker): MappingAction {
  const rule = mappingRules.find((candidate) => candidate.scope === "marker" && candidate.source === marker.id);
  return rule?.action ?? "preserve";
}

export function setMarkerAction(
  mappingRules: MappingRule[],
  jobId: string,
  marker: Marker,
  action: MappingAction,
) {
  const nextRule = buildMarkerRule(marker, jobId, action);
  const existingIndex = mappingRules.findIndex((rule) => rule.scope === "marker" && rule.source === marker.id);

  if (existingIndex < 0) {
    return [...mappingRules, nextRule];
  }

  return mappingRules.map((rule, index) => (index === existingIndex ? nextRule : rule));
}

export function bulkSetMarkerAction(
  mappingRules: MappingRule[],
  jobId: string,
  markers: Marker[],
  action: MappingAction,
) {
  return markers.reduce(
    (rules, marker) => setMarkerAction(rules, jobId, marker, action),
    mappingRules,
  );
}
