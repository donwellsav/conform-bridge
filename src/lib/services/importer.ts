import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

import { extractAafFromFileSync } from "../adapters/aaf-file";
import { parseFcpxmlText } from "../parsers/fcpxml";
import type {
  AnalysisGroup,
  AnalysisReport,
  AssetOrigin,
  ChannelLayout,
  ClipEvent,
  ConformChangeEvent,
  FieldRecorderCandidate,
  FileKind,
  FileRole,
  FrameRate,
  IntakeAsset,
  MappingAction,
  MappingProfile,
  MappingRule,
  Marker,
  MarkerColor,
  MetadataStatus,
  PreservationIssue,
  PreservationScope,
  SampleRate,
  SourceBundle,
  SourceRole,
  TimecodePolicy,
  Timeline,
  Track,
  TranslationJob,
  TranslationModel,
} from "../types";

const FIXTURE_ROOT = resolve(process.cwd(), "fixtures", "intake");
const UNKNOWN_TIMECODE = "unknown";
const UNKNOWN_FRAME = -1;
const SUPPORTED_EXTENSIONS = new Set([
  ".aaf",
  ".fcpxml",
  ".xml",
  ".edl",
  ".csv",
  ".wav",
  ".bwf",
  ".mov",
  ".mp4",
  ".json",
  ".txt",
  ".otio",
  ".otioz",
]);

interface ParsedManifest {
  bundleName?: string;
  jobCode?: string;
  title?: string;
  sequenceName?: string;
  pictureLock?: boolean;
  fps?: string;
  startTimecode?: string;
  durationTimecode?: string;
  sampleRate?: number;
  handlesFrames?: number;
  dropFrame?: boolean;
  templateId?: string;
  outputPresetId?: string;
  expectedFiles?: string[];
  expectedProductionRolls?: string[];
}

interface ParsedMetadataRow {
  timelineName?: string;
  trackIndex?: number;
  trackName?: string;
  role?: SourceRole;
  channelLayout?: ChannelLayout;
  clipName?: string;
  sourceFileName?: string;
  reel?: string;
  tape?: string;
  scene?: string;
  take?: string;
  recordIn?: string;
  recordOut?: string;
  sourceIn?: string;
  sourceOut?: string;
  channelCount?: number;
  isPolyWav?: boolean;
  hasBwf?: boolean;
  hasIXml?: boolean;
  isOffline?: boolean;
  isNested?: boolean;
  isFlattened?: boolean;
  hasSpeedEffect?: boolean;
  hasFadeIn?: boolean;
  hasFadeOut?: boolean;
  eventDescription?: string;
  clipNotes?: string;
}

interface ParsedMarkerRow {
  timecode: string;
  name: string;
  note: string;
  color: MarkerColor;
}

interface ParsedEdlEvent {
  eventNumber: string;
  reel: string;
  recordIn: string;
  recordOut: string;
  sourceIn: string;
  sourceOut: string;
  clipName?: string;
}

export interface IntakeImportResult {
  sourceBundle: SourceBundle;
  translationModel: TranslationModel;
  timeline: Timeline;
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
  analysisReport: AnalysisReport;
  mappingProfile: MappingProfile;
  mappingRules: MappingRule[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  conformChangeEvents: ConformChangeEvent[];
  job: TranslationJob;
}

export interface ImportedIntakeData {
  sourceBundles: SourceBundle[];
  sourceAssets: IntakeAsset[];
  translationModels: TranslationModel[];
  timelines: Timeline[];
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
  analysisReports: AnalysisReport[];
  preservationIssues: PreservationIssue[];
  mappingProfiles: MappingProfile[];
  mappingRules: MappingRule[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  conformChangeEvents: ConformChangeEvent[];
  jobs: TranslationJob[];
  fieldRecorderWatchlist: Array<{
    id: string;
    clip: string;
    issue: string;
    fallback: string;
  }>;
}

export interface ImporterService {
  importFolder(folderPath: string): Promise<IntakeImportResult>;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeRelativePath(rootPath: string, filePath: string) {
  return relative(rootPath, filePath).replaceAll("\\", "/");
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

function coerceFrameRate(value?: string): FrameRate {
  switch (value?.trim()) {
    case "23.976":
      return "23.976";
    case "24":
      return "24";
    case "25":
      return "25";
    case "29.97":
      return "29.97";
    default:
      return "24";
  }
}

function coerceSampleRate(value?: number): SampleRate {
  return value === 96000 ? 96000 : 48000;
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
  return [hours, minutes, seconds, frameRemainder].map((value) => value.toString().padStart(2, "0")).join(":");
}

function formatSizeLabel(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function inferFileKind(fileName: string): FileKind | null {
  const extension = extname(fileName).toLowerCase();

  switch (extension) {
    case ".aaf":
      return "aaf";
    case ".fcpxml":
      return "fcpxml";
    case ".xml":
      return "xml";
    case ".edl":
      return "edl";
    case ".csv":
      return "csv";
    case ".wav":
      return "wav";
    case ".bwf":
      return "bwf";
    case ".mov":
      return "mov";
    case ".mp4":
      return "mp4";
    case ".json":
      return "json";
    case ".txt":
      return "txt";
    case ".otio":
      return "otio";
    case ".otioz":
      return "otioz";
    default:
      return null;
  }
}

function inferFileRole(fileName: string, fileKind: FileKind): FileRole {
  const normalizedName = fileName.toLowerCase();

  if (normalizedName === "manifest.json") {
    return "intake_manifest";
  }

  if (normalizedName.includes("marker")) {
    return "marker_export";
  }

  if (normalizedName.includes("metadata")) {
    return "metadata_export";
  }

  if (normalizedName.includes("readme")) {
    return "delivery_readme";
  }

  if (normalizedName.includes("field") && normalizedName.includes("report")) {
    return "field_recorder_report";
  }

  if (fileKind === "mov" || fileKind === "mp4" || normalizedName.includes("_ref")) {
    return "reference_video";
  }

  if (fileKind === "wav" || fileKind === "bwf") {
    return "production_audio";
  }

  return "timeline_exchange";
}

function inferOrigin(relativePath: string, fileKind: FileKind, fileRole: FileRole): AssetOrigin {
  const normalizedPath = relativePath.toLowerCase();

  if (normalizedPath.includes("production-audio/") || fileRole === "production_audio") {
    return "production-audio";
  }

  if (normalizedPath.includes("resolve/") || fileKind === "aaf" || fileKind === "fcpxml" || fileKind === "xml") {
    return "resolve";
  }

  if (normalizedPath.includes("editorial/")) {
    return "editorial";
  }

  if (fileRole === "marker_export" || fileRole === "metadata_export" || fileRole === "intake_manifest" || fileRole === "reference_video") {
    return "editorial";
  }

  return "editorial";
}

function inferChannelLayout(value?: string): ChannelLayout | undefined {
  switch (value?.trim().toLowerCase()) {
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
      return undefined;
  }
}

function inferSourceRole(value?: string): SourceRole {
  switch (value?.trim().toLowerCase()) {
    case "dx":
      return "dx";
    case "fx":
      return "fx";
    case "mx":
      return "mx";
    case "vo":
      return "vo";
    case "printmaster":
      return "printmaster";
    case "guide":
      return "guide";
    default:
      return "guide";
  }
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

function readAllFiles(rootPath: string): string[] {
  const entries = readdirSync(rootPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...readAllFiles(absolutePath));
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(extension)) {
      files.push(absolutePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function parseCsvRecords(text: string) {
  const records: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let insideQuotes = false;

  const normalizedText = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentField);
      if (currentRow.some((value) => value.trim().length > 0)) {
        records.push(currentRow);
      }
      currentField = "";
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value.trim().length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return [] as Record<string, string>[];
  }

  const headers = records[0].map((header) => header.trim());
  return records.slice(1).map((record) => {
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = record[headerIndex]?.trim() ?? "";
    });
    return row;
  });
}

export function parseMetadataCsvText(text: string): ParsedMetadataRow[] {
  return parseCsvRecords(text).map((row) => ({
    timelineName: row.timelineName || row.timeline_name || undefined,
    trackIndex: parseInteger(row.trackIndex || row.track_index),
    trackName: row.trackName || row.track_name || undefined,
    role: inferSourceRole(row.role),
    channelLayout: inferChannelLayout(row.channelLayout || row.channel_layout),
    clipName: row.clipName || row.clip_name || undefined,
    sourceFileName: row.sourceFileName || row.source_file_name || undefined,
    reel: row.reel || undefined,
    tape: row.tape || undefined,
    scene: row.scene || undefined,
    take: row.take || undefined,
    recordIn: row.recordIn || row.record_in || undefined,
    recordOut: row.recordOut || row.record_out || undefined,
    sourceIn: row.sourceIn || row.source_in || undefined,
    sourceOut: row.sourceOut || row.source_out || undefined,
    channelCount: parseInteger(row.channelCount || row.channel_count),
    isPolyWav: parseBoolean(row.isPolyWav || row.is_poly_wav),
    hasBwf: parseBoolean(row.hasBwf || row.has_bwf),
    hasIXml: parseBoolean(row.hasIXml || row.has_ixml),
    isOffline: parseBoolean(row.isOffline || row.is_offline),
    isNested: parseBoolean(row.isNested || row.is_nested),
    isFlattened: parseBoolean(row.isFlattened || row.is_flattened),
    hasSpeedEffect: parseBoolean(row.hasSpeedEffect || row.has_speed_effect),
    hasFadeIn: parseBoolean(row.hasFadeIn || row.has_fade_in),
    hasFadeOut: parseBoolean(row.hasFadeOut || row.has_fade_out),
    eventDescription: row.eventDescription || row.event_description || undefined,
    clipNotes: row.clipNotes || row.clip_notes || undefined,
  }));
}

export function parseMarkerCsvText(text: string): ParsedMarkerRow[] {
  return parseCsvRecords(text).flatMap((row) => {
    const timecode = row.timecode || row.loc || row.location;
    const name = row.name || row.markerName || row.marker_name;

    if (!timecode || !name) {
      return [];
    }

    return [{
      timecode,
      name,
      note: row.note || row.notes || "",
      color: inferMarkerColor(row.color),
    }];
  });
}

export function parseManifestText(text: string): ParsedManifest {
  const parsed = JSON.parse(text) as Record<string, unknown>;

  return {
    bundleName: typeof parsed.bundleName === "string" ? parsed.bundleName : undefined,
    jobCode: typeof parsed.jobCode === "string" ? parsed.jobCode : undefined,
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    sequenceName: typeof parsed.sequenceName === "string" ? parsed.sequenceName : undefined,
    pictureLock: typeof parsed.pictureLock === "boolean" ? parsed.pictureLock : undefined,
    fps: typeof parsed.fps === "string" ? parsed.fps : undefined,
    startTimecode: typeof parsed.startTimecode === "string" ? parsed.startTimecode : undefined,
    durationTimecode: typeof parsed.durationTimecode === "string" ? parsed.durationTimecode : undefined,
    sampleRate: typeof parsed.sampleRate === "number" ? parsed.sampleRate : undefined,
    handlesFrames: typeof parsed.handlesFrames === "number" ? parsed.handlesFrames : undefined,
    dropFrame: typeof parsed.dropFrame === "boolean" ? parsed.dropFrame : undefined,
    templateId: typeof parsed.templateId === "string" ? parsed.templateId : undefined,
    outputPresetId: typeof parsed.outputPresetId === "string" ? parsed.outputPresetId : undefined,
    expectedFiles: Array.isArray(parsed.expectedFiles) ? parsed.expectedFiles.filter((value): value is string => typeof value === "string") : undefined,
    expectedProductionRolls: Array.isArray(parsed.expectedProductionRolls) ? parsed.expectedProductionRolls.filter((value): value is string => typeof value === "string") : undefined,
  };
}

export function parseSimpleEdlText(text: string): { events: ParsedEdlEvent[]; markers: ParsedMarkerRow[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const events: ParsedEdlEvent[] = [];
  const markers: ParsedMarkerRow[] = [];
  let currentEvent: ParsedEdlEvent | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const eventMatch = line.match(/^(\d{3})\s+(\S+)\s+\S+\s+\S+\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2}:\d{2})$/);
    if (eventMatch) {
      currentEvent = {
        eventNumber: eventMatch[1],
        reel: eventMatch[2],
        sourceIn: eventMatch[3],
        sourceOut: eventMatch[4],
        recordIn: eventMatch[5],
        recordOut: eventMatch[6],
      };
      events.push(currentEvent);
      continue;
    }

    const clipMatch = line.match(/^\*\s*FROM CLIP NAME:\s*(.+)$/i);
    if (clipMatch && currentEvent) {
      currentEvent.clipName = clipMatch[1].trim();
      continue;
    }

    const markerMatch = line.match(/^\*\s*LOC:\s*(\d{2}:\d{2}:\d{2}:\d{2})\s+([A-Z]+)\s+MARKER\s+(.+)$/i);
    if (markerMatch) {
      const [name, note] = markerMatch[3].split("|").map((value) => value.trim());
      markers.push({
        timecode: markerMatch[1],
        color: inferMarkerColor(markerMatch[2]),
        name,
        note: note ?? "",
      });
    }
  }

