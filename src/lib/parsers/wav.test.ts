import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  ALLOW_LARGE_MEDIA_ENV_FLAG,
  describePrivateFixtureSkipReason,
  describePrivateSampleTargetOptIn,
  isLargeMediaOptInEnabled,
  isPrivateSampleTargetSelected,
  PRIVATE_SAMPLE_ENV_FLAG,
  PRIVATE_SAMPLE_TARGET_ENV_FLAG,
} from "../private-fixture-guards";
import * as wavModule from "./wav";

const sampleRoot = resolve(process.cwd(), "fixtures", "intake", "r2n-test-1");
const expectationRoot = resolve(process.cwd(), "fixtures", "expectations", "r2n-test-1");
const wavParser = ("default" in wavModule ? wavModule.default : wavModule) as typeof wavModule;
const privateAudioFiles = [
  "230407_002.WAV",
  "F2-BT_002.WAV",
  "F2_002.WAV",
];
const runPrivateSample = isLargeMediaOptInEnabled();
const privateAudioPresent = privateAudioFiles.every((fileName) => existsSync(resolve(sampleRoot, fileName)));

function describeFixturePrivateSampleReason(fixtureId: string, present: boolean) {
  if (!present) {
    return describePrivateFixtureSkipReason(fixtureId, false, { requireLargeMedia: true });
  }

  if (!runPrivateSample) {
    return describePrivateFixtureSkipReason(fixtureId, true, { requireLargeMedia: true });
  }

  if (!isPrivateSampleTargetSelected(fixtureId)) {
    return describePrivateSampleTargetOptIn(fixtureId);
  }

  return describePrivateFixtureSkipReason(fixtureId, true, { requireLargeMedia: true });
}

type PrivateExpectation = {
  productionAudio: Array<{
    name: string;
    sampleRate: number;
    bitDepth: number;
    channelCount: number;
    channelLayout: string;
    scene: string;
    take: string;
    startTimecode: string;
    endTimecode: string;
    hasBwf: boolean;
    hasIXml: boolean;
    hasSourceTimecode: boolean;
    recordingDevice: string;
  }>;
};

function createChunk(id: string, payload: Buffer) {
  const header = Buffer.alloc(8);
  header.write(id, 0, "ascii");
  header.writeUInt32LE(payload.length, 4);
  const padding = payload.length % 2 === 1 ? Buffer.from([0]) : Buffer.alloc(0);
  return Buffer.concat([header, payload, padding]);
}

function createInfoTag(tag: string, value: string) {
  return createChunk(tag, Buffer.from(`${value}\0`, "utf8"));
}

function createSyntheticWavBuffer() {
  const formatChunk = Buffer.alloc(16);
  formatChunk.writeUInt16LE(1, 0);
  formatChunk.writeUInt16LE(2, 2);
  formatChunk.writeUInt32LE(48000, 4);
  formatChunk.writeUInt32LE(288000, 8);
  formatChunk.writeUInt16LE(6, 12);
  formatChunk.writeUInt16LE(24, 14);

  const bextChunk = Buffer.alloc(346);
  bextChunk.writeUInt32LE(48000, 338);
  bextChunk.writeUInt32LE(0, 342);

  const listChunk = Buffer.concat([
    Buffer.from("INFO", "ascii"),
    createInfoTag("ITCH", "Zoom F8"),
    createInfoTag("ICMT", "zSCENE=24A\r\nzTAKE=3\r\nzSPEED=23.976"),
  ]);

  const ixmlChunk = Buffer.from(
    [
      "<BWFXML>",
      "<IXML_VERSION>1.5</IXML_VERSION>",
      "<SCENE>24A</SCENE>",
      "<TAKE>3</TAKE>",
      "<TAPE>R24A</TAPE>",
      "<ORIGINAL_FILENAME>ROLL_024A.WAV</ORIGINAL_FILENAME>",
      "</BWFXML>",
    ].join(""),
    "utf8",
  );

  const dataChunk = Buffer.alloc(8);
  const chunks = [
    createChunk("fmt ", formatChunk),
    createChunk("bext", bextChunk),
    createChunk("LIST", listChunk),
    createChunk("iXML", ixmlChunk),
    createChunk("data", dataChunk),
  ];
  const body = Buffer.concat(chunks);
  const riffHeader = Buffer.alloc(12);
  riffHeader.write("RIFF", 0, "ascii");
  riffHeader.writeUInt32LE(body.length + 4, 4);
  riffHeader.write("WAVE", 8, "ascii");
  return Buffer.concat([riffHeader, body]);
}

function createTempWavFile() {
  const tempRoot = mkdtempSync(join(tmpdir(), "conform-bridge-wav-"));
  const filePath = join(tempRoot, "synthetic.wav");
  writeFileSync(filePath, createSyntheticWavBuffer());
  return { filePath, tempRoot };
}

