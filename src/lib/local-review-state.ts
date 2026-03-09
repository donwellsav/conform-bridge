import type {
  FieldRecorderOverrideStatus,
  MappingAction,
  MetadataStatus,
  ReconformReviewStatus,
  ReviewState,
  ReviewStateKey,
  ReviewStateVersion,
  TargetType,
  ValidationReviewStatus,
} from "./types";
import { REVIEW_STATE_VERSION } from "./review-state";

export const REVIEW_STATE_STORAGE_KEY = "conform-bridge/review-state/v1";

type Listener = () => void;

export interface ReviewStateStore {
  version: ReviewStateVersion;
  states: Record<ReviewStateKey, ReviewState>;
}

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isMappingAction(value: unknown): value is MappingAction {
  return value === "preserve" || value === "remap" || value === "merge" || value === "ignore";
}

function isTargetType(value: unknown): value is TargetType {
  return value === "audio_track" || value === "folder" || value === "group";
}

function isMetadataStatus(value: unknown): value is MetadataStatus {
  return value === "mapped" || value === "transformed" || value === "dropped";
}

function isFieldRecorderOverrideStatus(value: unknown): value is FieldRecorderOverrideStatus {
  return value === "linked" || value === "unresolved" || value === "ignored";
}

function isValidationReviewStatus(value: unknown): value is ValidationReviewStatus {
  return value === "unreviewed" || value === "acknowledged" || value === "dismissed";
}

function isReconformReviewStatus(value: unknown): value is ReconformReviewStatus {
  return value === "unreviewed" || value === "acknowledged" || value === "needs-follow-up";
}

function deriveReviewStateKey(jobId: string, sourceSignature: string) {
  return `${jobId}::${sourceSignature}`;
}

function sanitizeTrackOverrides(value: unknown): ReviewState["trackOverrides"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.mappingId)) {
      return [];
    }

    return [{
      mappingId: item.mappingId,
      targetLane: isString(item.targetLane) ? item.targetLane : undefined,
      targetType: isTargetType(item.targetType) ? item.targetType : undefined,
      action: isMappingAction(item.action) ? item.action : undefined,
    }];
  });
}

function sanitizeMetadataOverrides(value: unknown): ReviewState["metadataOverrides"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.mappingId)) {
      return [];
    }

    return [{
      mappingId: item.mappingId,
      targetValue: isString(item.targetValue) ? item.targetValue : undefined,
      status: isMetadataStatus(item.status) ? item.status : undefined,
    }];
  });
}

function sanitizeMarkerDecisions(value: unknown): ReviewState["markerDecisions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.markerId) || !isMappingAction(item.action)) {
      return [];
    }

    return [{
      markerId: item.markerId,
      action: item.action,
      note: isString(item.note) ? item.note : "",
    }];
  });
}

function sanitizeFieldRecorderDecisions(value: unknown): ReviewState["fieldRecorderDecisions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.candidateId) || !isFieldRecorderOverrideStatus(item.status)) {
      return [];
    }

    return [{
      candidateId: item.candidateId,
      status: item.status,
      note: isString(item.note) ? item.note : "",
    }];
  });
}

function sanitizeValidationAcknowledgements(value: unknown): ReviewState["validationAcknowledgements"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.issueKey) || !isValidationReviewStatus(item.status)) {
      return [];
    }

    return [{
      issueKey: item.issueKey,
      status: item.status,
      note: isString(item.note) ? item.note : "",
    }];
  });
}

function sanitizeReconformDecisions(value: unknown): ReviewState["reconformDecisions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isObject(item) || !isString(item.changeEventId) || !isReconformReviewStatus(item.status)) {
      return [];
    }

    return [{
      changeEventId: item.changeEventId,
      status: item.status,
      note: isString(item.note) ? item.note : "",
    }];
  });
}

function coerceStoredReviewState(candidate: unknown): ReviewState | undefined {
  if (!isObject(candidate) || !isString(candidate.jobId) || !isString(candidate.sourceSignature)) {
    return undefined;
  }

  const key = isString(candidate.key)
    ? candidate.key
    : deriveReviewStateKey(candidate.jobId, candidate.sourceSignature);

  return {
    version: REVIEW_STATE_VERSION,
    key,
    jobId: candidate.jobId,
    sourceSignature: candidate.sourceSignature,
    trackOverrides: sanitizeTrackOverrides(candidate.trackOverrides),
    metadataOverrides: sanitizeMetadataOverrides(candidate.metadataOverrides),
    markerDecisions: sanitizeMarkerDecisions(candidate.markerDecisions),
    fieldRecorderDecisions: sanitizeFieldRecorderDecisions(candidate.fieldRecorderDecisions),
    validationAcknowledgements: sanitizeValidationAcknowledgements(candidate.validationAcknowledgements),
    reconformDecisions: sanitizeReconformDecisions(candidate.reconformDecisions),
  };
}

export function createEmptyReviewStateStore(): ReviewStateStore {
  return {
    version: REVIEW_STATE_VERSION,
    states: {},
  };
}

