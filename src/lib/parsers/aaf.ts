import type {
  ChannelLayout,
  ClipEvent,
  FrameRate,
  IntakeAsset,
  Marker,
  MarkerColor,
  SampleRate,
  SourceRole,
  Timeline,
  Track,
} from "../types";

const UNKNOWN_TIMECODE = "unknown";
const UNKNOWN_FRAME = -1;

interface ParsedSection {
  kind: string;
  fields: Record<string, string>;
}

interface AafJsonComposition {
  name?: string;
  mobName?: string;
  editRate?: string;
  sampleRate?: number | string;
  startTimecode?: string;
  durationTimecode?: string;
  dropFrame?: boolean;
}

interface AafJsonTrack {
  id?: string;
  slotId?: string;
  index?: number;
  name?: string;
  role?: string;
  channelCount?: number;
  channelLayout?: string;
}

interface AafJsonMediaRef {
  id?: string;
  fileName?: string;
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

interface AafJsonEventTiming {
  recordIn?: string;
  recordOut?: string;
  sourceIn?: string;
  sourceOut?: string;
}

interface AafJsonEventMetadata {
  reel?: string;
  tape?: string;
  scene?: string;
  take?: string;
  notes?: string;
}

interface AafJsonEventEffects {
  fadeIn?: boolean;
  fadeOut?: boolean;
  speedEffect?: boolean;
  speedRatio?: string | number;
}

interface AafJsonEventFlags {
  offline?: boolean;
  nested?: boolean;
  flattened?: boolean;
}

interface AafJsonEvent {
  id?: string;
  trackId?: string;
  trackSlotId?: string;
  trackIndex?: number;
  clipName?: string;
  sourceFileName?: string;
  mobName?: string;
  mediaRefId?: string;
  channelCount?: number;
  channelLayout?: string;
  timing?: AafJsonEventTiming;
  metadata?: AafJsonEventMetadata;
  effects?: AafJsonEventEffects;
  flags?: AafJsonEventFlags;
  notes?: string;
}

interface AafJsonMarker {
  timecode?: string;
  frame?: number;
  name?: string;
  color?: string;
  note?: string;
}

interface AafJsonFixture {
  format?: string;
  composition?: AafJsonComposition;
  tracks?: AafJsonTrack[];
  mediaRefs?: AafJsonMediaRef[];
  events?: AafJsonEvent[];
  markers?: AafJsonMarker[];
}

export interface ParseAafContext {
  bundleId: string;
  translationModelId: string;
  timelineId: string;
  assets: IntakeAsset[];
  fallbackName: string;
  fallbackFps: FrameRate;
  fallbackSampleRate: SampleRate;
  fallbackStartTimecode: string;
  fallbackDropFrame: boolean;
}

export interface ParsedAafSource {
  source: "aaf";
  timeline: Timeline;
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseBoolean(value?: string) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "y"].includes(value.trim().toLowerCase());
}

function parseInteger(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFrameRate(value?: string): FrameRate | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  switch (normalized) {
    case "23.976":
    case "24000/1001":
      return "23.976";
    case "24":
    case "24/1":
      return "24";
    case "25":
    case "25/1":
      return "25";
    case "29.97":
    case "30000/1001":
      return "29.97";
    default:
      return undefined;
  }
}

function parseSampleRate(value?: number | string): SampleRate | undefined {
  if (typeof value === "number") {
    if (value === 96000) {
      return 96000;
    }
    if (value === 48000) {
      return 48000;
    }
    return undefined;
  }

  if (typeof value === "string") {
    const parsed = parseInteger(value);
    if (parsed === 96000) {
      return 96000;
    }
    if (parsed === 48000) {
      return 48000;
    }
  }

  return undefined;
}

function nominalFramesPerSecond(fps: FrameRate) {
  switch (fps) {
    case "23.976":
    case "24":
      return 24;
    case "25":
      return 25;
    case "29.97":
      return 30;
  }
}

function timecodeToFrames(timecode: string | undefined, fps: FrameRate) {
  if (!timecode || !/^\d{2}:\d{2}:\d{2}:\d{2}$/.test(timecode)) {
    return UNKNOWN_FRAME;
  }

  const [hours, minutes, seconds, frames] = timecode.split(":").map((token) => Number.parseInt(token, 10));
  const frameBase = nominalFramesPerSecond(fps);
  return (((hours * 60) + minutes) * 60 + seconds) * frameBase + frames;
}

