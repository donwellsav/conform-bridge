import assert from "node:assert/strict";
import test from "node:test";

import { createElement, useSyncExternalStore } from "react";
import { renderToString } from "react-dom/server";

import {
  REVIEW_STATE_STORAGE_KEY,
  clearStoredReviewState,
  createEmptyReviewStateStore,
  readStoredReviewState,
  readStoredReviewStateStore,
  resolveStoredReviewState,
  subscribeToReviewStates,
  writeStoredReviewState,
} from "./local-review-state";
import { createEmptyReviewState } from "./review-state";

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

function withMockWindow<T>(seed: Record<string, string>, callback: (localStorage: ReturnType<typeof createLocalStorageMock>) => T) {
  const localStorage = createLocalStorageMock(seed);
  const originalWindow = (globalThis as { window?: unknown }).window;

  Object.assign(globalThis, {
    window: { localStorage },
  });

  try {
    return callback(localStorage);
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.assign(globalThis, { window: originalWindow });
    }
  }
}

test("review-state storage is SSR-safe when window is unavailable", () => {
  const defaultState = createEmptyReviewState("job-test", "sig-test");

  assert.deepEqual(readStoredReviewStateStore(), createEmptyReviewStateStore());
  assert.deepEqual(readStoredReviewState(defaultState), defaultState);
});

test("review-state storage handles corrupt and migrated payloads", () => {
  const defaultState = createEmptyReviewState("job-test", "sig-test");
  const migratedPayload = JSON.stringify({
    [defaultState.key]: {
      jobId: "job-test",
      sourceSignature: "sig-test",
      trackOverrides: [{ mappingId: "tm-1", action: "ignore" }],
      validationAcknowledgements: [{ issueKey: "issue-1", status: "acknowledged", note: "Reviewed" }],
    },
  });

  withMockWindow({ [REVIEW_STATE_STORAGE_KEY]: "{not-json" }, () => {
    assert.deepEqual(readStoredReviewStateStore(), createEmptyReviewStateStore());
  });

  withMockWindow({ [REVIEW_STATE_STORAGE_KEY]: migratedPayload }, () => {
    const store = readStoredReviewStateStore();
    const reviewState = resolveStoredReviewState(defaultState, store);

    assert.equal(reviewState.trackOverrides.length, 1);
    assert.equal(reviewState.trackOverrides[0]?.action, "ignore");
    assert.equal(reviewState.validationAcknowledgements[0]?.status, "acknowledged");
  });
});

test("review-state storage writes, reads, and clears persisted deltas", () => {
  const defaultState = createEmptyReviewState("job-test", "sig-test");

  withMockWindow({}, () => {
    const nextState = {
      ...defaultState,
      trackOverrides: [{ mappingId: "tm-1", action: "remap" }],
    };

    writeStoredReviewState(nextState);
    assert.equal(readStoredReviewState(nextState).trackOverrides[0]?.action, "remap");

    clearStoredReviewState(nextState.key);
    assert.deepEqual(readStoredReviewState(defaultState), defaultState);
  });
});

test("review-state storage returns a stable snapshot when storage is unchanged", () => {
  const defaultState = createEmptyReviewState("job-test", "sig-test");
  const serializedStore = JSON.stringify({
    version: 1,
    states: {
      [defaultState.key]: {
        version: 1,
        key: defaultState.key,
        jobId: defaultState.jobId,
        sourceSignature: defaultState.sourceSignature,
        trackOverrides: [{ mappingId: "tm-1", action: "ignore" }],
        metadataOverrides: [],
        markerDecisions: [],
        fieldRecorderDecisions: [],
        validationAcknowledgements: [],
        reconformDecisions: [],
      },
    },
  });

  withMockWindow({ [REVIEW_STATE_STORAGE_KEY]: serializedStore }, () => {
    const firstStore = readStoredReviewStateStore();
    const secondStore = readStoredReviewStateStore();

    assert.equal(firstStore, secondStore);
  });
});

test("review-state storage can support SSR-safe initial render through useSyncExternalStore", () => {
  const defaultState = createEmptyReviewState("job-test", "sig-test");

  function Probe() {
    const reviewState = useSyncExternalStore(
      subscribeToReviewStates,
      () => readStoredReviewState(defaultState),
      () => defaultState,
    );

    return createElement("span", null, reviewState.jobId);
  }

  const output = renderToString(createElement(Probe));
  assert.match(output, /job-test/);
});