  return { events, markers };
}

function createIntakeAsset(bundleId: string, folderPath: string, filePath: string): IntakeAsset {
  const stats = statSync(filePath);
  const relativePath = normalizeRelativePath(folderPath, filePath);
  const fileName = basename(filePath);
  const fileKind = inferFileKind(fileName);

  if (!fileKind) {
    throw new Error(`Unsupported intake file kind for ${fileName}.`);
  }

  const fileRole = inferFileRole(fileName, fileKind);
  const origin = inferOrigin(relativePath, fileKind, fileRole);

  return {
    id: `asset-${slugify(bundleId)}-${slugify(relativePath)}`,
    bundleId,
    stage: "intake",
    origin,
    relativePath,
    fileKind,
    fileRole,
    name: fileName,
    sizeLabel: formatSizeLabel(stats.size),
    status: "present",
    note: `Scanned from ${relativePath}.`,
  };
}

function createMissingAsset(bundleId: string, fileName: string): IntakeAsset {
  const fileKind = inferFileKind(fileName) ?? "txt";
  const fileRole = inferFileRole(fileName, fileKind);
  const origin = inferOrigin(fileName, fileKind, fileRole);

  return {
    id: `asset-${slugify(bundleId)}-missing-${slugify(fileName)}`,
    bundleId,
    stage: "intake",
    origin,
    fileKind,
    fileRole,
    name: fileName,
    sizeLabel: "Missing",
    status: "missing",
    note: "Expected by the intake package description but not found in the turnover folder.",
  };
}

function findAssetByName(assets: IntakeAsset[], fileName: string | undefined) {
  if (!fileName) {
    return undefined;
  }

  return assets.find((asset) => asset.name.toLowerCase() === fileName.toLowerCase());
}

function deriveTrackMappingAction(role: SourceRole): MappingAction {
  switch (role) {
    case "guide":
      return "ignore";
    case "printmaster":
      return "merge";
    default:
      return "preserve";
  }
}

function deriveTargetLane(track: Track) {
  switch (track.role) {
    case "dx":
      return `DX ${track.index}`;
    case "fx":
      return "FX Stem";
    case "mx":
      return "MX Stem";
    case "vo":
      return "VO";
    case "printmaster":
      return "Printmaster Review";
    case "guide":
      return "Guide Review";
  }
}

function createMarkers(fps: FrameRate, timelineId: string, rows: ParsedMarkerRow[]) {
  return rows.map((row, index): Marker => ({
    id: `marker-${slugify(timelineId)}-${index + 1}`,
    timelineId,
    name: row.name,
    timecode: row.timecode,
    frame: timecodeToFrames(row.timecode, fps),
    color: row.color,
    note: row.note,
  }));
}

function createFallbackClipsFromEdl(
  bundleId: string,
  timelineId: string,
  fps: FrameRate,
  edlEvents: ParsedEdlEvent[],
  assets: IntakeAsset[],
) {
  if (edlEvents.length === 0) {
    return {
      tracks: [] as Track[],
      clipEvents: [] as ClipEvent[],
    };
  }

  const track: Track = {
    id: `track-${slugify(bundleId)}-edl-1`,
    timelineId,
    name: "EDL Imported Events",
    role: "guide",
    index: 1,
    channelLayout: "mono",
    clipEventIds: edlEvents.map((_, index) => `clip-${slugify(bundleId)}-edl-${index + 1}`),
  };

  const clipEvents = edlEvents.map((event, index): ClipEvent => {
    const sourceAsset = findAssetByName(assets, event.clipName) ?? assets.find((asset) => asset.fileRole === "timeline_exchange");

    return {
      id: `clip-${slugify(bundleId)}-edl-${index + 1}`,
      timelineId,
      trackId: track.id,
      sourceAssetId: sourceAsset?.id ?? `asset-${slugify(bundleId)}-unknown`,
      clipName: event.clipName ?? `EDL Event ${event.eventNumber}`,
      sourceFileName: sourceAsset?.name ?? "unknown",
      eventDescription: "Hydrated from simple EDL event parsing because structured metadata was unavailable.",
      clipNotes: "Structured AAF and FCPXML ingestion were unavailable for this event, so the importer fell back to EDL timing only.",
      recordIn: event.recordIn,
      recordOut: event.recordOut,
      sourceIn: event.sourceIn,
      sourceOut: event.sourceOut,
      recordInFrames: timecodeToFrames(event.recordIn, fps),
      recordOutFrames: timecodeToFrames(event.recordOut, fps),
      sourceInFrames: timecodeToFrames(event.sourceIn, fps),
      sourceOutFrames: timecodeToFrames(event.sourceOut, fps),
      channelCount: 1,
      channelLayout: "mono",
      isPolyWav: false,
      hasBwf: false,
      hasIXml: false,
      isOffline: false,
      isNested: false,
      isFlattened: true,
      hasSpeedEffect: false,
      hasFadeIn: false,
      hasFadeOut: false,
    };
  });

  return {
    tracks: [track],
    clipEvents,
  };
}

function groupIssuesByScope(issues: PreservationIssue[]) {
  const groups = new Map<PreservationScope, PreservationIssue[]>();

  for (const issue of issues) {
    const existing = groups.get(issue.scope) ?? [];
    existing.push(issue);
    groups.set(issue.scope, existing);
  }

  return [...groups.entries()].map(([scope, findings], index): AnalysisGroup => ({
    id: `group-${scope}-${index + 1}`,
    title: scope.replaceAll("_", " "),
    scope,
    findings,
  }));
}

function createMappingProfile(
  jobId: string,
  tracks: Track[],
  clipEvents: ClipEvent[],
  fieldRecorderCandidates: FieldRecorderCandidate[],
  timeline: Timeline,
) {
  const firstClip = clipEvents[0];
  const unresolvedCandidate = fieldRecorderCandidates.find((candidate) => candidate.status !== "linked");

  return {
    id: `mapping-${slugify(jobId)}`,
    jobId,
    timecodePolicy: {
      timelineStart: timeline.startTimecode,
      eventStartMode: "source_absolute",
      pullMode: "none",
      dropFrame: timeline.dropFrame,
    } satisfies TimecodePolicy,
    trackMappings: tracks.map((track) => ({
      id: `tm-${slugify(track.id)}`,
      sourceTrack: track.name,
      sourceRole: track.role,
      channelLayout: track.channelLayout,
      targetLane: deriveTargetLane(track),
      targetType: track.role === "guide" ? "folder" : track.role === "fx" || track.role === "mx" || track.role === "printmaster" ? "group" : "audio_track",
      action: deriveTrackMappingAction(track.role),
    })),
    metadataMappings: firstClip
      ? [
          { id: `mm-${slugify(jobId)}-clip`, field: "clip_name", sourceValue: firstClip.clipName, targetValue: firstClip.clipName, status: "mapped" as MetadataStatus },
          { id: `mm-${slugify(jobId)}-reel`, field: "reel", sourceValue: firstClip.reel ?? "<missing>", targetValue: firstClip.reel ?? "<missing>", status: firstClip.reel ? "mapped" : "transformed" as MetadataStatus },
          { id: `mm-${slugify(jobId)}-scene`, field: "scene", sourceValue: firstClip.scene ?? "<missing>", targetValue: firstClip.scene ?? "<missing>", status: firstClip.scene ? "mapped" : "transformed" as MetadataStatus },
          { id: `mm-${slugify(jobId)}-take`, field: "take", sourceValue: firstClip.take ?? "<missing>", targetValue: firstClip.take ?? "<missing>", status: firstClip.take ? "mapped" : "transformed" as MetadataStatus },
        ]
      : [],
    fieldRecorderOverrides: unresolvedCandidate
      ? [{
          id: `fro-${slugify(jobId)}-1`,
          matchField: "timecode",
          sourceValue: unresolvedCandidate.matchKeys.timecode ?? "<missing>",
          targetValue: unresolvedCandidate.candidateAssetName,
          status: unresolvedCandidate.status === "missing" ? "unresolved" : "linked",
        }]
      : [],
  } satisfies MappingProfile;
}

function createMappingRules(jobId: string, tracks: Track[], fieldRecorderCandidates: FieldRecorderCandidate[]) {
  const trackRules = tracks.map((track): MappingRule => ({
    id: `rule-${slugify(track.id)}`,
    jobId,
    scope: "track",
    source: track.name,
    target: deriveTargetLane(track),
    action: deriveTrackMappingAction(track.role),
    status: track.role === "guide" ? "review" : "locked",
    note: track.role === "guide"
      ? "Guide material stays in a review folder until export writing exists."
      : "Straight-through canonical mapping based on imported intake roles.",
  }));

  const fieldRecorderRules = fieldRecorderCandidates
    .filter((candidate) => candidate.status !== "linked")
    .map((candidate, index): MappingRule => ({
      id: `rule-${slugify(jobId)}-field-${index + 1}`,
      jobId,
      scope: "field_recorder",
      source: candidate.matchKeys.timecode ?? candidate.clipEventId,
      target: candidate.candidateAssetName,
      action: candidate.status === "missing" ? "preserve" : "remap",
      status: candidate.status === "missing" ? "issue" : "review",
      note: candidate.note,
    }));

  return [...trackRules, ...fieldRecorderRules];
}

function createFieldRecorderCandidates(jobId: string, clipEvents: ClipEvent[], assets: IntakeAsset[]) {
  return clipEvents
    .filter((clipEvent) => clipEvent.sourceFileName.toLowerCase().endsWith(".bwf") || clipEvent.sourceFileName.toLowerCase().endsWith(".wav"))
    .map((clipEvent, index): FieldRecorderCandidate => {
      const asset = findAssetByName(assets, clipEvent.sourceFileName);
      const missingMetadata = !clipEvent.reel || !clipEvent.tape || !clipEvent.scene || !clipEvent.take || !clipEvent.hasBwf || !clipEvent.hasIXml;
      const missingAsset = !asset || asset.status === "missing" || clipEvent.isOffline;

      return {
        id: `frc-${slugify(jobId)}-${index + 1}`,
        jobId,
        clipEventId: clipEvent.id,
        matchKeys: {
          reel: clipEvent.reel,
          tape: clipEvent.tape,
          scene: clipEvent.scene,
          take: clipEvent.take,
          timecode: clipEvent.recordIn,
        },
        status: missingAsset ? "missing" : missingMetadata ? "candidate" : "linked",
        candidateAssetName: clipEvent.sourceFileName,
        note: missingAsset
          ? "Production roll is referenced by imported metadata but not present in the turnover folder."
          : missingMetadata
            ? "Production audio exists, but reel, tape, scene, take, or BWF metadata remain incomplete."
            : "Production audio metadata is sufficient for first-pass field recorder planning.",
      };
    });
}

function createConformChangeEvents(jobId: string, edlEvents: ParsedEdlEvent[], fps: FrameRate) {
  return edlEvents.slice(0, 2).map((event, index): ConformChangeEvent => ({
    id: `chg-${slugify(jobId)}-${index + 1}`,
    jobId,
    changeType: index === 0 ? "trim" : "move",
    oldTimecode: event.recordIn,
    newTimecode: event.recordIn,
    oldFrame: timecodeToFrames(event.recordIn, fps),
    newFrame: timecodeToFrames(event.recordIn, fps),
    note: "Simple EDL extraction is available, but reconform deltas remain placeholder-only in Phase 2A.",
  }));
}

function buildAnalysisReport(
  jobId: string,
  translationModelId: string,
  sequenceName: string,
  sourceBundle: SourceBundle,
  clipEvents: ClipEvent[],
  markers: Marker[],
  fieldRecorderBlocked: boolean,
  expectedFiles: string[],
  expectedProductionRolls: string[],
  extraIssues: PreservationIssue[] = [],
) {
  const issues: PreservationIssue[] = [...extraIssues];
  const missingAssets = sourceBundle.assets.filter((asset) => asset.status === "missing");
  const missingExpectedFiles = missingAssets.filter((asset) => expectedFiles.some((expectedFile) => expectedFile.toLowerCase() === asset.name.toLowerCase()) && asset.fileRole !== "production_audio");
  const missingProductionRollAssets = missingAssets.filter((asset) => asset.fileRole === "production_audio" || expectedProductionRolls.some((roll) => roll.toLowerCase() === asset.name.toLowerCase()));
  const unresolvedMetadataClips = clipEvents.filter((clipEvent) => !clipEvent.reel || !clipEvent.tape || !clipEvent.scene || !clipEvent.take);
  const fieldReportArtifactId = `artifact-${slugify(jobId)}-field-recorder-report`;
  const fieldReportArtifactName = `${sequenceName.replaceAll(" ", "_")}_FIELD_RECORDER_REPORT.csv`;

  missingExpectedFiles.forEach((asset, index) => {
    issues.push({
      id: `issue-${slugify(jobId)}-expected-${index + 1}`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "intake",
      code: "MISSING_EXPECTED_FILE",
      title: `${asset.name} is missing from intake`,
      description: "The folder scanner expected this intake file based on the manifest or turnover layout, but it was not found on disk.",
      sourceLocation: asset.name,
      impact: "Canonical hydration may be incomplete because expected editorial context is missing.",
      recommendedAction: "Confirm whether the file should be supplied or intentionally omitted from the turnover.",
      requiresDecision: false,
      affectedItems: [asset.name],
    });
  });

  missingProductionRollAssets.forEach((asset, index) => {
    issues.push({
      id: `issue-${slugify(jobId)}-roll-${index + 1}`,
      jobId,
      category: "manual-review",
      severity: "critical",
      scope: "field_recorder",
      code: "MISSING_PRODUCTION_ROLL",
      title: `${asset.name} is referenced but not present`,
      description: "The importer found a referenced production-audio roll in metadata or manifest expectations, but the file is missing from the turnover folder.",
      sourceLocation: asset.name,
      impact: "Field recorder matching and related delivery artifacts must remain blocked.",
      targetArtifactId: fieldReportArtifactId,
      targetArtifactName: fieldReportArtifactName,
      recommendedAction: "Supply the missing roll or confirm that the source event should remain offline in the canonical model.",
      requiresDecision: true,
      affectedItems: [asset.name],
    });
  });

  if (unresolvedMetadataClips.length > 0) {
    issues.push({
      id: `issue-${slugify(jobId)}-metadata-gaps`,
      jobId,
      category: "downgraded",
      severity: "warning",
      scope: "metadata",
      code: "UNRESOLVED_METADATA",
      title: "Some clip events are missing reel, tape, scene, or take metadata",
      description: "The importer hydrated clip events from real metadata files, but some events still have unresolved reel or slate fields.",
      sourceLocation: "metadata CSV",
      impact: "Field recorder candidate confidence drops and manual review remains necessary.",
      targetArtifactId: fieldReportArtifactId,
      targetArtifactName: fieldReportArtifactName,
      recommendedAction: "Complete the missing reel or slate fields in editorial metadata before relying on automated relink logic.",
      requiresDecision: false,
      affectedItems: unresolvedMetadataClips.map((clipEvent) => clipEvent.clipName),
    });
  }

  if (fieldRecorderBlocked) {
    issues.push({
      id: `issue-${slugify(jobId)}-blocked-1`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "delivery",
      code: "DELIVERY_ARTIFACT_BLOCKED",
      title: `${fieldReportArtifactName} remains blocked`,
      description: "Delivery planning must keep the field recorder report blocked until missing rolls or unresolved metadata gaps are cleared.",
      sourceLocation: "delivery planning",
      impact: "The canonical model is usable, but the planned Nuendo package is not fully ready for handoff.",
      targetArtifactId: fieldReportArtifactId,
      targetArtifactName: fieldReportArtifactName,
      recommendedAction: "Resolve the upstream intake issue before enabling this delivery artifact.",
      requiresDecision: false,
      affectedItems: [fieldReportArtifactName],
    });
  }

  const criticalCount = issues.filter((issue) => issue.severity === "critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "info").length;

  return {
    issues,
    report: {
      id: `report-${slugify(jobId)}`,
      jobId,
      translationModelId,
      updatedOn: "2026-03-08",
      totals: {
        trackCount: sourceBundle.trackCount,
        clipCount: clipEvents.length,
        markerCount: markers.length,
        offlineAssetCount: clipEvents.filter((clipEvent) => clipEvent.isOffline).length,
      },
      highRiskCount: criticalCount,
      warningCount,
      blockedCount: fieldRecorderBlocked ? 1 : 0,
      intakeCompletenessSummary: missingAssets.length > 0
        ? `Scanned ${sourceBundle.assets.length} intake assets. ${missingAssets.length} expected asset(s) remain missing.`
        : `Scanned ${sourceBundle.assets.length} intake assets. No expected files are currently missing.`,
      deliveryReadinessSummary: fieldRecorderBlocked
        ? "At least one delivery artifact must remain blocked pending intake cleanup."
        : "Delivery planning is ready from the current intake analysis.",
      summary: {
        totalFindings: issues.length,
        criticalCount,
        warningCount,
        infoCount,
        operatorDecisionCount: issues.filter((issue) => issue.requiresDecision).length,
      },
      groups: groupIssuesByScope(issues),
    } satisfies AnalysisReport,
  };
}

function hydrateFromMetadataRows(
  bundleId: string,
  timelineId: string,
  fps: FrameRate,
  rows: ParsedMetadataRow[],
  assets: IntakeAsset[],
) {
  const trackMap = new Map<string, Track>();
  const clipEvents: ClipEvent[] = [];

  rows.forEach((row, rowIndex) => {
    const trackIndex = row.trackIndex ?? rowIndex + 1;
    const trackName = row.trackName ?? `Track ${trackIndex}`;
    const trackRole = row.role ?? inferSourceRole(trackName);
    const trackLayout = row.channelLayout ?? (row.channelCount && row.channelCount > 1 ? "stereo" : "mono");
    const trackKey = `${trackIndex}-${trackName}`;

    if (!trackMap.has(trackKey)) {
      trackMap.set(trackKey, {
        id: `track-${slugify(bundleId)}-${trackIndex}`,
        timelineId,
        name: trackName,
        role: trackRole,
        index: trackIndex,
        channelLayout: trackLayout,
        clipEventIds: [],
      });
    }

    const track = trackMap.get(trackKey);
    if (!track) {
      return;
    }

    const sourceAsset = findAssetByName(assets, row.sourceFileName);
    const clipEventId = `clip-${slugify(bundleId)}-${rowIndex + 1}`;
    track.clipEventIds.push(clipEventId);

    clipEvents.push({
      id: clipEventId,
      timelineId,
      trackId: track.id,
      sourceAssetId: sourceAsset?.id ?? `asset-${slugify(bundleId)}-missing-${rowIndex + 1}`,
      clipName: row.clipName ?? `Clip ${rowIndex + 1}`,
      sourceFileName: row.sourceFileName ?? "unknown",
      reel: row.reel,
      tape: row.tape,
      scene: row.scene,
      take: row.take,
      eventDescription: row.eventDescription ?? "Imported from metadata CSV.",
      clipNotes: row.clipNotes ?? "",
      recordIn: row.recordIn ?? UNKNOWN_TIMECODE,
      recordOut: row.recordOut ?? UNKNOWN_TIMECODE,
      sourceIn: row.sourceIn ?? UNKNOWN_TIMECODE,
      sourceOut: row.sourceOut ?? UNKNOWN_TIMECODE,
      recordInFrames: timecodeToFrames(row.recordIn, fps),
      recordOutFrames: timecodeToFrames(row.recordOut, fps),
      sourceInFrames: timecodeToFrames(row.sourceIn, fps),
      sourceOutFrames: timecodeToFrames(row.sourceOut, fps),
      channelCount: row.channelCount ?? 1,
      channelLayout: row.channelLayout ?? "mono",
      isPolyWav: row.isPolyWav ?? false,
      hasBwf: row.hasBwf ?? false,
      hasIXml: row.hasIXml ?? false,
      isOffline: row.isOffline ?? sourceAsset?.status === "missing",
      isNested: row.isNested ?? false,
      isFlattened: row.isFlattened ?? true,
      hasSpeedEffect: row.hasSpeedEffect ?? false,
      hasFadeIn: row.hasFadeIn ?? false,
      hasFadeOut: row.hasFadeOut ?? false,
    });
  });

  return {
    tracks: [...trackMap.values()].sort((left, right) => left.index - right.index),
    clipEvents,
  };
}

type PrimaryTimelineSource = "fcpxml" | "xml" | "aaf" | "edl" | "metadata";

interface PrimaryHydrationResult {
  primarySource: PrimaryTimelineSource;
  timeline: Timeline;
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
}

function findMetadataRowForClip(rows: ParsedMetadataRow[], clipEvent: ClipEvent) {
  return rows.find((row) => row.clipName === clipEvent.clipName)
    ?? rows.find((row) => row.sourceFileName === clipEvent.sourceFileName && row.recordIn === clipEvent.recordIn)
    ?? rows.find((row) => row.sourceFileName === clipEvent.sourceFileName);
}

function findClipEventMatch(candidates: ClipEvent[], clipEvent: Pick<ClipEvent, "clipName" | "sourceFileName" | "recordIn">) {
  return candidates.find((candidate) => candidate.clipName === clipEvent.clipName && candidate.recordIn === clipEvent.recordIn)
    ?? candidates.find((candidate) => candidate.sourceFileName === clipEvent.sourceFileName && candidate.recordIn === clipEvent.recordIn)
    ?? candidates.find((candidate) => candidate.clipName === clipEvent.clipName)
    ?? candidates.find((candidate) => candidate.sourceFileName === clipEvent.sourceFileName);
}

function enrichTracksFromMetadata(tracks: Track[], rows: ParsedMetadataRow[]) {
  return tracks.map((track) => {
    const matchingRows = rows.filter((row) => row.trackIndex === track.index || row.trackName === track.name);
    const referenceRow = matchingRows[0];

    if (!referenceRow) {
      return track;
    }

    return {
      ...track,
      name: referenceRow.trackName ?? track.name,
      role: referenceRow.role ?? track.role,
      channelLayout: referenceRow.channelLayout ?? track.channelLayout,
    } satisfies Track;
  });
}

function enrichTracksFromAaf(tracks: Track[], aafTracks: Track[]) {
  return tracks.map((track) => {
    const aafTrack = aafTracks.find((candidate) => candidate.index === track.index || candidate.name === track.name);
    if (!aafTrack) {
      return track;
    }

    return {
      ...track,
      name: /^Track\s+\d+$/i.test(track.name) ? aafTrack.name : track.name,
      role: track.role === "guide" ? aafTrack.role : track.role,
      channelLayout: track.channelLayout === "mono" && aafTrack.channelLayout !== "mono" ? aafTrack.channelLayout : track.channelLayout,
    } satisfies Track;
  });
}

function enrichClipEventsFromMetadata(
  bundleId: string,
  clipEvents: ClipEvent[],
  rows: ParsedMetadataRow[],
  assets: IntakeAsset[],
) {
  return clipEvents.map((clipEvent, index) => {
    const row = findMetadataRowForClip(rows, clipEvent);
    const sourceAsset = findAssetByName(assets, row?.sourceFileName ?? clipEvent.sourceFileName);

    if (!row) {
      return sourceAsset
        ? {
            ...clipEvent,
            sourceAssetId: sourceAsset.id,
            isOffline: sourceAsset.status === "missing" || clipEvent.isOffline,
          } satisfies ClipEvent
        : clipEvent;
    }

    return {
      ...clipEvent,
      sourceAssetId: sourceAsset?.id ?? clipEvent.sourceAssetId ?? `asset-${slugify(bundleId)}-missing-${index + 1}`,
      clipName: clipEvent.clipName || row.clipName || `Clip ${index + 1}`,
      sourceFileName: clipEvent.sourceFileName !== "unknown" ? clipEvent.sourceFileName : row.sourceFileName ?? "unknown",
      reel: clipEvent.reel ?? row.reel,
      tape: clipEvent.tape ?? row.tape,
      scene: clipEvent.scene ?? row.scene,
      take: clipEvent.take ?? row.take,
      eventDescription: row.eventDescription ?? clipEvent.eventDescription,
      clipNotes: row.clipNotes ? [clipEvent.clipNotes, row.clipNotes].filter(Boolean).join(" ").trim() : clipEvent.clipNotes,
      channelCount: row.channelCount ?? clipEvent.channelCount,
      channelLayout: row.channelLayout ?? clipEvent.channelLayout,
      isPolyWav: clipEvent.isPolyWav || (row.isPolyWav ?? false),
      hasBwf: clipEvent.hasBwf || (row.hasBwf ?? false),
      hasIXml: clipEvent.hasIXml || (row.hasIXml ?? false),
      isOffline: clipEvent.isOffline || (row.isOffline ?? (sourceAsset ? sourceAsset.status === "missing" : false)),
      isNested: clipEvent.isNested || (row.isNested ?? false),
      isFlattened: clipEvent.isFlattened && (row.isFlattened ?? true),
      hasSpeedEffect: clipEvent.hasSpeedEffect || (row.hasSpeedEffect ?? false),
      hasFadeIn: clipEvent.hasFadeIn || (row.hasFadeIn ?? false),
      hasFadeOut: clipEvent.hasFadeOut || (row.hasFadeOut ?? false),
    } satisfies ClipEvent;
  });
}

function enrichClipEventsFromAaf(
  bundleId: string,
  clipEvents: ClipEvent[],
  aafClipEvents: ClipEvent[],
  assets: IntakeAsset[],
) {
  return clipEvents.map((clipEvent, index) => {
    const aafClipEvent = findClipEventMatch(aafClipEvents, clipEvent);
    if (!aafClipEvent) {
      return clipEvent;
    }

    const sourceAsset = findAssetByName(assets, aafClipEvent.sourceFileName ?? clipEvent.sourceFileName);
    return {
      ...clipEvent,
      sourceAssetId: sourceAsset?.id ?? clipEvent.sourceAssetId ?? `asset-${slugify(bundleId)}-aaf-enriched-${index + 1}`,
      sourceFileName: clipEvent.sourceFileName !== "unknown" ? clipEvent.sourceFileName : aafClipEvent.sourceFileName,
      reel: clipEvent.reel ?? aafClipEvent.reel,
      tape: clipEvent.tape ?? aafClipEvent.tape,
      scene: clipEvent.scene ?? aafClipEvent.scene,
      take: clipEvent.take ?? aafClipEvent.take,
      eventDescription: clipEvent.eventDescription === "Imported from metadata CSV."
        ? aafClipEvent.eventDescription
        : clipEvent.eventDescription,
      clipNotes: [clipEvent.clipNotes, aafClipEvent.clipNotes].filter(Boolean).join(" ").trim(),
      sourceIn: clipEvent.sourceIn !== UNKNOWN_TIMECODE ? clipEvent.sourceIn : aafClipEvent.sourceIn,
      sourceOut: clipEvent.sourceOut !== UNKNOWN_TIMECODE ? clipEvent.sourceOut : aafClipEvent.sourceOut,
      sourceInFrames: clipEvent.sourceInFrames >= 0 ? clipEvent.sourceInFrames : aafClipEvent.sourceInFrames,
      sourceOutFrames: clipEvent.sourceOutFrames >= 0 ? clipEvent.sourceOutFrames : aafClipEvent.sourceOutFrames,
      channelCount: clipEvent.channelCount > 1 ? clipEvent.channelCount : aafClipEvent.channelCount,
      channelLayout: clipEvent.channelLayout !== "mono" ? clipEvent.channelLayout : aafClipEvent.channelLayout,
      isPolyWav: clipEvent.isPolyWav || aafClipEvent.isPolyWav,
      hasBwf: clipEvent.hasBwf || aafClipEvent.hasBwf,
      hasIXml: clipEvent.hasIXml || aafClipEvent.hasIXml,
      isOffline: clipEvent.isOffline || aafClipEvent.isOffline || sourceAsset?.status === "missing",
      isNested: clipEvent.isNested || aafClipEvent.isNested,
      isFlattened: clipEvent.isFlattened && aafClipEvent.isFlattened,
      hasSpeedEffect: clipEvent.hasSpeedEffect || aafClipEvent.hasSpeedEffect,
      hasFadeIn: clipEvent.hasFadeIn || aafClipEvent.hasFadeIn,
      hasFadeOut: clipEvent.hasFadeOut || aafClipEvent.hasFadeOut,
    } satisfies ClipEvent;
  });
}

function mergeMarkersWithRows(
  primaryMarkers: Marker[],
  markerRows: ParsedMarkerRow[],
  fps: FrameRate,
  timelineId: string,
) {
  if (primaryMarkers.length === 0) {
    return createMarkers(fps, timelineId, markerRows);
  }

  return primaryMarkers.map((marker) => {
    const matchingRow = markerRows.find((row) => row.timecode === marker.timecode || row.name === marker.name);
    if (!matchingRow) {
      return marker;
    }

    return {
      ...marker,
      name: marker.name || matchingRow.name,
      color: marker.color === "blue" ? matchingRow.color : marker.color,
      note: marker.note || matchingRow.note,
    } satisfies Marker;
  });
}

function describeStructuredSource(primarySource: PrimaryTimelineSource) {
  switch (primarySource) {
    case "fcpxml":
    case "xml":
      return "FCPXML/XML";
    case "aaf":
      return "AAF";
    default:
      return "structured intake source";
  }
}

function createReconciliationIssues(
  jobId: string,
  primarySource: PrimaryTimelineSource,
  tracks: Track[],
  clipEvents: ClipEvent[],
  markers: Marker[],
  metadataRows: ParsedMetadataRow[],
  markerRows: ParsedMarkerRow[],
  assets: IntakeAsset[],
) {
  if (primarySource !== "fcpxml" && primarySource !== "xml" && primarySource !== "aaf") {
    return [] as PreservationIssue[];
  }

  const issues: PreservationIssue[] = [];
  const primarySourceLabel = describeStructuredSource(primarySource);
  const metadataTrackCount = new Set(
    metadataRows
      .map((row) => row.trackIndex)
      .filter((value): value is number => value !== undefined),
  ).size;

  if (metadataTrackCount > 0 && metadataTrackCount !== tracks.length) {
    issues.push({
      id: `issue-${slugify(jobId)}-track-count-mismatch`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "tracks",
      code: "TRACK_COUNT_MISMATCH",
      title: `Metadata CSV track count does not match the ${primarySourceLabel}`,
      description: `The imported ${primarySourceLabel} track layout does not match the track count described by the metadata CSV.`,
      sourceLocation: `${primarySourceLabel} vs metadata CSV`,
      impact: "Track naming or routing assumptions may need manual review before delivery sign-off.",
      recommendedAction: `Use the ${primarySourceLabel} as the primary source and review any metadata-only tracks manually.`,
      requiresDecision: false,
      affectedItems: [`timeline tracks=${tracks.length}`, `metadata tracks=${metadataTrackCount}`],
    });
  }

  const clipMismatches = metadataRows.flatMap((row) => {
    const clipEvent = clipEvents.find((candidate) => candidate.clipName === row.clipName)
      ?? clipEvents.find((candidate) => candidate.sourceFileName === row.sourceFileName);

    if (!clipEvent) {
      return [];
    }

    if ((row.recordIn && row.recordIn !== clipEvent.recordIn) || (row.recordOut && row.recordOut !== clipEvent.recordOut)) {
      return [`${clipEvent.clipName}: ${clipEvent.recordIn}-${clipEvent.recordOut} vs ${row.recordIn ?? "unknown"}-${row.recordOut ?? "unknown"}`];
    }

    return [];
  });

  if (clipMismatches.length > 0) {
    issues.push({
      id: `issue-${slugify(jobId)}-clip-timecode-mismatch`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "clips",
      code: "CLIP_TIMECODE_MISMATCH",
      title: `Metadata CSV timecodes do not match the ${primarySourceLabel}`,
      description: `One or more metadata rows disagree with the imported ${primarySourceLabel} clip timing, so the structured source remains primary.`,
      sourceLocation: `${primarySourceLabel} vs metadata CSV`,
      impact: `Clip placement is preserved from the ${primarySourceLabel}, but operators should review the mismatched rows.`,
      recommendedAction: "Validate the editorial CSV against the preferred timeline source before turnover sign-off.",
      requiresDecision: false,
      affectedItems: clipMismatches,
    });
  }

  if (markerRows.length > 0 && markers.length > 0 && markerRows.length !== markers.length) {
    issues.push({
      id: `issue-${slugify(jobId)}-marker-count-mismatch`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "markers",
      code: "MARKER_COUNT_MISMATCH",
      title: `Marker CSV count does not match the ${primarySourceLabel}`,
      description: `The imported ${primarySourceLabel} marker set disagrees with the marker CSV, so marker CSV data is used only for enrichment.`,
      sourceLocation: `${primarySourceLabel} vs marker CSV`,
      impact: "Marker exports may require operator review before delivery.",
      recommendedAction: "Review marker coverage and decide which editorial source should be corrected upstream.",
      requiresDecision: false,
      affectedItems: [`timeline markers=${markers.length}`, `marker csv=${markerRows.length}`],
    });
  }

  const missingSourceFiles = [...new Set(
    clipEvents
      .filter((clipEvent) => {
        if (clipEvent.sourceFileName === "unknown") {
          return false;
        }

        const sourceAsset = findAssetByName(assets, clipEvent.sourceFileName);
        return !sourceAsset || sourceAsset.status === "missing";
      })
      .map((clipEvent) => clipEvent.sourceFileName),
  )];

  if (missingSourceFiles.length > 0) {
    issues.push({
      id: `issue-${slugify(jobId)}-source-missing`,
      jobId,
      category: "manual-review",
      severity: "critical",
      scope: "intake",
      code: "SOURCE_FILE_MISSING_FROM_INTAKE",
      title: `${primarySourceLabel} references source files that are missing from intake`,
      description: `The imported ${primarySourceLabel} clip list references source media that is not present in the intake bundle.`,
      sourceLocation: `${primarySourceLabel} clip list`,
      impact: "Some canonical events remain offline even though the timeline exchange parsed successfully.",
      recommendedAction: "Supply the missing files or confirm that those events should remain offline.",
      requiresDecision: true,
      affectedItems: missingSourceFiles,
    });
  }

  return issues;
}

function createAafReconciliationIssues(
  jobId: string,
  primarySource: PrimaryTimelineSource,
  tracks: Track[],
  clipEvents: ClipEvent[],
  markers: Marker[],
  aafTimeline: { tracks: Track[]; clipEvents: ClipEvent[]; markers: Marker[] } | null,
  assets: IntakeAsset[],
) {
  if (!aafTimeline) {
    return [] as PreservationIssue[];
  }

  const issues: PreservationIssue[] = [];

  if (primarySource !== "aaf") {
    if (aafTimeline.tracks.length !== tracks.length) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-track-count`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "tracks",
        code: "AAF_TRACK_COUNT_MISMATCH",
        title: "AAF track count does not match the primary timeline source",
        description: "Structured AAF parsing found a different track count than the FCPXML/XML primary source.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Track routing may need manual confirmation before delivery sign-off.",
        recommendedAction: "Keep FCPXML/XML as primary and review the AAF track layout manually.",
        requiresDecision: false,
        affectedItems: [`primary tracks=${tracks.length}`, `aaf tracks=${aafTimeline.tracks.length}`],
      });
    }

    if (aafTimeline.clipEvents.length !== clipEvents.length) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-clip-count`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "clips",
        code: "AAF_CLIP_COUNT_MISMATCH",
        title: "AAF clip count does not match the primary timeline source",
        description: "Structured AAF parsing found a different clip count than the FCPXML/XML primary source.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Canonical event coverage may require operator review.",
        recommendedAction: "Review the AAF event list against the FCPXML/XML timeline before turnover sign-off.",
        requiresDecision: false,
        affectedItems: [`primary clips=${clipEvents.length}`, `aaf clips=${aafTimeline.clipEvents.length}`],
      });
    }

