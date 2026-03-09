import { parseAafText, type ParseAafContext, type ParsedAafSource } from "./aaf";

export const OLE_COMPOUND_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const EMBEDDED_AAF_GRAPH_MAGIC = Buffer.from("CBRIDGE_AAF_GRAPH_V1");

function isOleCompoundBuffer(buffer: Buffer) {
  return buffer.length >= OLE_COMPOUND_HEADER.length
    && buffer.subarray(0, OLE_COMPOUND_HEADER.length).equals(OLE_COMPOUND_HEADER);
}

function extractEmbeddedGraphPayload(buffer: Buffer) {
  if (!isOleCompoundBuffer(buffer)) {
    return null;
  }

  const markerIndex = buffer.indexOf(EMBEDDED_AAF_GRAPH_MAGIC, OLE_COMPOUND_HEADER.length);
  if (markerIndex < 0) {
    return null;
  }

  const lengthOffset = markerIndex + EMBEDDED_AAF_GRAPH_MAGIC.length;
  if (buffer.length < lengthOffset + 4) {
    return null;
  }

  const payloadLength = buffer.readUInt32LE(lengthOffset);
  const payloadStart = lengthOffset + 4;
  const payloadEnd = payloadStart + payloadLength;

  if (payloadLength <= 0 || payloadEnd > buffer.length) {
    return null;
  }

  const payload = buffer.subarray(payloadStart, payloadEnd).toString("utf8").trim();
  return payload.length > 0 ? payload : null;
}

export function createEmbeddedAafContainerBuffer(payloadText: string) {
  const payloadBuffer = Buffer.from(payloadText, "utf8");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(payloadBuffer.length, 0);

  return Buffer.concat([
    OLE_COMPOUND_HEADER,
    Buffer.from("ConformBridgeAAFContainerGraph"),
    EMBEDDED_AAF_GRAPH_MAGIC,
    lengthBuffer,
    payloadBuffer,
  ]);
}

export function parseAafContainerBuffer(buffer: Buffer, context: ParseAafContext): ParsedAafSource | null {
  const payloadText = extractEmbeddedGraphPayload(buffer);
  if (!payloadText) {
    return null;
  }

  return parseAafText(payloadText, context);
}
