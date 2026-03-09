import { parseAafText, type ParseAafContext, type ParsedAafSource } from "./aaf";

export const OLE_COMPOUND_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const EMBEDDED_AAF_GRAPH_MAGIC = Buffer.from("CBRIDGE_AAF_GRAPH_V1");
const EMBEDDED_AAF_OLE_LAYOUT_MAGIC = Buffer.from("CBRIDGE_AAF_OLE_LAYOUT_V1");

export type AafContainerDirectCoverage = "full" | "partial" | "none";

export interface AafContainerInspection {
  parsed: ParsedAafSource | null;
  directCoverage: AafContainerDirectCoverage;
  payloadFormat?: string;
  diagnostics: string[];
  fallbackReason?: string;
}

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

type AafOleObjectKind =
  | "ContentStorage"
  | "CompositionMob"
  | "MobSlot"
  | "Sequence"
  | "SourceClip"
  | "SourceMob"
  | "MediaDescriptor"
  | "Locator"
  | "Transition";

interface AafOleObjectBase {
  id: string;
  kind: AafOleObjectKind;
  name?: string;
  note?: string;
}

interface AafOleContentStorage extends AafOleObjectBase {
  kind: "ContentStorage";
  compositionMobId?: string;
  mobIds?: string[];
  mobRefs?: string[];
  locatorIds?: string[];
  locatorRefs?: string[];
}

interface AafOleCompositionMob extends AafOleObjectBase {
  kind: "CompositionMob";
  editRate?: string;
  sampleRate?: number | string;
  startTimecode?: string;
  durationTimecode?: string;
  dropFrame?: boolean;
  slotIds?: string[];
  slotRefs?: string[];
  locatorIds?: string[];
  locatorRefs?: string[];
}

interface AafOleMobSlot extends AafOleObjectBase {
  kind: "MobSlot";
  slotId?: string;
  index?: number;
  role?: string;
  channelCount?: number;
  channelLayout?: string;
  segmentId?: string;
  segmentRef?: string;
  sequenceId?: string;
  locatorIds?: string[];
  locatorRefs?: string[];
}

interface AafOleSequence extends AafOleObjectBase {
  kind: "Sequence";
  componentIds?: string[];
  componentRefs?: string[];
}

interface AafOleSourceClip extends AafOleObjectBase {
  kind: "SourceClip";
  clipName?: string;
  sourceClipIdentity?: string;
  sourceMobId?: string;
  sourceMobRef?: string;
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

interface AafOleSourceMob extends AafOleObjectBase {
  kind: "SourceMob";
  reel?: string;
  tape?: string;
  descriptorId?: string;
  descriptorRef?: string;
}

interface AafOleMediaDescriptor extends AafOleObjectBase {
  kind: "MediaDescriptor";
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
}

interface AafOleLocator extends AafOleObjectBase {
  kind: "Locator";
  timecode?: string;
  frame?: number;
  comment?: string;
  color?: string;
}

interface AafOleTransition extends AafOleObjectBase {
  kind: "Transition";
  transitionKind?: string;
  lengthFrames?: number;
  applyTo?: "previous" | "next" | "both";
  fadeIn?: boolean;
  fadeOut?: boolean;
  speedRatio?: string | number;
}

type AafOleObject =
  | AafOleContentStorage
  | AafOleCompositionMob
  | AafOleMobSlot
  | AafOleSequence
  | AafOleSourceClip
  | AafOleSourceMob
  | AafOleMediaDescriptor
  | AafOleLocator
  | AafOleTransition;

interface AafOleStreamEntry {
  id?: string;
  path?: string;
  kind?: "storage" | "stream";
  streamType?: string;
  payload?: unknown;
}

interface AafOleLayoutPayload {
  format?: string;
  contentStorage?: Partial<AafOleContentStorage>;
  objects?: Record<string, AafOleObject>;
  streams?: AafOleStreamEntry[];
}

interface NormalizedAafPayload {
  normalizedPayload: string | null;
  payloadFormat?: string;
  directCoverage: AafContainerDirectCoverage;
  diagnostics: string[];
  fallbackReason?: string;
}

function isOleCompoundBuffer(buffer: Buffer) {
  return buffer.length >= OLE_COMPOUND_HEADER.length
    && buffer.subarray(0, OLE_COMPOUND_HEADER.length).equals(OLE_COMPOUND_HEADER);
}

function extractEmbeddedPayload(buffer: Buffer, magic: Buffer) {
  if (!isOleCompoundBuffer(buffer)) {
    return null;
  }

  const markerIndex = buffer.indexOf(magic, OLE_COMPOUND_HEADER.length);
  if (markerIndex < 0) {
    return null;
  }

  const lengthOffset = markerIndex + magic.length;
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNormalizedJson(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized.startsWith("{")) {
    return null;
  }

  try {
    return JSON.parse(normalized) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectStringList(...candidates: Array<string[] | undefined>) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.filter((value) => typeof value === "string");
    }
  }

