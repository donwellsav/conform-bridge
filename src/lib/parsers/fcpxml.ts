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

interface XmlAttributes {
  [key: string]: string | undefined;
}

interface ParsedFormat {
  id: string;
  fps?: FrameRate;
  sampleRate?: SampleRate;
}

interface ParsedAsset {
  id: string;
  name?: string;
  audioChannels?: number;
}

export interface ParseFcpxmlContext {
  bundleId: string;
  translationModelId: string;
  timelineId: string;
  fileKind: "fcpxml" | "xml";
  assets: IntakeAsset[];
  fallbackName: string;
  fallbackFps: FrameRate;
  fallbackSampleRate: SampleRate;
  fallbackStartTimecode: string;
  fallbackDropFrame: boolean;
}

export interface ParsedTimelineSource {
  source: "fcpxml" | "xml";
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

function collectTagAttributes(text: string, tagName: string) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)\\/?>`, "gi");
  const matches: XmlAttributes[] = [];

  for (const match of text.matchAll(pattern)) {
    matches.push(parseAttributes(match[1] ?? ""));
  }

  return matches;
}

function parseAttributes(raw: string) {
  const attributes: XmlAttributes = {};
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g;

  for (const match of raw.matchAll(pattern)) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function parseRate(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.endsWith("k")) {
    const numeric = Number.parseInt(normalized.slice(0, -1), 10);
    if (numeric === 48) {
      return 48000;
    }
    if (numeric === 96) {
      return 96000;
    }
  }

  const numeric = Number.parseInt(normalized, 10);
  if (numeric === 48000 || numeric === 96000) {
    return numeric;
  }

  return undefined;
}

function parseRationalSeconds(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const stripped = normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;

  if (stripped.includes("/")) {
    const [numerator, denominator] = stripped.split("/");
    const top = Number.parseFloat(numerator);
    const bottom = Number.parseFloat(denominator);

    if (Number.isFinite(top) && Number.isFinite(bottom) && bottom !== 0) {
      return top / bottom;
    }

    return undefined;
  }

  const numeric = Number.parseFloat(stripped);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function coerceFrameRateFromDuration(frameDuration?: string): FrameRate | undefined {
  const secondsPerFrame = parseRationalSeconds(frameDuration);
  if (!secondsPerFrame || secondsPerFrame <= 0) {
    return undefined;
  }

  const fps = 1 / secondsPerFrame;
  if (Math.abs(fps - 23.976) < 0.02) {
    return "23.976";
  }
  if (Math.abs(fps - 24) < 0.02) {
    return "24";
  }
  if (Math.abs(fps - 25) < 0.02) {
    return "25";
  }
  if (Math.abs(fps - 29.97) < 0.05) {
    return "29.97";
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

function secondsToFrames(seconds: number | undefined, fps: FrameRate) {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return UNKNOWN_FRAME;
  }

  return Math.round(seconds * nominalFramesPerSecond(fps));
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

function timecodeToFrames(timecode: string | undefined, fps: FrameRate) {
  if (!timecode || !/^\d{2}:\d{2}:\d{2}:\d{2}$/.test(timecode)) {
    return UNKNOWN_FRAME;
  }

  const [hours, minutes, seconds, frames] = timecode.split(":").map((token) => Number.parseInt(token, 10));
  return (((hours * 60) + minutes) * 60 + seconds) * nominalFramesPerSecond(fps) + frames;
}

function inferLayout(channelCount: number): ChannelLayout {
  if (channelCount <= 1) {
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

function parseFrameRateFromXmeml(rateBlock: string | undefined, fallbackFps: FrameRate) {
  if (!rateBlock) {
    return fallbackFps;
  }

  const timebase = rateBlock.match(/<timebase>(\d+)<\/timebase>/i)?.[1];
  const ntsc = rateBlock.match(/<ntsc>(TRUE|FALSE)<\/ntsc>/i)?.[1]?.toUpperCase() === "TRUE";

  if (timebase === "24" && ntsc) {
    return "23.976";
  }

  if (timebase === "24") {
    return "24";
  }

  if (timebase === "25") {
    return "25";
  }

  if (timebase === "30" && ntsc) {
    return "29.97";
  }

  return fallbackFps;
}

function firstTagText(text: string, tagName: string) {
  return text.match(new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, "i"))?.[1]?.trim();
}

function tagBlocks(text: string, tagName: string) {
  return [...text.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)</${tagName}>`, "gi"))].map((match) => match[1] ?? "");
}