function normalizeReviewStateStore(candidate: unknown): ReviewStateStore {
  const emptyStore = createEmptyReviewStateStore();

  if (!isObject(candidate)) {
    return emptyStore;
  }

  if (isObject(candidate.states)) {
    const states = Object.entries(candidate.states).reduce<Record<ReviewStateKey, ReviewState>>((collection, [key, value]) => {
      const reviewState = coerceStoredReviewState(value);
      if (reviewState) {
        collection[key] = {
          ...reviewState,
          key,
        };
      }
      return collection;
    }, {});

    return {
      version: REVIEW_STATE_VERSION,
      states,
    };
  }

  const singleState = coerceStoredReviewState(candidate);
  if (singleState) {
    return {
      version: REVIEW_STATE_VERSION,
      states: {
        [singleState.key]: singleState,
      },
    };
  }

  const states = Object.entries(candidate).reduce<Record<ReviewStateKey, ReviewState>>((collection, [key, value]) => {
    const reviewState = coerceStoredReviewState(value);
    if (reviewState) {
      collection[key] = {
        ...reviewState,
        key,
      };
    }
    return collection;
  }, {});

  return {
    version: REVIEW_STATE_VERSION,
    states,
  };
}

export function mergeStoredReviewState(defaultState: ReviewState, candidate: unknown): ReviewState {
  const parsed = coerceStoredReviewState(candidate);
  if (!parsed) {
    return defaultState;
  }

  if (
    parsed.jobId !== defaultState.jobId
    || parsed.sourceSignature !== defaultState.sourceSignature
    || parsed.key !== defaultState.key
  ) {
    return defaultState;
  }

  return {
    ...defaultState,
    ...parsed,
    version: REVIEW_STATE_VERSION,
    key: defaultState.key,
    jobId: defaultState.jobId,
    sourceSignature: defaultState.sourceSignature,
    trackOverrides: parsed.trackOverrides,
    metadataOverrides: parsed.metadataOverrides,
    markerDecisions: parsed.markerDecisions,
    fieldRecorderDecisions: parsed.fieldRecorderDecisions,
    validationAcknowledgements: parsed.validationAcknowledgements,
    reconformDecisions: parsed.reconformDecisions,
  };
}

export function resolveStoredReviewState(defaultState: ReviewState, store: ReviewStateStore) {
  return mergeStoredReviewState(defaultState, store.states[defaultState.key]);
}

export function subscribeToReviewStates(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStoredReviewStateStore(): ReviewStateStore {
  if (typeof window === "undefined") {
    return createEmptyReviewStateStore();
  }

  const rawValue = window.localStorage.getItem(REVIEW_STATE_STORAGE_KEY);
  if (!rawValue) {
    return createEmptyReviewStateStore();
  }

  try {
    return normalizeReviewStateStore(JSON.parse(rawValue));
  } catch {
    return createEmptyReviewStateStore();
  }
}

export function readStoredReviewState(defaultState: ReviewState) {
  return resolveStoredReviewState(defaultState, readStoredReviewStateStore());
}

export function hasStoredReviewState(reviewStateKey: ReviewStateKey) {
  return Boolean(readStoredReviewStateStore().states[reviewStateKey]);
}

export function listStoredReviewStateKeys() {
  return Object.keys(readStoredReviewStateStore().states);
}

export function writeStoredReviewState(reviewState: ReviewState) {
  if (typeof window === "undefined") {
    return;
  }

  const store = readStoredReviewStateStore();
  const nextStore: ReviewStateStore = {
    version: REVIEW_STATE_VERSION,
    states: {
      ...store.states,
      [reviewState.key]: {
        ...reviewState,
        version: REVIEW_STATE_VERSION,
      },
    },
  };

  window.localStorage.setItem(REVIEW_STATE_STORAGE_KEY, JSON.stringify(nextStore));
  emit();
}

export function clearStoredReviewState(reviewStateKey: ReviewStateKey) {
  if (typeof window === "undefined") {
    return;
  }

  const store = readStoredReviewStateStore();
  const remainingStates = { ...store.states };
  Reflect.deleteProperty(remainingStates, reviewStateKey);
  const nextStore = {
    version: REVIEW_STATE_VERSION,
    states: remainingStates,
  } satisfies ReviewStateStore;

  if (Object.keys(nextStore.states).length === 0) {
    window.localStorage.removeItem(REVIEW_STATE_STORAGE_KEY);
  } else {
    window.localStorage.setItem(REVIEW_STATE_STORAGE_KEY, JSON.stringify(nextStore));
  }

  emit();
}

export function exportStoredReviewStatesJson() {
  return JSON.stringify(readStoredReviewStateStore(), null, 2);
}

export function importStoredReviewStatesJson(rawValue: string) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const store = normalizeReviewStateStore(JSON.parse(rawValue));
    if (Object.keys(store.states).length === 0) {
      return false;
    }

    window.localStorage.setItem(REVIEW_STATE_STORAGE_KEY, JSON.stringify(store));
    emit();
    return true;
  } catch {
    return false;
  }
}
