import { basename } from "node:path";

export const PRIVATE_SAMPLE_ENV_FLAG = "CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE";
export const ALLOW_LARGE_MEDIA_ENV_FLAG = "CONFORM_BRIDGE_ALLOW_LARGE_MEDIA";
export const PRIVATE_SAMPLE_TARGET_ENV_FLAG = "CONFORM_BRIDGE_PRIVATE_SAMPLE_TARGET";
export const DEFAULT_MAX_DIRECT_MEDIA_FILE_BYTES = 64 * 1024 * 1024;

interface PrivateFixtureCompanionSet {
  fileNames: string[];
  directoryNames?: string[];
}

const KNOWN_PRIVATE_FIXTURE_COMPANIONS: Record<string, PrivateFixtureCompanionSet> = {
  "r2n-test-1": {
    fileNames: [
      "230407_002.WAV",
      "F2-BT_002.WAV",
      "F2_002.WAV",
      "Timeline 1.mp4",
      "Timeline 1.otioz",
    ],
  },
  "r2n-test-2": {
    fileNames: [
      "A-002.WAV",
      "A-005.WAV",
      "A-007.WAV",
      "A-008.WAV",
      "A002_08061903_C044.mov",
      "A002_08061905_C048.mov",
      "D007_07151830_C008.mov",
      "D007_07151843_C017.mov",
      "D008_07161256_C002.mov",
      "D008_07161601_C034.mov",
      "D009_07202028_C011.mov",
      "D009_07202059_C036.mov",
      "E001_08020510_C005.mov",
      "E001_08020513_C008.mov",
      "E001_08020516_C012.mov",
      "E001_08020528_C020.mov",
      "E001_08050841_C070.mov",
      "E001_08292255_C028.mov",
      "F002_08151648_C005.mov",
      "F002_08151655_C008.mov",
      "F002_08151726_C011.mov",
      "F002_08151729_C012.mov",
      "F005_08201556_C001.mov",
      "OMO PROMO FINAL.mp4",
      "OMO PROMO FINAL.otioz",
      "ONE MIN SOUNDTRACK.wav",
      "TESTFAILD007_07151842_C016.mov",
    ],
    directoryNames: [
      "OMO",
    ],
  },
  "r2n-test-3": {
    fileNames: [
      "OMO PROMO CATCHUP 08.mp4",
      "OMO PROMO CATCHUP 08.otioz",
    ],
  },
  "r2n-test-4": {
    fileNames: [
      "Channel mapping and linked groups.mp4",
      "Channel mapping and linked groups.otioz",
    ],
    directoryNames: [
      "DR17 Fairlight Intro Tutorial.dra",
    ],
  },
};

const directReadGuardKinds = new Set(["wav", "bwf"]);

function normalizeFixtureId(folderPath: string) {
  const normalizedSegments = folderPath
    .replaceAll("\\", "/")
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0);
  const knownFixtureId = normalizedSegments.find((segment) => segment in KNOWN_PRIVATE_FIXTURE_COMPANIONS);
  if (knownFixtureId) {
    return knownFixtureId;
  }

  return basename(folderPath).trim().toLowerCase();
}

function normalizeFileName(fileName: string) {
  return fileName.trim().toLowerCase();
}

function describeFixtureLabel(fixtureId: string) {
  return fixtureId.trim().toLowerCase();
}

function formatMegabytes(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getKnownPrivateFixtureCompanionNames(fixtureId: string) {
  return [...(KNOWN_PRIVATE_FIXTURE_COMPANIONS[fixtureId.toLowerCase()]?.fileNames ?? [])];
}

export function getKnownPrivateFixtureCompanionDirectoryNames(fixtureId: string) {
  return [...(KNOWN_PRIVATE_FIXTURE_COMPANIONS[fixtureId.toLowerCase()]?.directoryNames ?? [])];
}

export function isPrivateSampleRunEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env[PRIVATE_SAMPLE_ENV_FLAG] === "1";
}

export function isLargeMediaReadEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env[ALLOW_LARGE_MEDIA_ENV_FLAG] === "1";
}

export function isLargeMediaOptInEnabled(env: NodeJS.ProcessEnv = process.env) {
  return isPrivateSampleRunEnabled(env) && isLargeMediaReadEnabled(env);
}

export function getPrivateSampleTarget(env: NodeJS.ProcessEnv = process.env) {
  const target = env[PRIVATE_SAMPLE_TARGET_ENV_FLAG]?.trim().toLowerCase();
  return target && target.length > 0 ? target : undefined;
}

export function isPrivateSampleTargetSelected(fixtureId: string, env: NodeJS.ProcessEnv = process.env) {
  const target = getPrivateSampleTarget(env);
  return !target || target === fixtureId.trim().toLowerCase();
}

export function describeLargeMediaOptIn() {
  return `set ${PRIVATE_SAMPLE_ENV_FLAG}=1 and ${ALLOW_LARGE_MEDIA_ENV_FLAG}=1 to include private large-media fixtures`;
}

export function describePrivateSampleTargetOptIn(fixtureId: string) {
  return `set ${PRIVATE_SAMPLE_TARGET_ENV_FLAG}=${fixtureId} or unset it to include private ${describeFixtureLabel(fixtureId)} regression assets`;
}