function extractXmlBlock(text: string, tagName: string, searchStart = 0) {
  const tagPattern = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = searchStart;

  let depth = 0;
  let blockStart = -1;
  let contentStart = -1;

  for (const match of text.matchAll(tagPattern)) {
    const matchIndex = match.index ?? 0;
    const isClosing = match[1] === "/";
    const raw = match[0] ?? "";
    const isSelfClosing = !isClosing && raw.endsWith("/>");

    if (!isClosing) {
      if (depth === 0) {
        blockStart = matchIndex;
        contentStart = matchIndex + raw.length;
      }

      if (!isSelfClosing) {
        depth += 1;
      }
    } else if (depth > 0) {
      depth -= 1;

      if (depth === 0 && blockStart >= 0 && contentStart >= 0) {
        return {
          content: text.slice(contentStart, matchIndex),
          nextIndex: matchIndex + raw.length,
        };
      }
    }
  }

  return null;
}

function extractAllXmlBlocks(text: string, tagName: string) {
  const blocks: string[] = [];
  let searchStart = 0;

  while (searchStart < text.length) {
    const block = extractXmlBlock(text, tagName, searchStart);
    if (!block) {
      break;
    }

    blocks.push(block.content);
    searchStart = block.nextIndex;
  }

  return blocks;
}

function selectStructuralXmlBlock(blocks: string[]) {
  if (blocks.length === 0) {
    return "";
  }

  return [...blocks].sort((left, right) => {
    const leftTrackCount = (left.match(/<track>/g) ?? []).length;
    const rightTrackCount = (right.match(/<track>/g) ?? []).length;

    if (rightTrackCount !== leftTrackCount) {
      return rightTrackCount - leftTrackCount;
    }

    const leftClipCount = (left.match(/<clipitem\b/gi) ?? []).length;
    const rightClipCount = (right.match(/<clipitem\b/gi) ?? []).length;

    if (rightClipCount !== leftClipCount) {
      return rightClipCount - leftClipCount;
    }

    return right.length - left.length;
  })[0] ?? "";
}

