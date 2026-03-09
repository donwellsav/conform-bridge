import { parseAafText, type ParseAafContext, type ParsedAafSource } from "./aaf";

export const OLE_COMPOUND_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const EMBEDDED_AAF_GRAPH_MAGIC = Buffer.from("CBRIDGE_AAF_GRAPH_V1");

interface AafGraphDescriptor {
  fileName?: string;
  fileLocator?: string;
  mobName?: string;
  reel?: string;
  tape?: string;
  channelCount?: number;
  channelLayout?: string;
  hasBwf?: boolean;
  hasIXml?: boolean;
  missing?: boolean;
  note?: string;
}

interface AafGraphLocator {
  timecode?: string;
  frame?: number;
  name?: string;
  comment?: string;
  note?: string;
  color?: string;
}

interface AafGraphTransition {
  kind: "Transition";
  name?: string;
  transitionKind?: string;
  lengthFrames?: number;
  note?: string;
  applyTo?: "previous" | "next" | "both";
  fadeIn?: boolean;
  fadeOut?: boolean;
  speedRatio?: string | number;
}

interface AafGraphSourceClip {
  kind: "SourceClip";
  id?: string;
  clipName?: string;
  sourceClipIdentity?: string;
  sourceMobId?: string;
  sourceFileName?: string;
  reel?: string;
  tape?: string;
  scene?: string;
  take?: string;
  comment?: string;
  notes?: string;
  comments?: string[];
  recordIn?: string;
  recordOut?: string;
  sourceIn?: string;
  sourceOut?: string;
  channelCount?: number;
  channelLayout?: string;
  offline?: boolean;
  nested?: boolean;
  flattened?: boolean;
  effects?: {
    fadeIn?: boolean;
    fadeOut?: boolean;
    speedRatio?: string | number;
    speedEffect?: boolean;
  };
}

type AafGraphComponent = AafGraphSourceClip | AafGraphTransition;

interface AafGraphSequence {
  kind: "Sequence";
  components?: AafGraphComponent[];
}

interface AafGraphMobSlot {
  id?: string;
  slotId?: string;
  index?: number;
  name?: string;
  role?: string;
  channelCount?: number;
  channelLayout?: string;
  segment?: string | AafGraphSequence;
  locators?: AafGraphLocator[];
}

interface AafGraphMobBase {
  id: string;
  kind: string;
  name?: string;
  reel?: string;
  tape?: string;
  note?: string;
}

interface AafGraphCompositionMob extends AafGraphMobBase {
  kind: "CompositionMob";
  editRate?: string;
  sampleRate?: number | string;
  startTimecode?: string;
  durationTimecode?: string;
  dropFrame?: boolean;
  slots?: AafGraphMobSlot[];
  locators?: AafGraphLocator[];
}

interface AafGraphSourceMob extends AafGraphMobBase {
  kind: "SourceMob";
  descriptor?: AafGraphDescriptor;
}

type AafGraphMob = AafGraphCompositionMob | AafGraphSourceMob;

interface AafGraphPayload {
  format?: string;
  contentStorage?: {
    compositionMobId?: string;
    mobs?: AafGraphMob[];
    segments?: Record<string, AafGraphSequence>;
    locators?: AafGraphLocator[];
  };
}

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

function basenameFromLocator(fileLocator?: string) {
  if (!fileLocator) {
    return undefined;
  }

  const normalized = fileLocator.replaceAll("\\", "/");
  const tokens = normalized.split("/");
  const candidate = tokens[tokens.length - 1];
  return candidate && candidate.length > 0 ? candidate : undefined;
}

function mergeNotes(parts: Array<string | undefined>) {
  return parts
    .flatMap((part) => part?.split("\n") ?? [])
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" ");
}

function resolveGraphSequence(slot: AafGraphMobSlot, segments: Record<string, AafGraphSequence>) {
  if (!slot.segment) {
    return undefined;
  }

  if (typeof slot.segment === "string") {
    return segments[slot.segment];
  }

  return slot.segment;
}

