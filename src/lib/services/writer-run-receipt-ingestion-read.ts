import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { WriterRunReceiptSourceFile } from "../types";

export function readWriterRunReceiptSourcesSync(inboundRoot: string, jobId: string): WriterRunReceiptSourceFile[] {
  if (!existsSync(inboundRoot)) {
    return [];
  }

  return readdirSync(inboundRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => {
      const absolutePath = path.join(inboundRoot, entry.name);
      return {
        id: `receipt-source-${entry.name.toLowerCase()}`,
        jobId,
        fileName: entry.name,
        absolutePath,
        source: "filesystem-inbound" as const,
        content: readFileSync(absolutePath, "utf8"),
      };
    })
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}