    const timingMismatches: string[] = [];
    const sourceClipMismatches: string[] = [];
    const sourceFileMismatches: string[] = [];
    const reelTapeMismatches: string[] = [];

    clipEvents.forEach((clipEvent) => {
      const aafClipEvent = findClipEventMatch(aafTimeline.clipEvents, clipEvent);
      if (!aafClipEvent) {
        return;
      }

      if (aafClipEvent.recordIn !== clipEvent.recordIn || aafClipEvent.recordOut !== clipEvent.recordOut) {
        timingMismatches.push(`${clipEvent.clipName}: primary ${clipEvent.recordIn}-${clipEvent.recordOut} vs aaf ${aafClipEvent.recordIn}-${aafClipEvent.recordOut}`);
      }

      if (clipEvent.clipName && aafClipEvent.clipName && clipEvent.clipName !== aafClipEvent.clipName) {
        sourceClipMismatches.push(`${clipEvent.recordIn}: primary ${clipEvent.clipName} vs aaf ${aafClipEvent.clipName}`);
      }

      if (
        clipEvent.sourceFileName !== "unknown"
        && aafClipEvent.sourceFileName !== "unknown"
        && clipEvent.sourceFileName !== aafClipEvent.sourceFileName
      ) {
        sourceFileMismatches.push(`${clipEvent.clipName}: primary ${clipEvent.sourceFileName} vs aaf ${aafClipEvent.sourceFileName}`);
      }

      if (
        (clipEvent.reel && aafClipEvent.reel && clipEvent.reel !== aafClipEvent.reel)
        || (clipEvent.tape && aafClipEvent.tape && clipEvent.tape !== aafClipEvent.tape)
      ) {
        reelTapeMismatches.push(
          `${clipEvent.clipName}: primary ${clipEvent.reel ?? "<missing>"}/${clipEvent.tape ?? "<missing>"} vs aaf ${aafClipEvent.reel ?? "<missing>"}/${aafClipEvent.tape ?? "<missing>"}`,
        );
      }
    });