function framesToTimecode(frames: number, fps: FrameRate) {
  if (!Number.isFinite(frames) || frames < 0) {
    return UNKNOWN_TIMECODE;
  }

  const frameBase = nominalFramesPerSecond(fps);
  const totalSeconds = Math.floor(frames / frameBase);
  const frameRemainder = frames % frameBase;
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return [hours, minutes, seconds, frameRemainder].map((token) => token.toString().padStart(2, "0")).join(":");
}

function inferRole(value?: string): SourceRole {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.includes("dialogue") || normalized === "dx") {
    return "dx";
  }
  if (normalized.includes("effects") || normalized.includes("fx")) {
    return "fx";
  }
  if (normalized.includes("music") || normalized.includes("mx")) {
    return "mx";
  }
  if (normalized.includes("voice") || normalized === "vo") {
    return "vo";
  }
  if (normalized.includes("printmaster")) {
    return "printmaster";
  }

  return "guide";
}

function inferLayout(value?: string, channelCount?: number): ChannelLayout {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "mono":
      return "mono";
    case "stereo":
      return "stereo";
    case "lcr":
      return "lcr";
    case "5.1":
      return "5.1";
    case "poly_4":
      return "poly_4";
    case "poly_8":
      return "poly_8";
    default:
      break;
  }

  if ((channelCount ?? 1) <= 1) {
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
  if ((channelCount ?? 0) <= 4) {
    return "poly_4";
  }

  return "poly_8";
}

function inferMarkerColor(value?: string): MarkerColor {
  switch (value?.trim().toLowerCase()) {
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "red":
      return "red";
    case "purple":
      return "purple";
    default:
      return "blue";
  }
}

function findAssetByName(assets: IntakeAsset[], fileName: string | undefined) {
  if (!fileName) {
    return undefined;
  }

  return assets.find((asset) => asset.name.toLowerCase() === fileName.toLowerCase());
}

function parseSections(text: string) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const sectionMatch = line.match(/^\[([A-Za-z]+)\]$/);
    if (sectionMatch) {
      currentSection = {
        kind: sectionMatch[1],
        fields: {},
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    currentSection.fields[key] = value;
  }

  return sections;
}

function createTimelineFromPieces(
  context: ParseAafContext,
  name: string,
  fps: FrameRate,
  sampleRate: SampleRate,
  dropFrame: boolean,
  startTimecode: string,
  durationTimecode: string | undefined,
  tracks: Track[],
  clipEvents: ClipEvent[],
  markers: Marker[],
) {
  const startFrame = timecodeToFrames(startTimecode, fps);
  const resolvedDurationTimecode = durationTimecode
    ?? framesToTimecode(
      clipEvents.reduce((maxFrame, clipEvent) => Math.max(maxFrame, clipEvent.recordOutFrames), startFrame) - (startFrame >= 0 ? startFrame : 0),
      fps,
    );
  const durationFrames = timecodeToFrames(resolvedDurationTimecode, fps);

  return {
    id: context.timelineId,
    translationModelId: context.translationModelId,
    name,
    fps,
    sampleRate,
    dropFrame,
    startTimecode,
    durationTimecode: resolvedDurationTimecode,
    startFrame,
    durationFrames,
    trackIds: tracks.map((track) => track.id),
    markerIds: markers.map((marker) => marker.id),
  } satisfies Timeline;
}

function mergeTextParts(parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(" ")
    .trim();
}

function hasSpeedEffect(value: AafJsonEventEffects | undefined) {
  if (!value) {
    return false;
  }

  if (value.speedEffect === true) {
    return true;
  }

  if (typeof value.speedRatio === "number") {
    return value.speedRatio !== 1;
  }

  if (typeof value.speedRatio === "string") {
    const normalized = value.speedRatio.trim();
    if (!normalized || normalized === "1" || normalized === "1/1") {
      return false;
    }
    return true;
  }

  return false;
}

