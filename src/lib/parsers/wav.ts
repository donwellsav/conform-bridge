import { closeSync, fstatSync, openSync, readSync, statSync } from "node:fs";
import { dirname } from "node:path";

import {
  ALLOW_LARGE_MEDIA_ENV_FLAG,
  DEFAULT_MAX_DIRECT_MEDIA_FILE_BYTES,
  PRIVATE_SAMPLE_ENV_FLAG,
  evaluateLargeMediaReadGuard,
} from "../private-fixture-guards";
import type { ChannelLayout, SampleRate } from "../types";

const RIFF_HEADER_BYTES = 12;
const CHUNK_HEADER_BYTES = 8;
const FORMAT_CHUNK_MIN_BYTES = 16;
const BEXT_TIME_REFERENCE_OFFSET = 338;
const BEXT_TIME_REFERENCE_BYTES = 8;
const BEXT_MIN_BYTES = BEXT_TIME_REFERENCE_OFFSET + BEXT_TIME_REFERENCE_BYTES;
const LIST_INFO_MAX_BYTES = 256 * 1024;
const IXML_MAX_BYTES = 256 * 1024;

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

export interface ParseWavMetadataOptions {
  allowLargeMedia?: boolean;
  maxFileSizeBytes?: number;
  onGuardedSkip?: (reason: string) => void;
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

  while (offset + CHUNK_HEADER_BYTES <= buffer.length) {
    const tag = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const valueStart = offset + CHUNK_HEADER_BYTES;
    const valueEnd = Math.min(valueStart + size, buffer.length);
    const value = buffer.toString("utf8", valueStart, valueEnd).replace(/\0+$/g, "").trim();

    if (tag.trim().length > 0 && value.length > 0) {
      infoTags[tag] = value;
    }

    const nextOffset = offset + CHUNK_HEADER_BYTES + size + (size % 2);
    if (nextOffset <= offset) {
      break;
    }

    offset = nextOffset;
  }

  return infoTags;
}

function coerceSampleRate(value?: number): SampleRate | undefined {
  if (value === 48000 || value === 96000) {
    return value;
  }

  return undefined;
}

function readExact(fd: number, position: number, length: number) {
  const buffer = Buffer.alloc(length);
  const bytesRead = readSync(fd, buffer, 0, length, position);
  return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
}

function readChunkPrefix(fd: number, chunkStart: number, chunkSize: number, maxBytes: number) {
  const bytesToRead = Math.min(chunkSize, maxBytes);
  return bytesToRead > 0 ? readExact(fd, chunkStart, bytesToRead) : Buffer.alloc(0);
}

function parseWavMetadataFromFile(filePath: string) {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  let descriptor: number | undefined;

  try {
    descriptor = openSync(filePath, "r");
    const stats = fstatSync(descriptor);
    const header = readExact(descriptor, 0, RIFF_HEADER_BYTES);
    if (header.length < RIFF_HEADER_BYTES) {
      return null;
    }

    if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") {
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

    let offset = RIFF_HEADER_BYTES;
    while (offset + CHUNK_HEADER_BYTES <= stats.size) {
      const chunkHeader = readExact(descriptor, offset, CHUNK_HEADER_BYTES);
      if (chunkHeader.length < CHUNK_HEADER_BYTES) {
        break;
      }

      const chunkId = chunkHeader.toString("ascii", 0, 4);
      const chunkSize = chunkHeader.readUInt32LE(4);
      const chunkStart = offset + CHUNK_HEADER_BYTES;
      const nextOffset = chunkStart + chunkSize + (chunkSize % 2);
      if (nextOffset <= offset) {
        break;
      }

      if (chunkId === "fmt " && chunkSize >= FORMAT_CHUNK_MIN_BYTES) {
        const chunk = readChunkPrefix(descriptor, chunkStart, chunkSize, FORMAT_CHUNK_MIN_BYTES);
        if (chunk.length >= FORMAT_CHUNK_MIN_BYTES) {
          channelCount = chunk.readUInt16LE(2);
          sampleRate = coerceSampleRate(chunk.readUInt32LE(4));
          bitDepth = chunk.readUInt16LE(14);
        }
      } else if (chunkId === "bext") {
        hasBwf = true;
        const chunk = readChunkPrefix(descriptor, chunkStart, chunkSize, BEXT_MIN_BYTES);
        if (chunk.length >= BEXT_MIN_BYTES) {
          const low = chunk.readUInt32LE(BEXT_TIME_REFERENCE_OFFSET);
          const high = chunk.readUInt32LE(BEXT_TIME_REFERENCE_OFFSET + 4);
          timeReferenceSamples = high * (2 ** 32) + low;
        }
      } else if (chunkId === "LIST" && chunkSize >= 4) {
        const chunk = readChunkPrefix(descriptor, chunkStart, chunkSize, LIST_INFO_MAX_BYTES);
        if (chunk.length >= 4 && chunk.toString("ascii", 0, 4) === "INFO") {
          Object.assign(infoTags, parseInfoList(chunk.subarray(4)));
        }
      } else if (chunkId === "iXML") {
        hasIXml = true;
        const chunk = readChunkPrefix(descriptor, chunkStart, chunkSize, IXML_MAX_BYTES);
        if (chunk.length > 0) {
          const ixMlText = chunk.toString("utf8").replace(/\0+$/g, "").trim();
          Object.assign(ixMlValues, parseIxMlValues(ixMlText));
          hasSourceTimecode = /<TIMECODE>/i.test(ixMlText);
        }
      }

      offset = nextOffset;
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
    } satisfies ParsedWavMetadata;
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

export function parseWavMetadataSync(filePath: string, options: ParseWavMetadataOptions = {}) {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const fileStats = statSync(filePath);
  const guardDecision = evaluateLargeMediaReadGuard({
    folderPath: dirname(filePath),
    fileName,
    fileKind: "wav",
    sizeBytes: fileStats.size,
    maxFileSizeBytes: options.maxFileSizeBytes ?? DEFAULT_MAX_DIRECT_MEDIA_FILE_BYTES,
    env: options.allowLargeMedia
      ? {
          ...process.env,
          [PRIVATE_SAMPLE_ENV_FLAG]: "1",
          [ALLOW_LARGE_MEDIA_ENV_FLAG]: "1",
        }
      : process.env,
  });

  if (!guardDecision.allowed) {
    options.onGuardedSkip?.(guardDecision.reason ?? `Skipped guarded WAV read for ${fileName}.`);
    return null;
  }

  return parseWavMetadataFromFile(filePath);
}

const wavParser = {
  parseWavMetadataSync,
};

export default wavParser;