function parseXmemlTrackBlocks(
  sectionText: string,
  mediaType: "video" | "audio",
  context: ParseFcpxmlContext,
  fps: FrameRate,
  timelineStartFrame: number,
  startIndex: number,
) {
  const tracks: Track[] = [];
  const clipEvents: ClipEvent[] = [];
  const trackBlocks = extractAllXmlBlocks(sectionText, "track");

  trackBlocks.forEach((trackBlock, trackOffset) => {
    const clipBlocks = tagBlocks(trackBlock, "clipitem");
    if (clipBlocks.length === 0) {
      return;
    }

    const trackIndex = startIndex + trackOffset;
    const fallbackClipName = firstTagText(clipBlocks[0] ?? "", "name");
    const trackName = mediaType === "video"
      ? `Video ${trackIndex}`
      : `Audio ${trackIndex}`;
    const trackRole = mediaType === "video"
      ? "guide"
      : inferRole(fallbackClipName ?? trackName);
    const trackId = `track-${slugify(context.bundleId)}-xml-${trackIndex}`;
    const clipEventIds: string[] = [];

    clipBlocks.forEach((clipBlock, clipOffset) => {
      const clipEventId = `clip-${slugify(context.bundleId)}-xml-${trackIndex}-${clipOffset + 1}`;
      const fileBlock = extractXmlBlock(clipBlock, "file")?.content ?? "";
      const sourceFileName = firstTagText(fileBlock, "name")
        ?? firstTagText(clipBlock, "name")
        ?? "unknown";
      const clipName = firstTagText(clipBlock, "name") ?? sourceFileName;
      const clipStart = Number.parseInt(firstTagText(clipBlock, "start") ?? "", 10);
      const clipEnd = Number.parseInt(firstTagText(clipBlock, "end") ?? "", 10);
      const clipIn = Number.parseInt(firstTagText(clipBlock, "in") ?? "", 10);
      const clipOut = Number.parseInt(firstTagText(clipBlock, "out") ?? "", 10);
      const fileTimecodeBlock = extractXmlBlock(fileBlock, "timecode")?.content;
      const fileStartTimecode = firstTagText(fileTimecodeBlock ?? "", "string");
      const fileStartFrame = timecodeToFrames(fileStartTimecode, fps);
      const sourceAsset = findAssetByName(context.assets, sourceFileName);
      const channelCount = Number.parseInt(firstTagText(fileBlock, "channelcount") ?? "", 10)
        || sourceAsset?.channelCount
        || (mediaType === "video" ? 2 : 1);
      const recordInFrames = Number.isFinite(clipStart) && clipStart >= 0
        ? timelineStartFrame + clipStart
        : UNKNOWN_FRAME;
      const recordOutFrames = Number.isFinite(clipEnd) && clipEnd >= 0
        ? timelineStartFrame + clipEnd
        : UNKNOWN_FRAME;
      const sourceInFrames = Number.isFinite(fileStartFrame) && Number.isFinite(clipIn) && clipIn >= 0
        ? fileStartFrame + clipIn
        : UNKNOWN_FRAME;
      const sourceOutFrames = Number.isFinite(fileStartFrame) && Number.isFinite(clipOut) && clipOut >= 0
        ? fileStartFrame + clipOut
        : UNKNOWN_FRAME;

      clipEventIds.push(clipEventId);
      clipEvents.push({
        id: clipEventId,
        timelineId: context.timelineId,
        trackId,
        sourceAssetId: sourceAsset?.id ?? `asset-${slugify(context.bundleId)}-xml-missing-${trackIndex}-${clipOffset + 1}`,
        clipName,
        sourceFileName,
        reel: firstTagText(clipBlock, "reel") ?? undefined,
        tape: firstTagText(clipBlock, "tape") ?? undefined,
        scene: firstTagText(clipBlock, "scene") ?? undefined,
        take: firstTagText(clipBlock, "take") ?? undefined,
        eventDescription: `${context.fileKind.toUpperCase()} timeline exchange clip imported from ${sourceFileName}.`,
        clipNotes: fileStartTimecode ? `Source timecode ${fileStartTimecode}.` : "",
        recordIn: framesToTimecode(recordInFrames, fps),
        recordOut: framesToTimecode(recordOutFrames, fps),
        sourceIn: framesToTimecode(sourceInFrames, fps),
        sourceOut: framesToTimecode(sourceOutFrames, fps),
        recordInFrames,
        recordOutFrames,
        sourceInFrames,
        sourceOutFrames,
        channelCount,
        channelLayout: inferLayout(channelCount),
        isPolyWav: channelCount > 2,
        hasBwf: sourceAsset?.hasBwf ?? false,
        hasIXml: sourceAsset?.hasIXml ?? false,
        isOffline: !sourceAsset || sourceAsset.status === "missing",
        isNested: false,
        isFlattened: true,
        hasSpeedEffect: /<filter>[\s\S]*?<effect>/i.test(clipBlock),
        hasFadeIn: /<transitionitem>/i.test(trackBlock) || /<filter>[\s\S]*?<name>Cross Dissolve/i.test(clipBlock),
        hasFadeOut: /<transitionitem>/i.test(trackBlock) || /<filter>[\s\S]*?<name>Cross Dissolve/i.test(clipBlock),
      });
    });

    tracks.push({
      id: trackId,
      timelineId: context.timelineId,
      name: trackName,
      role: trackRole,
      index: trackIndex,
      channelLayout: inferLayout(clipEvents.find((clipEvent) => clipEvent.trackId === trackId)?.channelCount ?? 1),
      clipEventIds,
    });
  });

  return {
    tracks,
    clipEvents,
  };
}

function parseXmemlText(text: string, context: ParseFcpxmlContext): ParsedTimelineSource | null {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!/<xmeml\b/i.test(normalized)) {
    return null;
  }

  const sequenceBlock = extractXmlBlock(normalized, "sequence")?.content ?? normalized;
  const sequenceRateBlock = extractXmlBlock(sequenceBlock, "rate")?.content;
  const fps = parseFrameRateFromXmeml(sequenceRateBlock, context.fallbackFps);
  const timelineName = firstTagText(sequenceBlock, "name") ?? context.fallbackName;
  const sequenceTimecodeBlock = extractXmlBlock(sequenceBlock, "timecode")?.content ?? "";
  const timecodeString = firstTagText(sequenceTimecodeBlock, "string") ?? context.fallbackStartTimecode;
  const timelineStartFrame = Number.parseInt(firstTagText(sequenceTimecodeBlock, "frame") ?? "", 10);
  const resolvedStartFrame = Number.isFinite(timelineStartFrame)
    ? timelineStartFrame
    : timecodeToFrames(timecodeString, fps);
  const durationFrames = Number.parseInt(firstTagText(sequenceBlock, "duration") ?? "", 10);
  const mediaBlock = selectStructuralXmlBlock(extractAllXmlBlocks(sequenceBlock, "media"));
  const videoSection = selectStructuralXmlBlock(extractAllXmlBlocks(mediaBlock, "video"));
  const audioSection = selectStructuralXmlBlock(extractAllXmlBlocks(mediaBlock, "audio"));
  const videoHydration = parseXmemlTrackBlocks(videoSection, "video", context, fps, resolvedStartFrame, 1);
  const audioHydration = parseXmemlTrackBlocks(
    audioSection,
    "audio",
    context,
    fps,
    resolvedStartFrame,
    videoHydration.tracks.length + 1,
  );
  const tracks = [...videoHydration.tracks, ...audioHydration.tracks];
  const clipEvents = [...videoHydration.clipEvents, ...audioHydration.clipEvents];

  return {
    source: "xml",
    timeline: {
      id: context.timelineId,
      translationModelId: context.translationModelId,
      name: timelineName,
      fps,
      sampleRate: context.fallbackSampleRate,
      dropFrame: context.fallbackDropFrame,
      startTimecode: timecodeString,
      durationTimecode: framesToTimecode(durationFrames, fps),
      startFrame: resolvedStartFrame,
      durationFrames,
      trackIds: tracks.map((track) => track.id),
      markerIds: [],
    },
    tracks,
    clipEvents,
    markers: [],
  };
}