export function describePrivateFixtureAccessRequirement(
  fixtureId: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!isLargeMediaOptInEnabled(env)) {
    return describeLargeMediaOptIn();
  }

  if (!isPrivateSampleTargetSelected(fixtureId, env)) {
    return describePrivateSampleTargetOptIn(fixtureId);
  }

  return describeLargeMediaOptIn();
}

export function describePrivateFixtureSkipReason(
  fixtureId: string,
  present: boolean,
  options?: { requireLargeMedia?: boolean },
) {
  if (!present) {
    return `private ${describeFixtureLabel(fixtureId)} regression assets are not present on disk`;
  }

  if (options?.requireLargeMedia) {
    return describeLargeMediaOptIn();
  }

  return `set ${PRIVATE_SAMPLE_ENV_FLAG}=1 to include private ${describeFixtureLabel(fixtureId)} regression assets`;
}

export function describePrivateSampleSkipReason(
  present: boolean,
  options?: { requireLargeMedia?: boolean; fixtureId?: string },
) {
  return describePrivateFixtureSkipReason(options?.fixtureId ?? "r2n-test-1", present, options);
}

export function isKnownPrivateFixtureCompanion(folderPath: string, fileName: string) {
  const fixtureId = normalizeFixtureId(folderPath);
  const knownCompanions = KNOWN_PRIVATE_FIXTURE_COMPANIONS[fixtureId];
  if (!knownCompanions) {
    return false;
  }

  const normalizedFileName = normalizeFileName(fileName);
  return knownCompanions.fileNames.some((candidate) => normalizeFileName(candidate) === normalizedFileName);
}

export function isKnownPrivateFixtureCompanionDirectory(folderPath: string, directoryName: string) {
  const fixtureId = normalizeFixtureId(folderPath);
  const knownCompanions = KNOWN_PRIVATE_FIXTURE_COMPANIONS[fixtureId];
  if (!knownCompanions?.directoryNames) {
    return false;
  }

  const normalizedDirectoryName = normalizeFileName(directoryName);
  return knownCompanions.directoryNames.some((candidate) => normalizeFileName(candidate) === normalizedDirectoryName);
}

export function shouldIncludePrivateFixtureCompanion(
  folderPath: string,
  fileName: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const fixtureId = normalizeFixtureId(folderPath);
  if (!isKnownPrivateFixtureCompanion(folderPath, fileName)) {
    return true;
  }

  return isLargeMediaOptInEnabled(env) && isPrivateSampleTargetSelected(fixtureId, env);
}

export function shouldTraversePrivateFixtureDirectory(
  folderPath: string,
  directoryName: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  const fixtureId = normalizeFixtureId(folderPath);
  if (!isKnownPrivateFixtureCompanionDirectory(folderPath, directoryName)) {
    return true;
  }

  return isLargeMediaOptInEnabled(env) && isPrivateSampleTargetSelected(fixtureId, env);
}

export interface LargeMediaReadGuardInput {
  folderPath: string;
  fileName: string;
  fileKind?: string;
  sizeBytes: number;
  maxFileSizeBytes?: number;
  env?: NodeJS.ProcessEnv;
}

export interface LargeMediaReadGuardDecision {
  allowed: boolean;
  reason?: string;
  isKnownPrivateCompanion: boolean;
  exceedsSizeThreshold: boolean;
}

export function evaluateLargeMediaReadGuard(input: LargeMediaReadGuardInput): LargeMediaReadGuardDecision {
  const env = input.env ?? process.env;
  const fixtureId = normalizeFixtureId(input.folderPath);
  const maxFileSizeBytes = input.maxFileSizeBytes ?? DEFAULT_MAX_DIRECT_MEDIA_FILE_BYTES;
  const isKnownPrivateCompanion = isKnownPrivateFixtureCompanion(input.folderPath, input.fileName);
  const exceedsSizeThreshold = input.sizeBytes > maxFileSizeBytes;
  const isDirectReadGuardKind = input.fileKind ? directReadGuardKinds.has(input.fileKind) : true;
  const needsGuard = isDirectReadGuardKind && (isKnownPrivateCompanion || exceedsSizeThreshold);
  const targetSelected = isPrivateSampleTargetSelected(fixtureId, env);

  if (!needsGuard || (isLargeMediaOptInEnabled(env) && (!isKnownPrivateCompanion || targetSelected))) {
    return {
      allowed: true,
      isKnownPrivateCompanion,
      exceedsSizeThreshold,
    };
  }

  if (isKnownPrivateCompanion && isLargeMediaOptInEnabled(env) && !targetSelected) {
    return {
      allowed: false,
      reason: `Skipped private local fixture media for ${input.fileName}. ${describePrivateSampleTargetOptIn(fixtureId)}.`,
      isKnownPrivateCompanion,
      exceedsSizeThreshold,
    };
  }

  const scope = isKnownPrivateCompanion
    ? "private local fixture media"
    : `large direct-read media (${formatMegabytes(input.sizeBytes)})`;

  return {
    allowed: false,
    reason: `Skipped ${scope} for ${input.fileName}. ${describePrivateFixtureAccessRequirement(fixtureId, env)}.`,
    isKnownPrivateCompanion,
    exceedsSizeThreshold,
  };
}
