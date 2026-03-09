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

function parseSampleRate(value?: string): SampleRate | undefined {
  const parsed = parseInteger(value);
  if (parsed === 96000) {
    return 96000;
  }
  if (parsed === 48000) {
    return 48000;
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

export function parseAafText(text: string, context: ParseAafContext): ParsedAafSource | null {
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
      clipNotes: section.fields.Notes ?? "",
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

  const startFrame = timecodeToFrames(startTimecode, fps);
  const durationTimecode = composition.fields.DurationTimecode
    ?? framesToTimecode(
      clipEvents.reduce((maxFrame, clipEvent) => Math.max(maxFrame, clipEvent.recordOutFrames), startFrame) - (startFrame >= 0 ? startFrame : 0),
      fps,
    );
  const durationFrames = timecodeToFrames(durationTimecode, fps);

  return {
    source: "aaf",
    timeline: {
      id: context.timelineId,
      translationModelId: context.translationModelId,
      name: composition.fields.Name ?? context.fallbackName,
      fps,
      sampleRate,
      dropFrame: composition.fields.DropFrame ? parseBoolean(composition.fields.DropFrame) : context.fallbackDropFrame,
      startTimecode,
      durationTimecode,
      startFrame,
      durationFrames,
      trackIds: tracks.map((track) => track.id),
      markerIds: markers.map((marker) => marker.id),
    },
    tracks,
    clipEvents,
    markers,
  };
}
