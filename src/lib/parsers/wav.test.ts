import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";

import * as wavModule from "./wav";

const sampleRoot = resolve(process.cwd(), "fixtures", "intake", "r2n-test-1");
const expectationRoot = resolve(process.cwd(), "fixtures", "expectations", "r2n-test-1");
const wavParser = ("default" in wavModule ? wavModule.default : wavModule) as typeof wavModule;
const privateAudioFiles = [
  "230407_002.WAV",
  "F2-BT_002.WAV",
  "F2_002.WAV",
];
const runPrivateSample = process.env.CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE === "1";
const privateAudioPresent = privateAudioFiles.every((fileName) => existsSync(resolve(sampleRoot, fileName)));
const privateAudioReason = privateAudioPresent
  ? "set CONFORM_BRIDGE_RUN_PRIVATE_SAMPLE=1 to include private WAV coverage"
  : "private r2n-test-1 WAV files are not present on disk";

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

if (privateAudioPresent && runPrivateSample) {
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
        hasBwf: audio.hasBwf,
        hasIXml: audio.hasIXml,
        hasSourceTimecode: audio.hasSourceTimecode,
        recordingDevice: audio.recordingDevice,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    assert.deepEqual(actual, expected);
  });
} else {
  test("parseWavMetadataSync extracts deterministic metadata from the local private r2n-test-1 WAV files", {
    skip: privateAudioReason,
  }, () => {});
}
