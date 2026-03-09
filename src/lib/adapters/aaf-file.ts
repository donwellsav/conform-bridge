import { existsSync, readFileSync } from "node:fs";

import { parseAafText, type ParseAafContext, type ParsedAafSource } from "../parsers/aaf";
import {
  OLE_COMPOUND_HEADER,
  inspectAafContainerBuffer,
  type AafContainerDirectCoverage,
} from "../parsers/aaf-container";

export type AafContainerKind = "ole-compound" | "text" | "unknown";
export type AafExtractionMode = "direct" | "adapter" | "text" | "unparsed";

export interface AafExtractionEnvelope {
  containerKind: AafContainerKind;
  extractionMode: AafExtractionMode;
  directCoverage: AafContainerDirectCoverage;
  payloadFormat?: string;
  diagnostics: string[];
  fallbackReason?: string;
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
    const inspection = inspectAafContainerBuffer(buffer, context);
    if (inspection.parsed) {
      return {
        containerKind,
        extractionMode: "direct",
        directCoverage: inspection.directCoverage,
        payloadFormat: inspection.payloadFormat,
        diagnostics: inspection.diagnostics,
        parsed: inspection.parsed,
      };
    }

    const adapterPath = findAdapterPath(filePath);
    if (!adapterPath) {
      return {
        containerKind,
        extractionMode: "unparsed",
        directCoverage: inspection.directCoverage,
        payloadFormat: inspection.payloadFormat,
        diagnostics: inspection.diagnostics,
        fallbackReason: inspection.fallbackReason,
        parsed: null,
      };
    }

    return {
      containerKind,
      extractionMode: "adapter",
      directCoverage: inspection.directCoverage,
      payloadFormat: inspection.payloadFormat,
      diagnostics: inspection.diagnostics,
      fallbackReason: inspection.fallbackReason,
      adapterPath,
      parsed: parseAafText(readFileSync(adapterPath, "utf8"), context),
    };
  }

  if (containerKind === "text") {
    return {
      containerKind,
      extractionMode: "text",
      directCoverage: "full",
      diagnostics: [],
      parsed: parseAafText(buffer.toString("utf8"), context),
    };
  }

  return {
    containerKind,
    extractionMode: "unparsed",
    directCoverage: "none",
    diagnostics: ["The file was not recognized as an OLE compound AAF or a text fixture."],
    fallbackReason: "AAF extraction could not classify this file as a supported container or text payload.",
    parsed: null,
  };
}
