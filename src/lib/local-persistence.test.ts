import assert from "node:assert/strict";
import test from "node:test";

import type { AppSettings } from "./domain";
import { DRAFT_STORAGE_KEY, readStoredDraft, type NewJobDraft } from "./local-draft";
import { readStoredSettings, SETTINGS_STORAGE_KEY } from "./local-settings";

function createLocalStorageMock(seed: Record<string, string> = {}) {
  const storage = new Map(Object.entries(seed));

  return {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key) ?? null : null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

function withMockWindow<T>(seed: Record<string, string>, callback: () => T) {
  const originalWindow = (globalThis as { window?: unknown }).window;

  Object.assign(globalThis, {
    window: { localStorage: createLocalStorageMock(seed) },
  });

  try {
    return callback();
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.assign(globalThis, { window: originalWindow });
    }
  }
}

test("settings storage returns a stable snapshot when storage is unchanged", () => {
  const defaults: AppSettings = {
    defaultTemplateId: "template-dialogue",
    showDenseTables: true,
    defaultHandlesFrames: 12,
    defaultReferenceVideo: true,
    defaultReportGrouping: "severity",
    localPersistenceEnabled: true,
  };

  const serializedSettings = JSON.stringify({
    defaultTemplateId: "template-music",
    showDenseTables: false,
    defaultHandlesFrames: 8,
    defaultReferenceVideo: false,
    defaultReportGrouping: "scope",
    localPersistenceEnabled: true,
  });

  withMockWindow({ [SETTINGS_STORAGE_KEY]: serializedSettings }, () => {
    const firstSettings = readStoredSettings(defaults);
    const secondSettings = readStoredSettings({ ...defaults });

    assert.equal(firstSettings, secondSettings);
  });
});

test("draft storage returns a stable snapshot when storage is unchanged", () => {
  const defaults: NewJobDraft = {
    stepIndex: 0,
    selectedBundleId: "bundle-1",
    selectedTemplateId: "template-dialogue",
  };

  const serializedDraft = JSON.stringify({
    stepIndex: 2,
    selectedBundleId: "bundle-2",
    selectedTemplateId: "template-music",
  });

  withMockWindow({ [DRAFT_STORAGE_KEY]: serializedDraft }, () => {
    const firstDraft = readStoredDraft(defaults);
    const secondDraft = readStoredDraft({ ...defaults });

    assert.equal(firstDraft, secondDraft);
  });
});

test("draft storage returns a stable default snapshot when no stored value exists", () => {
  const defaults: NewJobDraft = {
    stepIndex: 0,
    selectedBundleId: "bundle-1",
    selectedTemplateId: "template-dialogue",
  };

  withMockWindow({}, () => {
    const firstDraft = readStoredDraft(defaults);
    const secondDraft = readStoredDraft({ ...defaults });

    assert.equal(firstDraft, secondDraft);
  });
});

test("settings storage returns a stable default snapshot when no stored value exists", () => {
  const defaults: AppSettings = {
    defaultTemplateId: "template-dialogue",
    showDenseTables: true,
    defaultHandlesFrames: 12,
    defaultReferenceVideo: true,
    defaultReportGrouping: "severity",
    localPersistenceEnabled: true,
  };

  withMockWindow({}, () => {
    const firstSettings = readStoredSettings(defaults);
    const secondSettings = readStoredSettings({ ...defaults });

    assert.equal(firstSettings, secondSettings);
  });
});
