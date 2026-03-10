import { readFileSync } from "node:fs";

import type { ChannelLayout, SampleRate } from "../types";

export interface ParsedWavMetadata {
  fileName: string;
  sampleRate?: SampleRate;
  bitDepth?: number;
  channelCount?: number;
  channelLayout?: ChannelLayout;
  hasBwf: boolean;
  hasIXml: boolean;
  hasSourceTimecode: boolean;
  infoTags: Record<string, string>;
  ixMlValues: Record<string, string>;
  description?: string;
  recordingDevice?: string;
  originalFileName?: string;
  scene?: string;
  take?: string;
  tape?: string;
  speed?: string;
  timeReferenceSamples?: number;
}

function inferChannelLayout(channelCount?: number): ChannelLayout | undefined {
  if (!channelCount || channelCount < 1) {
    return undefined;
  }

  if (channelCount === 1) {
    return "mono";
  }

  if (channelCount === 2) {
    return "stereo";
  }

  if (channelCount === 3) {
    return "lcr";
  }

  if (channelCount === 6) {
    return "5.1";
  }

  if (channelCount <= 4) {
    return "poly_4";
  }

  return "poly_8";
}

function parseZTagBlock(text: string) {
  const tags: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^z([A-Z0-9_]+)=(.*)$/);
    if (!match) {
      continue;
    }

    tags[match[1]] = match[2].trim();
  }

  return tags;
}

function parseIxMlValue(text: string, tagName: string) {
  const match = text.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"));
  return match?.[1]?.trim() || undefined;
}

function parseIxMlValues(text: string) {
  const tagNames = [
    "IXML_VERSION",
    "SCENE",
    "TAKE",
    "TAPE",
    "PROJECT",
    "ORIGINAL_FILENAME",
    "TRACK_COUNT",
    "FILE_UID",
    "NOTE",
  ];

  return tagNames.reduce<Record<string, string>>((collection, tagName) => {
    const value = parseIxMlValue(text, tagName);
    if (value) {
      collection[tagName] = value;
    }
    return collection;
  }, {});
}

function parseInfoList(buffer: Buffer) {
  const infoTags: Record<string, string> = {};
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const tag = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const value = buffer.toString("utf8", offset + 8, offset + 8 + size).replace(/\0+$/g, "").trim();

    if (tag.trim().length > 0 && value.length > 0) {
      infoTags[tag] = value;
    }

    offset += 8 + size + (size % 2);
  }

  return infoTags;
}

function coerceSampleRate(value?: number): SampleRate | undefined {
  if (value === 48000 || value === 96000) {
    return value;
  }

  return undefined;
}

function parseWavMetadataFromBuffer(fileName: string, buffer: Buffer): ParsedWavMetadata | null {
  if (buffer.length < 12) {
    return null;
  }

  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    return null;
  }

  let sampleRate: SampleRate | undefined;
  let bitDepth: number | undefined;
  let channelCount: number | undefined;
  let hasBwf = false;
  let hasIXml = false;
  let hasSourceTimecode = false;
  let timeReferenceSamples: number | undefined;
  const infoTags: Record<string, string> = {};
  const ixMlValues: Record<string, string> = {};

  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = Math.min(chunkStart + chunkSize, buffer.length);
    const chunk = buffer.subarray(chunkStart, chunkEnd);

    if (chunkId === "fmt " && chunk.length >= 16) {
      channelCount = chunk.readUInt16LE(2);
      sampleRate = coerceSampleRate(chunk.readUInt32LE(4));
      bitDepth = chunk.readUInt16LE(14);
    }

    if (chunkId === "bext") {
      hasBwf = true;
      if (chunk.length >= 346) {
        const low = chunk.readUInt32LE(338);
        const high = chunk.readUInt32LE(342);
        timeReferenceSamples = high * (2 ** 32) + low;
      }
    }

    if (chunkId === "LIST" && chunk.length >= 4) {
      const listType = chunk.toString("ascii", 0, 4);
      if (listType === "INFO") {
        Object.assign(infoTags, parseInfoList(chunk.subarray(4)));
      }
    }

    if (chunkId === "iXML") {
      hasIXml = true;
      const ixMlText = chunk.toString("utf8").replace(/\0+$/g, "").trim();
      Object.assign(ixMlValues, parseIxMlValues(ixMlText));
      hasSourceTimecode = /<TIMECODE>/i.test(ixMlText);
    }

    offset += 8 + chunkSize + (chunkSize % 2);
  }

  const commentTags = parseZTagBlock(infoTags.ICMT ?? "");
  const originalFileName = ixMlValues.ORIGINAL_FILENAME;
  const recordingDevice = infoTags.ITCH;

  return {
    fileName,
    sampleRate,
    bitDepth,
    channelCount,
    channelLayout: inferChannelLayout(channelCount),
    hasBwf,
    hasIXml,
    hasSourceTimecode,
    infoTags: {
      ...infoTags,
      ...Object.fromEntries(Object.entries(commentTags).map(([key, value]) => [`z${key}`, value])),
    },
    ixMlValues,
    description: infoTags.ICMT,
    recordingDevice,
    originalFileName,
    scene: ixMlValues.SCENE ?? commentTags.SCENE,
    take: ixMlValues.TAKE ?? commentTags.TAKE,
    tape: ixMlValues.TAPE ?? commentTags.TAPE,
    speed: commentTags.SPEED,
    timeReferenceSamples,
  };
}

export function parseWavMetadataSync(filePath: string) {
  return parseWavMetadataFromBuffer(filePath.split(/[/\\]/).pop() ?? filePath, readFileSync(filePath));
}

const wavParser = {
  parseWavMetadataSync,
};

export default wavParser;