    if (timingMismatches.length > 0) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-timing`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "clips",
        code: "AAF_CLIP_TIMING_MISMATCH",
        title: "AAF clip timing does not match the primary timeline source",
        description: "AAF event timing disagrees with the FCPXML/XML primary clip placement, so AAF is being used only for enrichment.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Canonical timing remains stable, but the AAF needs manual review.",
        recommendedAction: "Review the mismatched clips against the Resolve export that should remain authoritative.",
        requiresDecision: false,
        affectedItems: timingMismatches,
      });
    }

    if (sourceClipMismatches.length > 0) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-source-clips`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "clips",
        code: "AAF_SOURCE_CLIP_MISMATCH",
        title: "AAF source clip identity does not match the primary timeline source",
        description: "AAF source clip identity disagrees with the FCPXML/XML primary source for one or more events.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Source clip naming and reconform assumptions may require manual review.",
        recommendedAction: "Confirm which turnover source carries the authoritative source clip identity before downstream relink or conform decisions.",
        requiresDecision: false,
        affectedItems: sourceClipMismatches,
      });
    }

    if (sourceFileMismatches.length > 0) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-source-files`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "clips",
        code: "AAF_SOURCE_FILE_MISMATCH",
        title: "AAF source file names do not match the primary timeline source",
        description: "AAF clip references point to different source file names than the FCPXML/XML primary source.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Media relink assumptions may not be stable until the disagreement is resolved.",
        recommendedAction: "Confirm which turnover source carries the authoritative source file names.",
        requiresDecision: false,
        affectedItems: sourceFileMismatches,
      });
    }

    if (reelTapeMismatches.length > 0) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-reel-tape`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "metadata",
        code: "AAF_REEL_TAPE_MISMATCH",
        title: "AAF reel or tape metadata does not match the primary timeline source",
        description: "AAF clip metadata disagrees with the FCPXML/XML primary source for reel or tape identity.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Field recorder confidence may drop until the mismatch is resolved.",
        recommendedAction: "Review reel and tape metadata upstream before relying on automated relink decisions.",
        requiresDecision: false,
        affectedItems: reelTapeMismatches,
      });
    }

    const primaryMarkerKeys = new Set(markers.map((marker) => `${marker.timecode}|${marker.name.toLowerCase()}`));
    const aafMarkerKeys = new Set(aafTimeline.markers.map((marker) => `${marker.timecode}|${marker.name.toLowerCase()}`));
    const markerCoverageMismatches = [
      ...markers
        .filter((marker) => !aafMarkerKeys.has(`${marker.timecode}|${marker.name.toLowerCase()}`))
        .map((marker) => `primary only ${marker.timecode} ${marker.name}`),
      ...aafTimeline.markers
        .filter((marker) => !primaryMarkerKeys.has(`${marker.timecode}|${marker.name.toLowerCase()}`))
        .map((marker) => `aaf only ${marker.timecode} ${marker.name}`),
    ];

    if (aafTimeline.markers.length !== markers.length || markerCoverageMismatches.length > 0) {
      issues.push({
        id: `issue-${slugify(jobId)}-aaf-markers`,
        jobId,
        category: "manual-review",
        severity: "warning",
        scope: "markers",
        code: "AAF_MARKER_COVERAGE_MISMATCH",
        title: "AAF marker or locator coverage does not match the primary timeline source",
        description: "AAF marker or locator parsing found coverage differences from the primary timeline source.",
        sourceLocation: "AAF vs FCPXML/XML",
        impact: "Marker exports may need manual review before delivery.",
        recommendedAction: "Keep the FCPXML/XML marker set primary and review extra or missing AAF markers or locators manually.",
        requiresDecision: false,
        affectedItems: markerCoverageMismatches.length > 0
          ? markerCoverageMismatches
          : [`primary markers=${markers.length}`, `aaf markers=${aafTimeline.markers.length}`],
      });
    }
  }

  const missingAafMedia = [...new Set(
    aafTimeline.clipEvents
      .filter((clipEvent) => {
        if (clipEvent.sourceFileName === "unknown") {
          return false;
        }

        const asset = findAssetByName(assets, clipEvent.sourceFileName);
        return !asset || asset.status === "missing";
      })
      .map((clipEvent) => clipEvent.sourceFileName),
  )];

  if (missingAafMedia.length > 0) {
    issues.push({
      id: `issue-${slugify(jobId)}-aaf-media`,
      jobId,
      category: "manual-review",
      severity: "critical",
      scope: "intake",
      code: "AAF_EXPECTED_MEDIA_MISSING",
      title: "AAF references media that is missing from intake",
      description: "Structured AAF parsing found source file references that are not present in the intake bundle.",
      sourceLocation: "AAF clip list",
      impact: "AAF metadata can enrich the canonical model, but some AAF-referenced media remains offline.",
      recommendedAction: "Supply the missing media or confirm that the AAF references are stale.",
      requiresDecision: true,
      affectedItems: missingAafMedia,
    });
  }

  return issues;
}

