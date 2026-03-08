export interface NewJobDraft {
  stepIndex: number;
  selectedBundleId: string;
  selectedTemplateId: string;
}

export const DRAFT_STORAGE_KEY = "conform-bridge/new-job-draft/v1";

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStepIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
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

  if (!rawValue) {
    return defaults;
  }

  try {
    return mergeDraft(defaults, JSON.parse(rawValue));
  } catch {
    return defaults;
  }
}

export function writeStoredDraft(draft: NewJobDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  emit();
}