function normalizeAafGraphPayload(payloadText: string) {
  const normalized = payloadText.replace(/^\uFEFF/, "").trim();
  if (!normalized.startsWith("{")) {
    return null;
  }

  let payload: AafGraphPayload;
  try {
    payload = JSON.parse(normalized) as AafGraphPayload;
  } catch {
    return null;
  }

  if (!payload.format?.startsWith("conform-bridge-aaf-graph/")) {
    return null;
  }

  const contentStorage = payload.contentStorage;
  if (!contentStorage?.mobs || contentStorage.mobs.length === 0) {
    return null;
  }

  const mobs = contentStorage.mobs;
  const compositionMob = contentStorage.compositionMobId
    ? mobs.find((mob): mob is AafGraphCompositionMob => mob.id === contentStorage.compositionMobId && mob.kind === "CompositionMob")
    : mobs.find((mob): mob is AafGraphCompositionMob => mob.kind === "CompositionMob");

  if (!compositionMob) {
    return null;
  }

  const sourceMobMap = new Map(
    mobs
      .filter((mob): mob is AafGraphSourceMob => mob.kind === "SourceMob")
      .map((mob) => [mob.id, mob] as const),
  );
  const segments = contentStorage.segments ?? {};
  const tracks: Array<Record<string, unknown>> = [];
  const mediaRefs = [...sourceMobMap.values()].map((sourceMob) => {
    const descriptor = sourceMob.descriptor;
    const fileName = descriptor?.fileName ?? basenameFromLocator(descriptor?.fileLocator);

    return {
      id: sourceMob.id,
      fileName,
      mobName: descriptor?.mobName ?? sourceMob.name,
      reel: sourceMob.reel ?? descriptor?.reel,
      tape: sourceMob.tape ?? descriptor?.tape,
      channelCount: descriptor?.channelCount,
      channelLayout: descriptor?.channelLayout,
      hasBwf: descriptor?.hasBwf,
      hasIXml: descriptor?.hasIXml,
      missing: descriptor?.missing,
      note: mergeNotes([
        sourceMob.note,
        descriptor?.note,
        descriptor?.fileLocator ? `Media locator: ${descriptor.fileLocator}` : undefined,
      ]),
    };
  });
  const events: Array<Record<string, unknown>> = [];
  const markers: Array<Record<string, unknown>> = [];

  function pushLocator(locator: AafGraphLocator, index: number, scopeLabel?: string) {
    markers.push({
      timecode: locator.timecode,
      frame: locator.frame,
      name: locator.name ?? locator.comment ?? `AAF Locator ${index + 1}`,
      color: locator.color,
      note: mergeNotes([
        scopeLabel ? `${scopeLabel}.` : undefined,
        locator.comment,
        locator.note,
      ]),
    });
  }

  [...(contentStorage.locators ?? []), ...(compositionMob.locators ?? [])].forEach((locator, index) => {
    pushLocator(locator, index, "Composition locator");
  });

  compositionMob.slots?.forEach((slot, slotIndex) => {
    const trackId = slot.slotId ?? slot.id ?? `${slot.index ?? slotIndex + 1}`;
    tracks.push({
      slotId: trackId,
      index: slot.index ?? slotIndex + 1,
      name: slot.name ?? `Track ${slot.index ?? slotIndex + 1}`,
      role: slot.role,
      channelCount: slot.channelCount,
      channelLayout: slot.channelLayout,
    });

    slot.locators?.forEach((locator, locatorIndex) => {
      pushLocator(locator, locatorIndex, `Slot ${slot.index ?? slotIndex + 1}`);
    });

    const sequence = resolveGraphSequence(slot, segments);
    if (!sequence?.components) {
      return;
    }

    let pendingTransition: AafGraphTransition | undefined;
    let lastEvent = events[events.length - 1];

    sequence.components.forEach((component) => {
      if (component.kind === "Transition") {
        pendingTransition = component;
        if (lastEvent && component.applyTo !== "next") {
          const previousEffects = (lastEvent.effects as Record<string, unknown> | undefined) ?? {};
          lastEvent.effects = {
            ...previousEffects,
            fadeOut: component.fadeOut ?? true,
            speedRatio: previousEffects.speedRatio ?? component.speedRatio,
          };
          lastEvent.notes = mergeNotes([
            typeof lastEvent.notes === "string" ? lastEvent.notes : undefined,
            component.note ?? component.transitionKind ?? component.name,
          ]);
        }
        return;
      }

      const sourceMob = component.sourceMobId ? sourceMobMap.get(component.sourceMobId) : undefined;
      const descriptor = sourceMob?.descriptor;

      const event = {
        id: component.id,
        trackSlotId: trackId,
        trackIndex: slot.index ?? slotIndex + 1,
        clipName: component.clipName ?? component.sourceClipIdentity ?? descriptor?.fileName ?? sourceMob?.name,
        sourceFileName: component.sourceFileName ?? descriptor?.fileName ?? basenameFromLocator(descriptor?.fileLocator),
        mobName: descriptor?.mobName ?? sourceMob?.name,
        mediaRefId: sourceMob?.id,
        channelCount: component.channelCount ?? descriptor?.channelCount ?? slot.channelCount,
        channelLayout: component.channelLayout ?? descriptor?.channelLayout ?? slot.channelLayout,
        timing: {
          recordIn: component.recordIn,
          recordOut: component.recordOut,
          sourceIn: component.sourceIn,
          sourceOut: component.sourceOut,
        },
        metadata: {
          reel: component.reel ?? sourceMob?.reel ?? descriptor?.reel,
          tape: component.tape ?? sourceMob?.tape ?? descriptor?.tape,
          scene: component.scene,
          take: component.take,
          notes: mergeNotes([
            component.sourceClipIdentity ? `Source clip: ${component.sourceClipIdentity}` : undefined,
            component.comment,
            component.notes,
            ...(component.comments ?? []),
            pendingTransition?.applyTo !== "previous"
              ? (pendingTransition?.note ?? pendingTransition?.transitionKind ?? pendingTransition?.name)
              : undefined,
          ]),
        },
        effects: {
          fadeIn: component.effects?.fadeIn ?? (pendingTransition?.applyTo !== "previous" ? pendingTransition?.fadeIn ?? true : undefined),
          fadeOut: component.effects?.fadeOut,
          speedRatio: component.effects?.speedRatio ?? (pendingTransition?.applyTo !== "previous" ? pendingTransition?.speedRatio : undefined),
          speedEffect: component.effects?.speedEffect,
        },
        flags: {
          offline: component.offline ?? descriptor?.missing,
          nested: component.nested,
          flattened: component.flattened,
        },
        notes: mergeNotes([
          sourceMob?.note,
          descriptor?.note,
          descriptor?.fileLocator ? `Media locator: ${descriptor.fileLocator}` : undefined,
        ]),
      };

      events.push(event);
      lastEvent = event;
      pendingTransition = undefined;
    });
  });

  return JSON.stringify({
    format: "conform-bridge-aaf-derived/v2",
    composition: {
      name: compositionMob.name,
      mobName: compositionMob.name,
      editRate: compositionMob.editRate,
      sampleRate: compositionMob.sampleRate,
      startTimecode: compositionMob.startTimecode,
      durationTimecode: compositionMob.durationTimecode,
      dropFrame: compositionMob.dropFrame,
    },
    tracks,
    mediaRefs,
    events,
    markers,
  });
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

  const normalizedPayload = normalizeAafGraphPayload(payloadText);
  return parseAafText(normalizedPayload ?? payloadText, context);
}