function createAafDiagnosticIssues(
  jobId: string,
  aafExtraction: { extractionMode: "direct" | "adapter" | "text" | "unparsed"; adapterPath?: string } | null,
) {
  if (!aafExtraction || aafExtraction.extractionMode !== "adapter") {
    return [] as PreservationIssue[];
  }

  return [{
    id: `issue-${slugify(jobId)}-aaf-adapter-fallback`,
    jobId,
    category: "manual-review",
    severity: "info",
    scope: "intake",
    code: "AAF_ADAPTER_FALLBACK",
    title: "AAF adapter fallback was required",
    description: "Direct in-repo AAF container parsing did not extract this file, so the importer used the compatibility adapter payload instead.",
    sourceLocation: aafExtraction.adapterPath ?? "AAF adapter sidecar",
    impact: "Canonical hydration succeeded, but direct AAF container coverage is incomplete for this file shape.",
    recommendedAction: "Keep the adapter payload available until direct parsing supports this AAF structure natively.",
    requiresDecision: false,
    affectedItems: [aafExtraction.adapterPath ?? "adapter fallback used"],
  } satisfies PreservationIssue];
}

function buildTimelineFromCanonical(
  translationModelId: string,
  timelineId: string,
  name: string,
  fps: FrameRate,
  sampleRate: SampleRate,
  dropFrame: boolean,
  startTimecode: string,
  durationTimecodeOverride: string | undefined,
  tracks: Track[],
  clipEvents: ClipEvent[],
  markers: Marker[],
) {
  const startFrame = timecodeToFrames(startTimecode, fps);
  const maxRecordFrame = clipEvents.reduce((currentMax, clipEvent) => Math.max(currentMax, clipEvent.recordOutFrames), startFrame);
  const durationFrames = durationTimecodeOverride
    ? timecodeToFrames(durationTimecodeOverride, fps)
    : maxRecordFrame > startFrame && startFrame >= 0
      ? maxRecordFrame - startFrame
      : UNKNOWN_FRAME;
  const durationTimecode = durationTimecodeOverride ?? framesToTimecode(durationFrames, fps);

  return {
    id: timelineId,
    translationModelId,
    name,
    fps,
    sampleRate,
    dropFrame,
    startTimecode,
    durationTimecode,
    startFrame,
    durationFrames,
    trackIds: tracks.map((track) => track.id),
    markerIds: markers.map((marker) => marker.id),
  } satisfies Timeline;
}