test("parseWavMetadataSync extracts deterministic metadata from a bounded synthetic WAV fixture", () => {
  const { filePath, tempRoot } = createTempWavFile();

  try {
    const metadata = wavParser.parseWavMetadataSync(filePath);

    assert.ok(metadata);
    assert.equal(metadata.sampleRate, 48000);
    assert.equal(metadata.bitDepth, 24);
    assert.equal(metadata.channelCount, 2);
    assert.equal(metadata.channelLayout, "stereo");
    assert.equal(metadata.hasBwf, true);
    assert.equal(metadata.hasIXml, true);
    assert.equal(metadata.hasSourceTimecode, false);
    assert.equal(metadata.scene, "24A");
    assert.equal(metadata.take, "3");
    assert.equal(metadata.tape, "R24A");
    assert.equal(metadata.recordingDevice, "Zoom F8");
    assert.equal(metadata.originalFileName, "ROLL_024A.WAV");
    assert.equal(metadata.timeReferenceSamples, 48000);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("parseWavMetadataSync skips direct reads above the configured size guard unless large-media opt-in is enabled", () => {
  const { filePath, tempRoot } = createTempWavFile();
  const previousRunPrivateSample = process.env[PRIVATE_SAMPLE_ENV_FLAG];
  const previousAllowLargeMedia = process.env[ALLOW_LARGE_MEDIA_ENV_FLAG];
  const previousPrivateSampleTarget = process.env[PRIVATE_SAMPLE_TARGET_ENV_FLAG];

  try {
    delete process.env[PRIVATE_SAMPLE_ENV_FLAG];
    delete process.env[ALLOW_LARGE_MEDIA_ENV_FLAG];
    delete process.env[PRIVATE_SAMPLE_TARGET_ENV_FLAG];
    let skipReason = "";
    const metadata = wavParser.parseWavMetadataSync(filePath, {
      maxFileSizeBytes: 32,
      onGuardedSkip: (reason) => {
        skipReason = reason;
      },
    });

    assert.equal(metadata, null);
    assert.match(skipReason, /CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1/i);
    assert.match(skipReason, /CONFORM_BRIDGE_ALLOW_LARGE_MEDIA=1/i);
  } finally {
    if (previousRunPrivateSample === undefined) {
      delete process.env[PRIVATE_SAMPLE_ENV_FLAG];
    } else {
      process.env[PRIVATE_SAMPLE_ENV_FLAG] = previousRunPrivateSample;
    }

    if (previousAllowLargeMedia === undefined) {
      delete process.env[ALLOW_LARGE_MEDIA_ENV_FLAG];
    } else {
      process.env[ALLOW_LARGE_MEDIA_ENV_FLAG] = previousAllowLargeMedia;
    }

    if (previousPrivateSampleTarget === undefined) {
      delete process.env[PRIVATE_SAMPLE_TARGET_ENV_FLAG];
    } else {
      process.env[PRIVATE_SAMPLE_TARGET_ENV_FLAG] = previousPrivateSampleTarget;
    }

    rmSync(tempRoot, { recursive: true, force: true });
  }
});

if (privateAudioPresent && runPrivateSample && isPrivateSampleTargetSelected("r2n-test-1")) {
  test("parseWavMetadataSync extracts deterministic metadata from the local private r2n-test-1 WAV files", () => {
    const expectation = JSON.parse(
      readFileSync(resolve(expectationRoot, "expected-local-private.json"), "utf8"),
    ) as PrivateExpectation;

    const actual = privateAudioFiles
      .map((fileName) => {
        const metadata = wavParser.parseWavMetadataSync(resolve(sampleRoot, fileName));
        return {
          name: fileName,
          sampleRate: metadata?.sampleRate ?? 0,
          bitDepth: metadata?.bitDepth ?? 0,
          channelCount: metadata?.channelCount ?? 0,
          channelLayout: metadata?.channelLayout ?? "unknown",
          scene: metadata?.scene ?? "",
          take: metadata?.take ?? "",
          startTimecode: "",
          endTimecode: "",
          hasBwf: Boolean(metadata?.hasBwf),
          hasIXml: Boolean(metadata?.hasIXml),
          hasSourceTimecode: Boolean(metadata?.hasSourceTimecode),
          recordingDevice: metadata?.recordingDevice ?? "",
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    const expected = expectation.productionAudio
      .map((audio) => ({
        name: audio.name,
        sampleRate: audio.sampleRate,
        bitDepth: audio.bitDepth,
        channelCount: audio.channelCount,
        channelLayout: audio.channelLayout,
        scene: audio.scene,
        take: audio.take,
        startTimecode: "",
        endTimecode: "",
        hasBwf: audio.hasBwf,
        hasIXml: audio.hasIXml,
        hasSourceTimecode: false,
        recordingDevice: audio.recordingDevice,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    assert.deepEqual(actual, expected);
  });
} else {
  test("parseWavMetadataSync extracts deterministic metadata from the local private r2n-test-1 WAV files", {
    skip: describeFixturePrivateSampleReason("r2n-test-1", privateAudioPresent),
  }, () => {});
}