export function parseFcpxmlText(text: string, context: ParseFcpxmlContext): ParsedTimelineSource | null {
  const normalized = text.replace(/^\uFEFF/, "");
  const parsedXmeml = context.fileKind === "xml" ? parseXmemlText(normalized, context) : null;
  if (parsedXmeml) {
    return parsedXmeml;
  }
  const formatMap = new Map<string, ParsedFormat>();

  collectTagAttributes(normalized, "format").forEach((attributes) => {
    const id = attributes.id;
    if (!id) {
      return;
    }

    formatMap.set(id, {
      id,
      fps: coerceFrameRateFromDuration(attributes.frameDuration),
      sampleRate: parseRate(attributes.audioRate),
    });
  });

  const assetMap = new Map<string, ParsedAsset>();
  collectTagAttributes(normalized, "asset").forEach((attributes) => {
    const id = attributes.id;
    if (!id) {
      return;
    }

    assetMap.set(id, {
      id,
      name: attributes.name,
      audioChannels: attributes.audioChannels ? Number.parseInt(attributes.audioChannels, 10) : undefined,
    });
  });

  const sequenceAttributes = collectTagAttributes(normalized, "sequence")[0];
  const projectAttributes = collectTagAttributes(normalized, "project")[0];

  if (!sequenceAttributes && !projectAttributes) {
    return null;
  }

  const format = sequenceAttributes?.format ? formatMap.get(sequenceAttributes.format) : undefined;
  const fps = format?.fps ?? context.fallbackFps;
  const sampleRate = format?.sampleRate ?? context.fallbackSampleRate;
  const startFrame = secondsToFrames(parseRationalSeconds(sequenceAttributes?.tcStart), fps);
  const resolvedStartFrame = startFrame >= 0 ? startFrame : secondsToFrames(parseRationalSeconds(sequenceAttributes?.start), fps);
  const startTimecode = resolvedStartFrame >= 0 ? framesToTimecode(resolvedStartFrame, fps) : context.fallbackStartTimecode;
  const timelineName = projectAttributes?.name ?? sequenceAttributes?.name ?? context.fallbackName;

  const clipAttributes = [
    ...collectTagAttributes(normalized, "asset-clip"),
    ...collectTagAttributes(normalized, "clip"),
  ];

  const trackMap = new Map<number, Track>();
  const clipEvents = clipAttributes.map((attributes, index): ClipEvent => {
    const lane = attributes.lane ? Number.parseInt(attributes.lane, 10) : Number.parseInt(attributes.audioLane ?? "1", 10);
    const resolvedLane = Number.isFinite(lane) && lane > 0 ? lane : 1;
    const asset = attributes.ref ? assetMap.get(attributes.ref) : undefined;
    const sourceFileName = asset?.name ?? attributes.sourceFileName ?? attributes.name ?? "unknown";
    const sourceAsset = findAssetByName(context.assets, sourceFileName);
    const durationFrames = secondsToFrames(parseRationalSeconds(attributes.duration), fps);
    const sourceInFrames = secondsToFrames(parseRationalSeconds(attributes.start), fps);
    const recordInFrames = (resolvedStartFrame >= 0 ? resolvedStartFrame : 0) + secondsToFrames(parseRationalSeconds(attributes.offset), fps);
    const sourceOutFrames = sourceInFrames >= 0 && durationFrames >= 0 ? sourceInFrames + durationFrames : UNKNOWN_FRAME;
    const recordOutFrames = recordInFrames >= 0 && durationFrames >= 0 ? recordInFrames + durationFrames : UNKNOWN_FRAME;
    const channelCount = asset?.audioChannels
      ?? (attributes.audioChannels ? Number.parseInt(attributes.audioChannels, 10) : undefined)
      ?? sourceAsset?.channelCount
      ?? 1;
    const trackName = attributes.trackName ?? attributes.roleName ?? `Track ${resolvedLane}`;
    const role = inferRole(attributes.role ?? attributes.audioRole ?? trackName);
    const trackId = `track-${slugify(context.bundleId)}-${resolvedLane}`;

    if (!trackMap.has(resolvedLane)) {
      trackMap.set(resolvedLane, {
        id: trackId,
        timelineId: context.timelineId,
        name: trackName,
        role,
        index: resolvedLane,
        channelLayout: inferLayout(channelCount),
        clipEventIds: [],
      });
    }

    const clipEventId = `clip-${slugify(context.bundleId)}-fcpxml-${index + 1}`;
    trackMap.get(resolvedLane)?.clipEventIds.push(clipEventId);

    return {
      id: clipEventId,
      timelineId: context.timelineId,
      trackId,
      sourceAssetId: sourceAsset?.id ?? `asset-${slugify(context.bundleId)}-missing-${index + 1}`,
      clipName: attributes.name ?? sourceFileName,
      sourceFileName,
      reel: attributes.reel,
      tape: attributes.tape,
      scene: attributes.scene,
      take: attributes.take,
      eventDescription: `${context.fileKind.toUpperCase()} timeline exchange clip imported from ${sourceFileName}.`,
      clipNotes: attributes.note ?? "",
      recordIn: framesToTimecode(recordInFrames, fps),
      recordOut: framesToTimecode(recordOutFrames, fps),
      sourceIn: framesToTimecode(sourceInFrames, fps),
      sourceOut: framesToTimecode(sourceOutFrames, fps),
      recordInFrames,
      recordOutFrames,
      sourceInFrames,
      sourceOutFrames,
      channelCount,
      channelLayout: inferLayout(channelCount),
      isPolyWav: channelCount > 2,
      hasBwf: sourceFileName.toLowerCase().endsWith(".bwf"),
      hasIXml: false,
      isOffline: !sourceAsset || sourceAsset.status === "missing",
      isNested: attributes.nested === "true",
      isFlattened: attributes.flattened !== "false",
      hasSpeedEffect: attributes.speedEffect === "true",
      hasFadeIn: attributes.fadeIn === "true",
      hasFadeOut: attributes.fadeOut === "true",
    };
  });

  const tracks = [...trackMap.values()].sort((left, right) => left.index - right.index);
  const maxRecordFrame = clipEvents.reduce((currentMax, clipEvent) => Math.max(currentMax, clipEvent.recordOutFrames), resolvedStartFrame >= 0 ? resolvedStartFrame : 0);
  const durationFrames = secondsToFrames(parseRationalSeconds(sequenceAttributes?.duration), fps);
  const resolvedDurationFrames = durationFrames >= 0
    ? durationFrames
    : resolvedStartFrame >= 0 && maxRecordFrame > resolvedStartFrame
      ? maxRecordFrame - resolvedStartFrame
      : UNKNOWN_FRAME;

  const markerAttributes = collectTagAttributes(normalized, "marker");
  const markers = markerAttributes.map((attributes, index): Marker => {
    const markerFrameOffset = secondsToFrames(parseRationalSeconds(attributes.start ?? attributes.offset), fps);
    const frame = markerFrameOffset >= 0 && resolvedStartFrame >= 0 ? resolvedStartFrame + markerFrameOffset : markerFrameOffset;

    return {
      id: `marker-${slugify(context.timelineId)}-fcpxml-${index + 1}`,
      timelineId: context.timelineId,
      name: attributes.value ?? attributes.name ?? `Marker ${index + 1}`,
      timecode: framesToTimecode(frame, fps),
      frame,
      color: inferMarkerColor(attributes.color),
      note: attributes.note ?? "",
    };
  });

  return {
    source: context.fileKind,
    timeline: {
      id: context.timelineId,
      translationModelId: context.translationModelId,
      name: timelineName,
      fps,
      sampleRate,
      dropFrame: context.fallbackDropFrame,
      startTimecode,
      durationTimecode: framesToTimecode(resolvedDurationFrames, fps),
      startFrame: resolvedStartFrame >= 0 ? resolvedStartFrame : secondsToFrames(parseRationalSeconds(sequenceAttributes?.start), fps),
      durationFrames: resolvedDurationFrames,
      trackIds: tracks.map((track) => track.id),
      markerIds: markers.map((marker) => marker.id),
    },
    tracks,
    clipEvents,
    markers,
  };
}
