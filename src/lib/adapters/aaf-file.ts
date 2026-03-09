import { existsSync, readFileSync } from "node:fs";

import { parseAafText, type ParseAafContext, type ParsedAafSource } from "../parsers/aaf";
import { OLE_COMPOUND_HEADER, parseAafContainerBuffer } from "../parsers/aaf-container";

export type AafContainerKind = "ole-compound" | "text" | "unknown";
export type AafExtractionMode = "direct" | "adapter" | "text" | "unparsed";

export interface AafExtractionEnvelope {
  containerKind: AafContainerKind;
  extractionMode: AafExtractionMode;
  adapterPath?: string;
  parsed: ParsedAafSource | null;
}

function isOleCompoundBuffer(buffer: Buffer) {
  return buffer.length >= OLE_COMPOUND_HEADER.length
    && buffer.subarray(0, OLE_COMPOUND_HEADER.length).equals(OLE_COMPOUND_HEADER);
}

function isMostlyTextBuffer(buffer: Buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 256));
  let nulCount = 0;

  for (const byte of sample) {
    if (byte === 0x00) {
      nulCount += 1;
    }
  }

  return sample.length === 0 || nulCount / sample.length < 0.1;
}

function detectContainerKind(buffer: Buffer): AafContainerKind {
  if (isOleCompoundBuffer(buffer)) {
    return "ole-compound";
  }

  if (isMostlyTextBuffer(buffer)) {
    return "text";
  }

  return "unknown";
}

function candidateAdapterPaths(filePath: string) {
  return [
    `${filePath}.adapter`,
    `${filePath}.adapter.json`,
  ];
}

function findAdapterPath(filePath: string) {
  return candidateAdapterPaths(filePath).find((candidate) => existsSync(candidate));
}

export function extractAafFromFileSync(filePath: string, context: ParseAafContext): AafExtractionEnvelope {
  const buffer = readFileSync(filePath);
  const containerKind = detectContainerKind(buffer);

  if (containerKind === "ole-compound") {
    const directParsed = parseAafContainerBuffer(buffer, context);
    if (directParsed) {
      return {
        containerKind,
        extractionMode: "direct",
        parsed: directParsed,
      };
    }

    const adapterPath = findAdapterPath(filePath);
    if (!adapterPath) {
      return {
        containerKind,
        extractionMode: "unparsed",
        parsed: null,
      };
    }

    return {
      containerKind,
      extractionMode: "adapter",
      adapterPath,
      parsed: parseAafText(readFileSync(adapterPath, "utf8"), context),
    };
  }

  if (containerKind === "text") {
    return {
      containerKind,
      extractionMode: "text",
      parsed: parseAafText(buffer.toString("utf8"), context),
    };
  }

  return {
    containerKind,
    extractionMode: "unparsed",
    parsed: null,
  };
}
