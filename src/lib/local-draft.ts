export interface NewJobDraft {
  stepIndex: number;
  selectedBundleId: string;
  selectedTemplateId: string;
}

export const DRAFT_STORAGE_KEY = "conform-bridge/new-job-draft/v1";

type Listener = () => void;

const listeners = new Set<Listener>();
let cachedDraftRawValue: string | null | undefined;
let cachedDraftDefaultsSignature: string | undefined;
let cachedDraftSnapshot: NewJobDraft | undefined;

function emit() {
  listeners.forEach((listener) => listener());
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStepIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

function createDraftDefaultsSignature(defaults: NewJobDraft) {
  return [defaults.stepIndex, defaults.selectedBundleId, defaults.selectedTemplateId].join("::");
}

export function subscribeToDraft(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function mergeDraft(defaults: NewJobDraft, candidate: unknown): NewJobDraft {
  if (!candidate || typeof candidate !== "object") {
    return defaults;
  }

  const value = candidate as Partial<NewJobDraft>;

  return {
    stepIndex: isStepIndex(value.stepIndex) ? value.stepIndex : defaults.stepIndex,
    selectedBundleId: isString(value.selectedBundleId) ? value.selectedBundleId : defaults.selectedBundleId,
    selectedTemplateId: isString(value.selectedTemplateId) ? value.selectedTemplateId : defaults.selectedTemplateId,
  };
}

export function readStoredDraft(defaults: NewJobDraft): NewJobDraft {
  if (typeof window === "undefined") {
    return defaults;
  }

  const rawValue = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  const defaultsSignature = createDraftDefaultsSignature(defaults);

  if (
    cachedDraftSnapshot
    && cachedDraftRawValue === rawValue
    && cachedDraftDefaultsSignature === defaultsSignature
  ) {
    return cachedDraftSnapshot;
  }

  if (!rawValue) {
    cachedDraftRawValue = null;
    cachedDraftDefaultsSignature = defaultsSignature;
    cachedDraftSnapshot = defaults;
    return defaults;
  }

  try {
    const nextDraft = mergeDraft(defaults, JSON.parse(rawValue));
    cachedDraftRawValue = rawValue;
    cachedDraftDefaultsSignature = defaultsSignature;
    cachedDraftSnapshot = nextDraft;
    return nextDraft;
  } catch {
    cachedDraftRawValue = rawValue;
    cachedDraftDefaultsSignature = defaultsSignature;
    cachedDraftSnapshot = defaults;
    return defaults;
  }
}

export function writeStoredDraft(draft: NewJobDraft) {
  if (typeof window === "undefined") {
    return;
  }

  const serializedDraft = JSON.stringify(draft);
  cachedDraftRawValue = serializedDraft;
  cachedDraftDefaultsSignature = createDraftDefaultsSignature(draft);
  cachedDraftSnapshot = draft;
  window.localStorage.setItem(DRAFT_STORAGE_KEY, serializedDraft);
  emit();
}