function parseAafJsonText(text: string, context: ParseAafContext): ParsedAafSource | null {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized.startsWith("{")) {
    return null;
  }

  let fixture: AafJsonFixture;
  try {
    fixture = JSON.parse(normalized) as AafJsonFixture;
  } catch {
    return null;
  }

  if (!fixture.composition || (!Array.isArray(fixture.events) && !Array.isArray(fixture.tracks))) {
    return null;
  }

  const composition = fixture.composition;
  const fps = parseFrameRate(composition.editRate) ?? context.fallbackFps;
  const sampleRate = parseSampleRate(composition.sampleRate) ?? context.fallbackSampleRate;
  const startTimecode = composition.startTimecode ?? context.fallbackStartTimecode;
  const trackDefinitions = fixture.tracks ?? [];
  const mediaRefMap = new Map((fixture.mediaRefs ?? []).flatMap((mediaRef) => mediaRef.id ? [[mediaRef.id, mediaRef] as const] : []));

  const trackMap = new Map<string, Track>();
  const trackIndexMap = new Map<number, Track>();

  function ensureTrack(trackLike: {
    slotId?: string;
    id?: string;
    index?: number;
    name?: string;
    role?: string;
    channelCount?: number;
    channelLayout?: string;
  }) {
    const trackIndex = trackLike.index ?? trackMap.size + 1;
    const key = trackLike.slotId ?? trackLike.id ?? `${trackIndex}`;
    const existing = trackMap.get(key) ?? trackIndexMap.get(trackIndex);
    if (existing) {
      return existing;
    }

    const created = {
      id: `track-${slugify(context.bundleId)}-aaf-${slugify(key)}`,
      timelineId: context.timelineId,
      name: trackLike.name ?? `Track ${trackIndex}`,
      role: inferRole(trackLike.role ?? trackLike.name),
      index: trackIndex,
      channelLayout: inferLayout(trackLike.channelLayout, trackLike.channelCount),
      clipEventIds: [],
    } satisfies Track;

    trackMap.set(key, created);
    trackIndexMap.set(trackIndex, created);
    return created;
  }

  trackDefinitions.forEach((track) => {
    ensureTrack({
      slotId: track.slotId,
      id: track.id,
      index: track.index,
      name: track.name,
      role: track.role,
      channelCount: track.channelCount,
      channelLayout: track.channelLayout,
    });
  });

  const clipEvents = (fixture.events ?? []).map((event, index): ClipEvent => {
    const mediaRef = event.mediaRefId ? mediaRefMap.get(event.mediaRefId) : undefined;
    const track = ensureTrack({
      slotId: event.trackSlotId,
      id: event.trackId,
      index: event.trackIndex,
      name: trackDefinitions.find((candidate) => candidate.slotId === event.trackSlotId || candidate.id === event.trackId || candidate.index === event.trackIndex)?.name,
      role: trackDefinitions.find((candidate) => candidate.slotId === event.trackSlotId || candidate.id === event.trackId || candidate.index === event.trackIndex)?.role,
      channelCount: event.channelCount ?? mediaRef?.channelCount,
      channelLayout: event.channelLayout ?? mediaRef?.channelLayout,
    });

    const sourceFileName = mediaRef?.fileName ?? event.sourceFileName ?? mediaRef?.mobName ?? event.mobName ?? "unknown";
    const mobName = mediaRef?.mobName ?? event.mobName;
    const sourceAsset = findAssetByName(context.assets, sourceFileName);
    const channelCount = event.channelCount ?? mediaRef?.channelCount ?? sourceAsset?.channelCount ?? 1;
    const clipEventId = `clip-${slugify(context.bundleId)}-aaf-${event.id ? slugify(event.id) : index + 1}`;
    track.clipEventIds.push(clipEventId);

    return {
      id: clipEventId,
      timelineId: context.timelineId,
      trackId: track.id,
      sourceAssetId: sourceAsset?.id ?? `asset-${slugify(context.bundleId)}-aaf-${index + 1}`,
      clipName: event.clipName ?? sourceFileName,
      sourceFileName,
      reel: event.metadata?.reel ?? mediaRef?.reel,
      tape: event.metadata?.tape ?? mediaRef?.tape,
      scene: event.metadata?.scene,
      take: event.metadata?.take,
      eventDescription: `AAF-derived clip imported from ${sourceFileName}.`,
      clipNotes: mergeTextParts([
        event.notes,
        event.metadata?.notes,
        mediaRef?.note,
        mobName && mobName !== sourceFileName ? `AAF mob: ${mobName}` : undefined,
      ]),
      recordIn: event.timing?.recordIn ?? UNKNOWN_TIMECODE,
      recordOut: event.timing?.recordOut ?? UNKNOWN_TIMECODE,
      sourceIn: event.timing?.sourceIn ?? UNKNOWN_TIMECODE,
      sourceOut: event.timing?.sourceOut ?? UNKNOWN_TIMECODE,
      recordInFrames: timecodeToFrames(event.timing?.recordIn, fps),
      recordOutFrames: timecodeToFrames(event.timing?.recordOut, fps),
      sourceInFrames: timecodeToFrames(event.timing?.sourceIn, fps),
      sourceOutFrames: timecodeToFrames(event.timing?.sourceOut, fps),
      channelCount,
      channelLayout: inferLayout(event.channelLayout ?? mediaRef?.channelLayout, channelCount),
      isPolyWav: channelCount > 2,
      hasBwf: mediaRef?.hasBwf ?? sourceFileName.toLowerCase().endsWith(".bwf"),
      hasIXml: mediaRef?.hasIXml ?? false,
      isOffline: event.flags?.offline === true || mediaRef?.missing === true || (!sourceAsset && sourceFileName !== "unknown"),
      isNested: event.flags?.nested ?? false,
      isFlattened: event.flags?.flattened ?? true,
      hasSpeedEffect: hasSpeedEffect(event.effects),
      hasFadeIn: event.effects?.fadeIn ?? false,
      hasFadeOut: event.effects?.fadeOut ?? false,
    };
  });

  const tracks = [...trackMap.values()].sort((left, right) => left.index - right.index);
  const markers = (fixture.markers ?? []).map((marker, index): Marker => {
    const frame = marker.frame ?? timecodeToFrames(marker.timecode, fps);
    const timecode = marker.timecode ?? framesToTimecode(frame, fps);

    return {
      id: `marker-${slugify(context.timelineId)}-aaf-${index + 1}`,
      timelineId: context.timelineId,
      name: marker.name ?? `AAF Marker ${index + 1}`,
      timecode,
      frame,
      color: inferMarkerColor(marker.color),
      note: marker.note ?? "",
    };
  });

  return {
    source: "aaf",
    timeline: createTimelineFromPieces(
      context,
      composition.name ?? composition.mobName ?? context.fallbackName,
      fps,
      sampleRate,
      composition.dropFrame ?? context.fallbackDropFrame,
      startTimecode,
      composition.durationTimecode,
      tracks,
      clipEvents,
      markers,
    ),
    tracks,
    clipEvents,
    markers,
  };
}