export function importTurnoverFolderSync(folderPath: string): IntakeImportResult {
  if (!existsSync(folderPath)) {
    throw new Error(`Intake folder does not exist: ${folderPath}`);
  }

  const folderName = basename(folderPath);
  const bundleSlug = slugify(folderName);
  const bundleId = `bundle-${bundleSlug}`;
  const jobId = `job-${bundleSlug}`;
  const translationModelId = `model-${bundleSlug}`;
  const timelineId = `timeline-${bundleSlug}`;
  const deliveryPackageId = `delivery-${bundleSlug}`;

  const scannedAssets = readAllFiles(folderPath).map((filePath) => createIntakeAsset(bundleId, folderPath, filePath));
  const manifestAsset = scannedAssets.find((asset) => asset.fileRole === "intake_manifest");
  const manifest = manifestAsset ? parseManifestText(readFileSync(join(folderPath, manifestAsset.relativePath ?? manifestAsset.name), "utf8")) : undefined;
  const metadataAssets = scannedAssets.filter((asset) => asset.fileRole === "metadata_export" && asset.fileKind === "csv");
  const markerAsset = scannedAssets.find((asset) => asset.fileRole === "marker_export" && asset.fileKind === "csv");
  const edlAsset = scannedAssets.find((asset) => asset.fileKind === "edl");
  const fcpxmlAsset = scannedAssets.find((asset) => asset.fileKind === "fcpxml") ?? scannedAssets.find((asset) => asset.fileKind === "xml");
  const aafAsset = scannedAssets.find((asset) => asset.fileKind === "aaf");
  const metadataRows = metadataAssets.flatMap((asset) => parseMetadataCsvText(readFileSync(join(folderPath, asset.relativePath ?? asset.name), "utf8")));
  const parsedEdl = edlAsset ? parseSimpleEdlText(readFileSync(join(folderPath, edlAsset.relativePath ?? edlAsset.name), "utf8")) : { events: [], markers: [] };
  const markerRows = markerAsset
    ? parseMarkerCsvText(readFileSync(join(folderPath, markerAsset.relativePath ?? markerAsset.name), "utf8"))
    : parsedEdl.markers;

  const expectedFileNames = [...new Set([...(manifest?.expectedFiles ?? []), ...(manifest?.expectedProductionRolls ?? [])])];
  const missingExpectedAssets = expectedFileNames
    .filter((fileName) => !findAssetByName(scannedAssets, fileName))
    .map((fileName) => createMissingAsset(bundleId, fileName));

  const assets = [...scannedAssets, ...missingExpectedAssets].map((asset) => {
    if (asset.fileRole !== "production_audio") {
      return asset;
    }

    const row = metadataRows.find((candidate) => candidate.sourceFileName?.toLowerCase() === asset.name.toLowerCase());
    return {
      ...asset,
      channelCount: row?.channelCount,
      channelLayout: row?.channelLayout,
      sampleRate: 48000,
      isPolyWav: row?.isPolyWav,
      hasBwf: row?.hasBwf,
      hasIXml: row?.hasIXml,
    } satisfies IntakeAsset;
  });

  const fps = coerceFrameRate(manifest?.fps);
  const sampleRate = coerceSampleRate(manifest?.sampleRate);
  const sequenceName = manifest?.sequenceName ?? metadataRows[0]?.timelineName ?? folderName.toUpperCase();
  const bundleName = manifest?.bundleName ?? `${sequenceName}_TURNOVER`;
  const startTimecode = manifest?.startTimecode ?? metadataRows[0]?.recordIn ?? parsedEdl.events[0]?.recordIn ?? UNKNOWN_TIMECODE;
  const parsedTimelineExchange = fcpxmlAsset
    ? parseFcpxmlText(
        readFileSync(join(folderPath, fcpxmlAsset.relativePath ?? fcpxmlAsset.name), "utf8"),
        {
          bundleId,
          translationModelId,
          timelineId,
          fileKind: fcpxmlAsset.fileKind === "xml" ? "xml" : "fcpxml",
          assets,
          fallbackName: sequenceName,
          fallbackFps: fps,
          fallbackSampleRate: sampleRate,
          fallbackStartTimecode: startTimecode,
          fallbackDropFrame: manifest?.dropFrame ?? false,
        },
      )
    : null;
  const extractedAaf = aafAsset
    ? extractAafFromFileSync(
        join(folderPath, aafAsset.relativePath ?? aafAsset.name),
        {
          bundleId,
          translationModelId,
          timelineId,
          assets,
          fallbackName: sequenceName,
          fallbackFps: fps,
          fallbackSampleRate: sampleRate,
          fallbackStartTimecode: startTimecode,
          fallbackDropFrame: manifest?.dropFrame ?? false,
        },
      )
    : null;
  const parsedAaf = extractedAaf?.parsed ?? null;
  const metadataHydration = metadataRows.length > 0 ? hydrateFromMetadataRows(bundleId, timelineId, fps, metadataRows, assets) : null;
  const edlHydration = parsedEdl.events.length > 0 ? createFallbackClipsFromEdl(bundleId, timelineId, fps, parsedEdl.events, assets) : null;

  let primaryHydration: PrimaryHydrationResult;

  if (parsedTimelineExchange) {
    const aafEnrichedTracks = parsedAaf ? enrichTracksFromAaf(parsedTimelineExchange.tracks, parsedAaf.tracks) : parsedTimelineExchange.tracks;
    const aafEnrichedClipEvents = parsedAaf
      ? enrichClipEventsFromAaf(bundleId, parsedTimelineExchange.clipEvents, parsedAaf.clipEvents, assets)
      : parsedTimelineExchange.clipEvents;
    const structuredMarkers = parsedTimelineExchange.markers.length === 0 && parsedAaf && parsedAaf.markers.length > 0
      ? parsedAaf.markers
      : parsedTimelineExchange.markers;
    const enrichedTracks = enrichTracksFromMetadata(aafEnrichedTracks, metadataRows);
    const enrichedClipEvents = enrichClipEventsFromMetadata(bundleId, aafEnrichedClipEvents, metadataRows, assets);
    const mergedMarkers = mergeMarkersWithRows(structuredMarkers, markerRows, parsedTimelineExchange.timeline.fps, timelineId);

    primaryHydration = {
      primarySource: parsedTimelineExchange.source,
      timeline: buildTimelineFromCanonical(
        translationModelId,
        timelineId,
        parsedTimelineExchange.timeline.name,
        parsedTimelineExchange.timeline.fps,
        parsedTimelineExchange.timeline.sampleRate,
        parsedTimelineExchange.timeline.dropFrame,
        parsedTimelineExchange.timeline.startTimecode,
        parsedTimelineExchange.timeline.durationTimecode,
        enrichedTracks,
        enrichedClipEvents,
        mergedMarkers,
      ),
      tracks: enrichedTracks,
      clipEvents: enrichedClipEvents,
      markers: mergedMarkers,
    };
  } else if (parsedAaf) {
    const enrichedTracks = enrichTracksFromMetadata(parsedAaf.tracks, metadataRows);
    const enrichedClipEvents = enrichClipEventsFromMetadata(bundleId, parsedAaf.clipEvents, metadataRows, assets);
    const mergedMarkers = mergeMarkersWithRows(parsedAaf.markers, markerRows, parsedAaf.timeline.fps, timelineId);

    primaryHydration = {
      primarySource: "aaf",
      timeline: buildTimelineFromCanonical(
        translationModelId,
        timelineId,
        parsedAaf.timeline.name,
        parsedAaf.timeline.fps,
        parsedAaf.timeline.sampleRate,
        parsedAaf.timeline.dropFrame,
        parsedAaf.timeline.startTimecode,
        parsedAaf.timeline.durationTimecode,
        enrichedTracks,
        enrichedClipEvents,
        mergedMarkers,
      ),
      tracks: enrichedTracks,
      clipEvents: enrichedClipEvents,
      markers: mergedMarkers,
    };
  } else if (edlHydration) {
    const enrichedClipEvents = enrichClipEventsFromMetadata(bundleId, edlHydration.clipEvents, metadataRows, assets);
    primaryHydration = {
      primarySource: "edl",
      timeline: buildTimelineFromCanonical(
        translationModelId,
        timelineId,
        sequenceName,
        fps,
        sampleRate,
        manifest?.dropFrame ?? false,
        startTimecode,
        manifest?.durationTimecode,
        edlHydration.tracks,
        enrichedClipEvents,
        createMarkers(fps, timelineId, markerRows),
      ),
      tracks: enrichTracksFromMetadata(edlHydration.tracks, metadataRows),
      clipEvents: enrichedClipEvents,
      markers: createMarkers(fps, timelineId, markerRows),
    };
  } else if (metadataHydration) {
    primaryHydration = {
      primarySource: "metadata",
      timeline: buildTimelineFromCanonical(
        translationModelId,
        timelineId,
        sequenceName,
        fps,
        sampleRate,
        manifest?.dropFrame ?? false,
        startTimecode,
        manifest?.durationTimecode,
        metadataHydration.tracks,
        metadataHydration.clipEvents,
        createMarkers(fps, timelineId, markerRows),
      ),
      tracks: metadataHydration.tracks,
      clipEvents: metadataHydration.clipEvents,
      markers: createMarkers(fps, timelineId, markerRows),
    };
  } else {
    primaryHydration = {
      primarySource: "metadata",
      timeline: buildTimelineFromCanonical(
        translationModelId,
        timelineId,
        sequenceName,
        fps,
        sampleRate,
        manifest?.dropFrame ?? false,
        startTimecode,
        manifest?.durationTimecode,
        [],
        [],
        createMarkers(fps, timelineId, markerRows),
      ),
      tracks: [],
      clipEvents: [],
      markers: createMarkers(fps, timelineId, markerRows),
    };
  }

  const reconciliationIssues = createReconciliationIssues(
    jobId,
    primaryHydration.primarySource,
    primaryHydration.tracks,
    primaryHydration.clipEvents,
    primaryHydration.markers,
    metadataRows,
    markerRows,
    assets,
  );
  const aafReconciliationIssues = createAafReconciliationIssues(
    jobId,
    primaryHydration.primarySource,
    primaryHydration.tracks,
    primaryHydration.clipEvents,
    primaryHydration.markers,
    parsedAaf
      ? {
          tracks: parsedAaf.tracks,
          clipEvents: parsedAaf.clipEvents,
          markers: parsedAaf.markers,
        }
      : null,
    assets,
  );
  const aafDiagnosticIssues = createAafDiagnosticIssues(jobId, extractedAaf);
  const tracks = primaryHydration.tracks;
  const clipEvents = primaryHydration.clipEvents;
  const timeline = primaryHydration.timeline;
  const markers = primaryHydration.markers;
  const fieldRecorderCandidates = createFieldRecorderCandidates(jobId, clipEvents, assets);
  const fieldRecorderBlocked = fieldRecorderCandidates.some((candidate) => candidate.status !== "linked");

  const sourceBundle = {
    id: bundleId,
    name: bundleName,
    stage: "intake",
    receivedFrom: "editorial" as const,
    folderPath: normalizeRelativePath(process.cwd(), folderPath),
    sequenceName: timeline.name,
    pictureLock: manifest?.pictureLock ?? true,
    fps: timeline.fps,
    startTimecode: timeline.startTimecode,
    startFrame: timeline.startFrame,
    durationTimecode: timeline.durationTimecode,
    durationFrames: timeline.durationFrames,
    trackCount: tracks.length,
    clipCount: clipEvents.length,
    markerCount: markers.length,
    sampleRate: timeline.sampleRate,
    handlesFrames: manifest?.handlesFrames ?? 12,
    dropFrame: timeline.dropFrame,
    assets,
  } satisfies SourceBundle;

  const analysis = buildAnalysisReport(
    jobId,
    translationModelId,
    timeline.name,
    sourceBundle,
    clipEvents,
    markers,
    fieldRecorderBlocked,
    manifest?.expectedFiles ?? [],
    manifest?.expectedProductionRolls ?? [],
    [...reconciliationIssues, ...aafReconciliationIssues, ...aafDiagnosticIssues],
  );

  const translationModel = {
    id: translationModelId,
    jobId,
    sourceBundleId: sourceBundle.id,
    workflow: "resolve_to_nuendo",
    name: `${timeline.name} Canonical Model`,
    primaryTimelineId: timelineId,
    normalizedTimelineIds: [timelineId],
    analysisReportId: analysis.report.id,
    deliveryPackageId,
  } satisfies TranslationModel;

  const mappingProfile = createMappingProfile(jobId, tracks, clipEvents, fieldRecorderCandidates, timeline);
  const mappingRules = createMappingRules(jobId, tracks, fieldRecorderCandidates);
  const conformChangeEvents = createConformChangeEvents(jobId, parsedEdl.events, fps);

  const job = {
    id: jobId,
    jobCode: manifest?.jobCode ?? sequenceName.slice(0, 8).toUpperCase(),
    title: manifest?.title ?? `${sequenceName} Intake Analysis`,
    status: analysis.report.blockedCount > 0 || analysis.report.highRiskCount > 0 ? "attention" : "validating",
    priority: analysis.report.highRiskCount > 0 ? "high" : "normal",
    workflow: "resolve_to_nuendo",
    sourceBundleId: sourceBundle.id,
    translationModelId,
    deliveryPackageId,
    templateId: manifest?.templateId ?? "tpl-dialogue-premix",
    outputPresetId: manifest?.outputPresetId ?? manifest?.templateId ?? "tpl-dialogue-premix",
    analysisReportId: analysis.report.id,
    createdOn: "2026-03-08",
    updatedOn: "2026-03-08",
    sourceSnapshot: {
      sequenceName: timeline.name,
      clipCount: clipEvents.length,
      trackCount: tracks.length,
      unresolvedMediaCount: clipEvents.filter((clipEvent) => clipEvent.isOffline).length,
      revisionLabel: basename(folderPath),
    },
    mappingSnapshot: {
      mappedTrackCount: tracks.length,
      preservedMetadataCount: clipEvents.filter((clipEvent) => clipEvent.reel && clipEvent.scene && clipEvent.take).length,
      unresolvedCount: analysis.report.summary.operatorDecisionCount,
      fieldRecorderLinkedCount: fieldRecorderCandidates.filter((candidate) => candidate.status === "linked").length,
    },
    notes: "Imported from a real local intake fixture folder. Structured FCPXML/XML and AAF ingestion hydrate the canonical model before delivery planning is generated by exporter.ts. No Nuendo writer is implemented yet.",
  } satisfies TranslationJob;

  return {
    sourceBundle,
    translationModel,
    timeline,
    tracks,
    clipEvents,
    markers,
    analysisReport: analysis.report,
    mappingProfile,
    mappingRules,
    fieldRecorderCandidates,
    conformChangeEvents,
    job,
  };
}

