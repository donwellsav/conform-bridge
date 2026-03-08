import type { AppSettings } from "@/lib/domain";

export const SETTINGS_STORAGE_KEY = "conform-bridge/settings/v1";

type Listener = () => void;

const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isReportGrouping(value: unknown): value is AppSettings["defaultReportGrouping"] {
  return value === "severity" || value === "scope";
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function mergeStoredSettings(defaults: AppSettings, candidate: unknown): AppSettings {
  if (!candidate || typeof candidate !== "object") {
    return defaults;
  }

  const value = candidate as Partial<AppSettings>;

  return {
    defaultTemplateId: isString(value.defaultTemplateId) ? value.defaultTemplateId : defaults.defaultTemplateId,
    showDenseTables: isBoolean(value.showDenseTables) ? value.showDenseTables : defaults.showDenseTables,
    defaultHandlesFrames: isNumber(value.defaultHandlesFrames) ? value.defaultHandlesFrames : defaults.defaultHandlesFrames,
    defaultReferenceVideo: isBoolean(value.defaultReferenceVideo) ? value.defaultReferenceVideo : defaults.defaultReferenceVideo,
    defaultReportGrouping: isReportGrouping(value.defaultReportGrouping) ? value.defaultReportGrouping : defaults.defaultReportGrouping,
    localPersistenceEnabled: isBoolean(value.localPersistenceEnabled) ? value.localPersistenceEnabled : defaults.localPersistenceEnabled,
  };
}

export function subscribeToSettings(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStoredSettings(defaults: AppSettings): AppSettings {
  if (typeof window === "undefined") {
    return defaults;
  }

  const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (!rawValue) {
    return defaults;
  }

  try {
    return mergeStoredSettings(defaults, JSON.parse(rawValue));
  } catch {
    return defaults;
  }
}

export function hasStoredSettings() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
}

export function writeStoredSettings(settings: AppSettings) {
  if (typeof window === "undefined") {
    return;
  }

  if (!settings.localPersistenceEnabled) {
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    emit();
    return;
  }

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  emit();
}