  return [] as string[];
}

function normalizeAafGraphPayload(payloadText: string) {
  const payload = readNormalizedJson(payloadText) as AafGraphPayload | null;
  if (!payload?.format?.startsWith("conform-bridge-aaf-graph/")) {
    return {
      normalizedPayload: null,
      directCoverage: "none",
      diagnostics: [],
    } satisfies NormalizedAafPayload;
  }

  const contentStorage = payload.contentStorage;
  if (!contentStorage?.mobs || contentStorage.mobs.length === 0) {
    return {
      normalizedPayload: null,
      payloadFormat: payload.format,
      directCoverage: "partial",
      diagnostics: ["Missing contentStorage.mobs in direct AAF graph payload."],
      fallbackReason: "Direct AAF graph payload omitted mob definitions.",
    } satisfies NormalizedAafPayload;
  }

  const mobs = contentStorage.mobs;
  const compositionMob = contentStorage.compositionMobId
    ? mobs.find((mob): mob is AafGraphCompositionMob => mob.id === contentStorage.compositionMobId && mob.kind === "CompositionMob")
    : mobs.find((mob): mob is AafGraphCompositionMob => mob.kind === "CompositionMob");

  if (!compositionMob) {
    return {
      normalizedPayload: null,
      payloadFormat: payload.format,
      directCoverage: "partial",
      diagnostics: ["Missing CompositionMob in direct AAF graph payload."],
      fallbackReason: "Direct AAF graph payload did not expose a composition mob.",
    } satisfies NormalizedAafPayload;
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

  return {
    normalizedPayload: JSON.stringify({
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
    }),
    payloadFormat: payload.format,
    directCoverage: "full",
    diagnostics: [],
  } satisfies NormalizedAafPayload;
}

function collectOleObjects(payload: AafOleLayoutPayload) {
  const objectMap = new Map<string, AafOleObject>();
  const diagnostics: string[] = [];
  let contentStorage = payload.contentStorage as AafOleContentStorage | undefined;

  if (payload.objects) {
    Object.entries(payload.objects).forEach(([id, objectValue]) => {
      if (!objectValue || typeof objectValue !== "object") {
        return;
      }

      const objectId = typeof objectValue.id === "string" ? objectValue.id : id;
      const object = { ...objectValue, id: objectId } as AafOleObject;
      objectMap.set(objectId, object);
      if (object.kind === "ContentStorage") {
        contentStorage = object;
      }
    });
  }

  for (const stream of payload.streams ?? []) {
    if (!isObjectRecord(stream.payload)) {
      continue;
    }

    const payloadKind = typeof stream.payload.kind === "string" ? stream.payload.kind : undefined;
    if (payloadKind === "ContentStorage") {
      contentStorage = {
        id: stream.id ?? "content-storage",
        kind: "ContentStorage",
        ...(stream.payload as Record<string, unknown>),
      } as AafOleContentStorage;
      continue;
    }

    if (!payloadKind || !("id" in stream.payload) || typeof stream.payload.id !== "string") {
      diagnostics.push(`Ignored AAF stream ${stream.path ?? stream.id ?? "unknown"} because it did not expose a typed object payload.`);
      continue;
    }

    const object = stream.payload as unknown as AafOleObject;
    objectMap.set(object.id, object);
  }

  return { objectMap, contentStorage, diagnostics };
}

function normalizeAafOleLayoutPayload(payloadText: string): NormalizedAafPayload {
  const payload = readNormalizedJson(payloadText) as AafOleLayoutPayload | null;
  if (!payload?.format?.startsWith("conform-bridge-aaf-ole-layout/")) {
    return {
      normalizedPayload: null,
      directCoverage: "none",
      diagnostics: [],
    };
  }

  const collected = collectOleObjects(payload);
  const diagnostics = [...collected.diagnostics];
  const contentStorage = collected.contentStorage;
  const objectMap = collected.objectMap;

  if (!contentStorage && objectMap.size === 0) {
    return {
      normalizedPayload: null,
      payloadFormat: payload.format,
      directCoverage: "partial",
      diagnostics: ["AAF OLE layout payload did not expose content storage or typed objects."],
      fallbackReason: "Direct AAF layout parsing could not find a content storage graph.",
    };
  }

  const compositionMobId = contentStorage?.compositionMobId
    ?? collectStringList(contentStorage?.mobIds, contentStorage?.mobRefs)
      .map((mobId) => objectMap.get(mobId))
      .find((candidate): candidate is AafOleCompositionMob => candidate?.kind === "CompositionMob")
      ?.id
    ?? [...objectMap.values()].find((candidate): candidate is AafOleCompositionMob => candidate.kind === "CompositionMob")
      ?.id;
  const compositionMob = compositionMobId ? objectMap.get(compositionMobId) : undefined;

  if (!compositionMob || compositionMob.kind !== "CompositionMob") {
    return {
      normalizedPayload: null,
      payloadFormat: payload.format,
      directCoverage: "partial",
      diagnostics: [...diagnostics, "Missing CompositionMob in AAF OLE layout payload."],
      fallbackReason: "Direct AAF layout parsing could not resolve a composition mob.",
    };
  }

  const sourceMobs = new Map(
    [...objectMap.values()]
      .filter((candidate): candidate is AafOleSourceMob => candidate.kind === "SourceMob")
      .map((candidate) => [candidate.id, candidate] as const),
  );
  const mediaRefs = [...sourceMobs.values()].map((sourceMob) => {
    const descriptorId = sourceMob.descriptorId ?? sourceMob.descriptorRef;
    const descriptor = descriptorId ? objectMap.get(descriptorId) : undefined;
    const mediaDescriptor = descriptor?.kind === "MediaDescriptor" ? descriptor : undefined;
    const fileName = mediaDescriptor?.fileName ?? basenameFromLocator(mediaDescriptor?.fileLocator);

    return {
      id: sourceMob.id,
      fileName,
      mobName: mediaDescriptor?.mobName ?? sourceMob.name,
      reel: sourceMob.reel ?? mediaDescriptor?.reel,
      tape: sourceMob.tape ?? mediaDescriptor?.tape,
      channelCount: mediaDescriptor?.channelCount,
      channelLayout: mediaDescriptor?.channelLayout,
      hasBwf: mediaDescriptor?.hasBwf,
      hasIXml: mediaDescriptor?.hasIXml,
      missing: mediaDescriptor?.missing,
      note: mergeNotes([
        sourceMob.note,
        mediaDescriptor?.note,
        mediaDescriptor?.fileLocator ? `Media locator: ${mediaDescriptor.fileLocator}` : undefined,
      ]),
    };
  });

  const tracks: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const markers: Array<Record<string, unknown>> = [];
  const seenMarkers = new Set<string>();

  function pushLocator(locatorObject: AafOleLocator | undefined, fallbackName: string, scopeLabel?: string) {
    if (!locatorObject) {
      return;
    }

    const key = `${locatorObject.timecode ?? ""}:${locatorObject.frame ?? ""}:${locatorObject.name ?? fallbackName}`;
    if (seenMarkers.has(key)) {
      return;
    }
    seenMarkers.add(key);
    markers.push({
      timecode: locatorObject.timecode,
      frame: locatorObject.frame,
      name: locatorObject.name ?? locatorObject.comment ?? fallbackName,
      color: locatorObject.color,
      note: mergeNotes([
        scopeLabel ? `${scopeLabel}.` : undefined,
        locatorObject.comment,
        locatorObject.note,
      ]),
    });
  }

  collectStringList(contentStorage?.locatorIds, contentStorage?.locatorRefs).forEach((locatorId, locatorIndex) => {
    const locator = objectMap.get(locatorId);
    if (locator?.kind === "Locator") {
      pushLocator(locator, `AAF Locator ${locatorIndex + 1}`, "Content storage locator");
      return;
    }
    diagnostics.push(`Referenced locator ${locatorId} was missing or not a locator object.`);
  });

  collectStringList(compositionMob.locatorIds, compositionMob.locatorRefs).forEach((locatorId, locatorIndex) => {
    const locator = objectMap.get(locatorId);
    if (locator?.kind === "Locator") {
      pushLocator(locator, `AAF Locator ${locatorIndex + 1}`, "Composition locator");
      return;
    }
    diagnostics.push(`Composition locator ${locatorId} was missing or not a locator object.`);
  });

  const slotIds = collectStringList(compositionMob.slotIds, compositionMob.slotRefs);
  if (slotIds.length === 0) {
    diagnostics.push(`Composition mob ${compositionMob.id} did not expose slot references.`);
  }

  slotIds.forEach((slotId, slotIndex) => {
    const slot = objectMap.get(slotId);
    if (!slot || slot.kind !== "MobSlot") {
      diagnostics.push(`Slot ${slotId} was missing or not a mob slot.`);
      return;
    }

    const slotTrackId = slot.slotId ?? slot.id;
    const resolvedTrackIndex = slot.index ?? slotIndex + 1;
    tracks.push({
      slotId: slotTrackId,
      index: resolvedTrackIndex,
      name: slot.name ?? `Track ${resolvedTrackIndex}`,
      role: slot.role,
      channelCount: slot.channelCount,
      channelLayout: slot.channelLayout,
    });

    collectStringList(slot.locatorIds, slot.locatorRefs).forEach((locatorId, locatorIndex) => {
      const locator = objectMap.get(locatorId);
      if (locator?.kind === "Locator") {
        pushLocator(locator, `AAF Locator ${locatorIndex + 1}`, `Slot ${resolvedTrackIndex}`);
        return;
      }
      diagnostics.push(`Slot locator ${locatorId} was missing or not a locator object.`);
    });

    const segmentId = slot.segmentId ?? slot.segmentRef ?? slot.sequenceId;
    if (!segmentId) {
      diagnostics.push(`Slot ${slot.id} did not expose a sequence or segment reference.`);
      return;
    }

    const segment = objectMap.get(segmentId);
    if (!segment) {
      diagnostics.push(`Slot ${slot.id} referenced missing segment ${segmentId}.`);
      return;
    }

    if (segment.kind !== "Sequence") {
      diagnostics.push(`Slot ${slot.id} referenced unsupported segment kind ${segment.kind}.`);
      return;
    }

    let pendingTransition: AafOleTransition | undefined;
    let lastEvent = events[events.length - 1];
    const componentIds = collectStringList(segment.componentIds, segment.componentRefs);

    componentIds.forEach((componentId) => {
      const component = objectMap.get(componentId);
      if (!component) {
        diagnostics.push(`Sequence ${segment.id} referenced missing component ${componentId}.`);
        return;
      }

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

      if (component.kind === "Locator") {
        pushLocator(component, `AAF Locator ${markers.length + 1}`, `Sequence ${segment.id}`);
        return;
      }

      if (component.kind !== "SourceClip") {
        diagnostics.push(`Sequence ${segment.id} contained unsupported component kind ${component.kind}.`);
        return;
      }

      const sourceMobId = component.sourceMobId ?? component.sourceMobRef;
      const sourceMob = sourceMobId ? sourceMobs.get(sourceMobId) : undefined;
      const descriptorId = sourceMob?.descriptorId ?? sourceMob?.descriptorRef;
      const descriptor = descriptorId ? objectMap.get(descriptorId) : undefined;
      const mediaDescriptor = descriptor?.kind === "MediaDescriptor" ? descriptor : undefined;

      const event = {
        id: component.id,
        trackSlotId: slotTrackId,
        trackIndex: resolvedTrackIndex,
        clipName: component.clipName ?? component.sourceClipIdentity ?? mediaDescriptor?.fileName ?? sourceMob?.name,
        sourceFileName: component.sourceFileName ?? mediaDescriptor?.fileName ?? basenameFromLocator(mediaDescriptor?.fileLocator),
        mobName: mediaDescriptor?.mobName ?? sourceMob?.name,
        mediaRefId: sourceMob?.id,
        channelCount: component.channelCount ?? mediaDescriptor?.channelCount ?? slot.channelCount,
        channelLayout: component.channelLayout ?? mediaDescriptor?.channelLayout ?? slot.channelLayout,
        timing: {
          recordIn: component.recordIn,
          recordOut: component.recordOut,
          sourceIn: component.sourceIn,
          sourceOut: component.sourceOut,
        },
        metadata: {
          reel: component.reel ?? sourceMob?.reel ?? mediaDescriptor?.reel,
          tape: component.tape ?? sourceMob?.tape ?? mediaDescriptor?.tape,
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
          offline: component.offline ?? mediaDescriptor?.missing,
          nested: component.nested,
          flattened: component.flattened,
        },
        notes: mergeNotes([
          component.note,
          sourceMob?.note,
          mediaDescriptor?.note,
          mediaDescriptor?.fileLocator ? `Media locator: ${mediaDescriptor.fileLocator}` : undefined,
        ]),
      };

      events.push(event);
      lastEvent = event;
      pendingTransition = undefined;
    });
  });

  if (tracks.length === 0 || events.length === 0) {
    return {
      normalizedPayload: null,
      payloadFormat: payload.format,
      directCoverage: "partial",
      diagnostics,
      fallbackReason: tracks.length === 0
        ? "Direct AAF layout parsing found the container but could not hydrate any timeline tracks."
        : "Direct AAF layout parsing found timeline slots but could not hydrate any clip events from this layout.",
    };
  }

  return {
    normalizedPayload: JSON.stringify({
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
    }),
    payloadFormat: payload.format,
    directCoverage: diagnostics.length > 0 ? "partial" : "full",
    diagnostics,
  };
}

export function createEmbeddedAafContainerBuffer(
  payloadText: string,
  options?: { marker?: "graph" | "ole-layout" },
) {
  const payloadBuffer = Buffer.from(payloadText, "utf8");
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(payloadBuffer.length, 0);
  const marker = options?.marker === "ole-layout" ? EMBEDDED_AAF_OLE_LAYOUT_MAGIC : EMBEDDED_AAF_GRAPH_MAGIC;
  const containerLabel = options?.marker === "ole-layout"
    ? "ConformBridgeAAFOleLayout"
    : "ConformBridgeAAFContainerGraph";

  return Buffer.concat([
    OLE_COMPOUND_HEADER,
    Buffer.from(containerLabel),
    marker,
    lengthBuffer,
    payloadBuffer,
  ]);
}

export function inspectAafContainerBuffer(buffer: Buffer, context: ParseAafContext): AafContainerInspection {
  const graphPayloadText = extractEmbeddedPayload(buffer, EMBEDDED_AAF_GRAPH_MAGIC);
  if (graphPayloadText) {
    const normalizedPayload = normalizeAafGraphPayload(graphPayloadText);
    const parsed = normalizedPayload.normalizedPayload
      ? parseAafText(normalizedPayload.normalizedPayload, context)
      : parseAafText(graphPayloadText, context);
    const rawPayload = readNormalizedJson(graphPayloadText);

    return {
      parsed,
      directCoverage: parsed
        ? (normalizedPayload.directCoverage === "none" ? "full" : normalizedPayload.directCoverage)
        : (normalizedPayload.directCoverage === "full" ? "partial" : normalizedPayload.directCoverage),
      payloadFormat: normalizedPayload.payloadFormat ?? (typeof rawPayload?.format === "string" ? rawPayload.format : undefined),
      diagnostics: normalizedPayload.diagnostics,
      fallbackReason: parsed ? undefined : normalizedPayload.fallbackReason,
    };
  }

  const oleLayoutPayloadText = extractEmbeddedPayload(buffer, EMBEDDED_AAF_OLE_LAYOUT_MAGIC);
  if (oleLayoutPayloadText) {
    const normalizedPayload = normalizeAafOleLayoutPayload(oleLayoutPayloadText);
    const parsed = normalizedPayload.normalizedPayload
      ? parseAafText(normalizedPayload.normalizedPayload, context)
      : null;

    return {
      parsed,
      directCoverage: parsed ? normalizedPayload.directCoverage : (normalizedPayload.directCoverage === "full" ? "partial" : normalizedPayload.directCoverage),
      payloadFormat: normalizedPayload.payloadFormat,
      diagnostics: normalizedPayload.diagnostics,
      fallbackReason: parsed ? undefined : normalizedPayload.fallbackReason,
    };
  }

  return {
    parsed: null,
    directCoverage: "none",
    diagnostics: ["The AAF container did not expose a supported embedded graph or decoded OLE layout payload."],
    fallbackReason: "Direct AAF parsing does not yet recognize this container payload shape.",
  };
}

export function parseAafContainerBuffer(buffer: Buffer, context: ParseAafContext): ParsedAafSource | null {
  return inspectAafContainerBuffer(buffer, context).parsed;
}
