import assert from "node:assert/strict";
import test from "node:test";

import {
  ALLOW_LARGE_MEDIA_ENV_FLAG,
  PRIVATE_SAMPLE_ENV_FLAG,
  PRIVATE_SAMPLE_TARGET_ENV_FLAG,
  describePrivateSampleTargetOptIn,
  evaluateLargeMediaReadGuard,
  isKnownPrivateFixtureCompanion,
  isPrivateSampleTargetSelected,
  shouldIncludePrivateFixtureCompanion,
  shouldTraversePrivateFixtureDirectory,
} from "./private-fixture-guards";

test("nested sample-2 private media paths resolve to the explicit fixture guard registration", () => {
  const nestedSampleTwoAudioPath = "C:\\fixtures\\intake\\r2n-test-2\\OMO\\INTERVIEW\\AUDIO";
  const nestedSampleTwoVideoPath = "C:\\fixtures\\intake\\r2n-test-2\\OMO\\INTERVIEW\\VIDEO";

  assert.equal(isKnownPrivateFixtureCompanion(nestedSampleTwoAudioPath, "A-002.WAV"), true);
  assert.equal(isKnownPrivateFixtureCompanion(nestedSampleTwoVideoPath, "F002_08151648_C005.mov"), true);
});

test("sample-3 top-level large companions are registered explicitly and stay excluded from normal runs", () => {
  const sampleThreePath = "C:\\fixtures\\intake\\r2n-test-3";

  assert.equal(isKnownPrivateFixtureCompanion(sampleThreePath, "OMO PROMO CATCHUP 08.mp4"), true);
  assert.equal(isKnownPrivateFixtureCompanion(sampleThreePath, "OMO PROMO CATCHUP 08.otioz"), true);
  assert.equal(shouldIncludePrivateFixtureCompanion(sampleThreePath, "OMO PROMO CATCHUP 08.mp4"), false);
  assert.equal(shouldIncludePrivateFixtureCompanion(sampleThreePath, "OMO PROMO CATCHUP 08.otioz"), false);
});

test("sample-4 large companions and Fairlight project bundle are registered explicitly and stay excluded from normal runs", () => {
  const sampleFourPath = "C:\\fixtures\\intake\\r2n-test-4";

  assert.equal(isKnownPrivateFixtureCompanion(sampleFourPath, "Channel mapping and linked groups.mp4"), true);
  assert.equal(isKnownPrivateFixtureCompanion(sampleFourPath, "Channel mapping and linked groups.otioz"), true);
  assert.equal(shouldIncludePrivateFixtureCompanion(sampleFourPath, "Channel mapping and linked groups.mp4"), false);
  assert.equal(shouldIncludePrivateFixtureCompanion(sampleFourPath, "Channel mapping and linked groups.otioz"), false);
  assert.equal(shouldTraversePrivateFixtureDirectory(sampleFourPath, "DR17 Fairlight Intro Tutorial.dra"), false);
});

test("private sample target scoping keeps unrelated private fixtures excluded even with dual opt-in enabled", () => {
  const env = {
    [PRIVATE_SAMPLE_ENV_FLAG]: "1",
    [ALLOW_LARGE_MEDIA_ENV_FLAG]: "1",
    [PRIVATE_SAMPLE_TARGET_ENV_FLAG]: "r2n-test-2",
  };

  assert.equal(isPrivateSampleTargetSelected("r2n-test-1", env), false);
  assert.equal(isPrivateSampleTargetSelected("r2n-test-2", env), true);
  assert.equal(shouldIncludePrivateFixtureCompanion("C:\\tmp\\r2n-test-1", "Timeline 1.mp4", env), false);
  assert.equal(shouldIncludePrivateFixtureCompanion("C:\\tmp\\r2n-test-2", "OMO PROMO FINAL.mp4", env), true);
  assert.equal(shouldTraversePrivateFixtureDirectory("C:\\tmp\\r2n-test-1", "OMO", env), true);
  assert.equal(shouldTraversePrivateFixtureDirectory("C:\\tmp\\r2n-test-2", "OMO", env), true);
});

test("wrong private sample target keeps direct sample-1 reads blocked during a sample-2 private pass", () => {
  const env = {
    [PRIVATE_SAMPLE_ENV_FLAG]: "1",
    [ALLOW_LARGE_MEDIA_ENV_FLAG]: "1",
    [PRIVATE_SAMPLE_TARGET_ENV_FLAG]: "r2n-test-2",
  };

  const decision = evaluateLargeMediaReadGuard({
    folderPath: "C:\\fixtures\\intake\\r2n-test-1",
    fileName: "230407_002.WAV",
    fileKind: "wav",
    sizeBytes: 1024,
    env,
  });

  assert.equal(decision.allowed, false);
  assert.match(decision.reason ?? "", /CONFORM_BRIDGE_PRIVATE_SAMPLE_TARGET=r2n-test-1/i);
  assert.equal(decision.reason, `Skipped private local fixture media for 230407_002.WAV. ${describePrivateSampleTargetOptIn("r2n-test-1")}.`);
});