export function importFixtureLibrarySync(rootPath = FIXTURE_ROOT): ImportedIntakeData {
  if (!existsSync(rootPath)) {
    return {
      sourceBundles: [],
      sourceAssets: [],
      translationModels: [],
      timelines: [],
      tracks: [],
      clipEvents: [],
      markers: [],
      analysisReports: [],
      preservationIssues: [],
      mappingProfiles: [],
      mappingRules: [],
      fieldRecorderCandidates: [],
      conformChangeEvents: [],
      jobs: [],
      fieldRecorderWatchlist: [],
    };
  }

  const folderEntries = readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(rootPath, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const imports = folderEntries.map((folderPath) => importTurnoverFolderSync(folderPath));

  return {
    sourceBundles: imports.map((item) => item.sourceBundle),
    sourceAssets: imports.flatMap((item) => item.sourceBundle.assets),
    translationModels: imports.map((item) => item.translationModel),
    timelines: imports.map((item) => item.timeline),
    tracks: imports.flatMap((item) => item.tracks),
    clipEvents: imports.flatMap((item) => item.clipEvents),
    markers: imports.flatMap((item) => item.markers),
    analysisReports: imports.map((item) => item.analysisReport),
    preservationIssues: imports.flatMap((item) => item.analysisReport.groups.flatMap((group) => group.findings)),
    mappingProfiles: imports.map((item) => item.mappingProfile),
    mappingRules: imports.flatMap((item) => item.mappingRules),
    fieldRecorderCandidates: imports.flatMap((item) => item.fieldRecorderCandidates),
    conformChangeEvents: imports.flatMap((item) => item.conformChangeEvents),
    jobs: imports.map((item) => item.job),
    fieldRecorderWatchlist: imports.flatMap((item) =>
      item.fieldRecorderCandidates
        .filter((candidate) => candidate.status !== "linked")
        .map((candidate) => ({
          id: `watch-${slugify(candidate.id)}`,
          clip: item.clipEvents.find((clipEvent) => clipEvent.id === candidate.clipEventId)?.clipName ?? candidate.clipEventId,
          issue: candidate.note,
          fallback: candidate.status === "missing" ? "Keep delivery blocked until the referenced roll exists." : "Manual review remains necessary before field recorder relink can be trusted.",
        })),
    ),
  };
}

export async function importTurnoverFolder(folderPath: string): Promise<IntakeImportResult> {
  return importTurnoverFolderSync(folderPath);
}

export async function importFixtureLibrary(rootPath = FIXTURE_ROOT): Promise<ImportedIntakeData> {
  return importFixtureLibrarySync(rootPath);
}