function parseLegacyAafText(text: string, context: ParseAafContext): ParsedAafSource | null {
  const sections = parseSections(text);
  const composition = sections.find((section) => section.kind === "Composition");

  if (!composition) {
    return null;
  }

  const fps = parseFrameRate(composition.fields.EditRate) ?? context.fallbackFps;
  const sampleRate = parseSampleRate(composition.fields.SampleRate) ?? context.fallbackSampleRate;
  const startTimecode = composition.fields.StartTimecode ?? context.fallbackStartTimecode;
  const trackSections = sections.filter((section) => section.kind === "Track");
  const clipSections = sections.filter((section) => section.kind === "Clip");
  const markerSections = sections.filter((section) => section.kind === "Marker");

  const trackMap = new Map<number, Track>();

  trackSections.forEach((section) => {
    const index = parseInteger(section.fields.Index) ?? trackMap.size + 1;
    const channelCount = parseInteger(section.fields.ChannelCount) ?? 1;
    trackMap.set(index, {
      id: `track-${slugify(context.bundleId)}-aaf-${index}`,
      timelineId: context.timelineId,
      name: section.fields.Name ?? `Track ${index}`,
      role: inferRole(section.fields.Role ?? section.fields.Name),
      index,
      channelLayout: inferLayout(section.fields.ChannelLayout, channelCount),
      clipEventIds: [],
    });
  });

  const clipEvents = clipSections.map((section, index): ClipEvent => {
    const trackIndex = parseInteger(section.fields.TrackIndex) ?? 1;
    const sourceFileName = section.fields.SourceFileName ?? section.fields.MobName ?? "unknown";
    const sourceAsset = findAssetByName(context.assets, sourceFileName);
    const channelCount = parseInteger(section.fields.ChannelCount) ?? sourceAsset?.channelCount ?? 1;
    const track = trackMap.get(trackIndex) ?? {
      id: `track-${slugify(context.bundleId)}-aaf-${trackIndex}`,
      timelineId: context.timelineId,
      name: section.fields.TrackName ?? `Track ${trackIndex}`,
      role: inferRole(section.fields.Role ?? section.fields.TrackName),
      index: trackIndex,
      channelLayout: inferLayout(section.fields.ChannelLayout, channelCount),
      clipEventIds: [],
    } satisfies Track;

    if (!trackMap.has(trackIndex)) {
      trackMap.set(trackIndex, track);
    }

    const clipEventId = `clip-${slugify(context.bundleId)}-aaf-${index + 1}`;
    trackMap.get(trackIndex)?.clipEventIds.push(clipEventId);
    const mobName = section.fields.MobName;
    const recordIn = section.fields.RecordIn ?? UNKNOWN_TIMECODE;
    const recordOut = section.fields.RecordOut ?? UNKNOWN_TIMECODE;
    const sourceIn = section.fields.SourceIn ?? UNKNOWN_TIMECODE;
    const sourceOut = section.fields.SourceOut ?? UNKNOWN_TIMECODE;

    return {
      id: clipEventId,
      timelineId: context.timelineId,
      trackId: track.id,
      sourceAssetId: sourceAsset?.id ?? `asset-${slugify(context.bundleId)}-aaf-${index + 1}`,
      clipName: section.fields.Name ?? sourceFileName,
      sourceFileName,
      reel: section.fields.Reel,
      tape: section.fields.Tape,
      scene: section.fields.Scene,
      take: section.fields.Take,
      eventDescription: `AAF clip imported from ${sourceFileName}.`,
      clipNotes: mergeTextParts([section.fields.Notes, mobName && mobName !== sourceFileName ? `AAF mob: ${mobName}` : undefined]),
      recordIn,
      recordOut,
      sourceIn,
      sourceOut,
      recordInFrames: timecodeToFrames(recordIn, fps),
      recordOutFrames: timecodeToFrames(recordOut, fps),
      sourceInFrames: timecodeToFrames(sourceIn, fps),
      sourceOutFrames: timecodeToFrames(sourceOut, fps),
      channelCount,
      channelLayout: inferLayout(section.fields.ChannelLayout, channelCount),
      isPolyWav: parseBoolean(section.fields.IsPolyWav) || channelCount > 2,
      hasBwf: section.fields.HasBwf ? parseBoolean(section.fields.HasBwf) : sourceFileName.toLowerCase().endsWith(".bwf"),
      hasIXml: parseBoolean(section.fields.HasIXml),
      isOffline: parseBoolean(section.fields.Offline) || !sourceAsset || sourceAsset.status === "missing",
      isNested: parseBoolean(section.fields.Nested),
      isFlattened: section.fields.Flattened ? parseBoolean(section.fields.Flattened) : true,
      hasSpeedEffect: parseBoolean(section.fields.SpeedEffect),
      hasFadeIn: parseBoolean(section.fields.FadeIn),
      hasFadeOut: parseBoolean(section.fields.FadeOut),
    };
  });

  const tracks = [...trackMap.values()].sort((left, right) => left.index - right.index);
  const markers = markerSections.map((section, index): Marker => {
    const timecode = section.fields.Timecode ?? UNKNOWN_TIMECODE;
    return {
      id: `marker-${slugify(context.timelineId)}-aaf-${index + 1}`,
      timelineId: context.timelineId,
      name: section.fields.Name ?? `AAF Marker ${index + 1}`,
      timecode,
      frame: timecodeToFrames(timecode, fps),
      color: inferMarkerColor(section.fields.Color),
      note: section.fields.Note ?? "",
    };
  });

  return {
    source: "aaf",
    timeline: createTimelineFromPieces(
      context,
      composition.fields.Name ?? context.fallbackName,
      fps,
      sampleRate,
      composition.fields.DropFrame ? parseBoolean(composition.fields.DropFrame) : context.fallbackDropFrame,
      startTimecode,
      composition.fields.DurationTimecode,
      tracks,
      clipEvents,
      markers,
    ),
    tracks,
    clipEvents,
    markers,
  };
}

export function parseAafText(text: string, context: ParseAafContext): ParsedAafSource | null {
  return parseAafJsonText(text, context) ?? parseLegacyAafText(text, context);
}
