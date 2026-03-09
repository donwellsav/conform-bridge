import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { WriterRunTransportAdapterBundle } from "../types";

export function writeWriterRunTransportAdapterBundleSync(
  bundle: WriterRunTransportAdapterBundle,
  transportRoot: string,
) {
  const writtenPaths: string[] = [];

  bundle.entries.forEach((entry) => {
    const absolutePath = path.join(transportRoot, ...entry.relativePath.split("/"));
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, entry.content, "utf8");
    writtenPaths.push(absolutePath);
  });

  return writtenPaths.sort((left, right) => left.localeCompare(right));
}
