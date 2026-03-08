import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

import type {
  ActivityItem,
  AnalysisGroup,
  AnalysisReport,
  AssetOrigin,
  ChannelLayout,
  ClipEvent,
  ConformChangeEvent,
  DashboardMetric,
  DeliveryArtifact,
  DeliveryPackage,
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
  deliveryPackage: DeliveryPackage;
  mappingProfile: MappingProfile;
  mappingRules: MappingRule[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  conformChangeEvents: ConformChangeEvent[];
  job: TranslationJob;
}

export interface ImportedAppData {
  sourceBundles: SourceBundle[];
  sourceAssets: IntakeAsset[];
  translationModels: TranslationModel[];
  timelines: Timeline[];
  tracks: Track[];
  clipEvents: ClipEvent[];
  markers: Marker[];
  analysisReports: AnalysisReport[];
  preservationIssues: PreservationIssue[];
  deliveryPackages: DeliveryPackage[];
  exportArtifacts: DeliveryArtifact[];
  mappingProfiles: MappingProfile[];
  mappingRules: MappingRule[];
  fieldRecorderCandidates: FieldRecorderCandidate[];
  conformChangeEvents: ConformChangeEvent[];
  jobs: TranslationJob[];
  dashboardMetrics: DashboardMetric[];
  activityFeed: ActivityItem[];
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
      clipNotes: "AAF details are not parsed in Phase 2A.",
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

function createDeliveryArtifacts(
  jobId: string,
  deliveryPackageId: string,
  sequenceName: string,
  referenceVideoPresent: boolean,
  fieldRecorderBlocked: boolean,
) {
  const safeSequenceName = sequenceName.replaceAll(" ", "_");

  return [
    {
      id: `artifact-${slugify(jobId)}-nuendo-aaf`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "aaf",
      fileRole: "timeline_exchange",
      fileName: `${safeSequenceName}_NUENDO_READY.aaf`,
      status: "planned",
      note: "Planned Nuendo-ready timeline exchange generated from the canonical model.",
    },
    {
      id: `artifact-${slugify(jobId)}-marker-edl`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "edl",
      fileRole: "marker_export",
      fileName: `${safeSequenceName}_MARKERS.edl`,
      status: "planned",
      note: "Marker EDL projected from imported marker data.",
    },
    {
      id: `artifact-${slugify(jobId)}-marker-csv`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "csv",
      fileRole: "marker_export",
      fileName: `${safeSequenceName}_MARKERS.csv`,
      status: "planned",
      note: "Marker CSV projected from imported marker data.",
    },
    {
      id: `artifact-${slugify(jobId)}-metadata-csv`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "csv",
      fileRole: "metadata_export",
      fileName: `${safeSequenceName}_METADATA.csv`,
      status: "planned",
      note: "Metadata CSV projected from imported clip metadata.",
    },
    {
      id: `artifact-${slugify(jobId)}-manifest`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "json",
      fileRole: "delivery_manifest",
      fileName: "manifest.json",
      status: "planned",
      note: "Delivery manifest summarizing canonical counts and planned artifacts.",
    },
    {
      id: `artifact-${slugify(jobId)}-readme`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "txt",
      fileRole: "delivery_readme",
      fileName: "README_NUENDO_IMPORT.txt",
      status: "planned",
      note: "Import instructions for Nuendo delivery remain planned only in Phase 2A.",
    },
    {
      id: `artifact-${slugify(jobId)}-reference-video`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "mov",
      fileRole: "reference_video",
      fileName: `${safeSequenceName}_REF.mov`,
      status: referenceVideoPresent ? "planned" : "blocked",
      note: referenceVideoPresent
        ? "Reference video can be carried into the delivery package."
        : "Reference video remains blocked because no intake reference file was found.",
    },
    {
      id: `artifact-${slugify(jobId)}-field-recorder-report`,
      deliveryPackageId,
      jobId,
      stage: "delivery",
      origin: "conform-bridge",
      fileKind: "csv",
      fileRole: "field_recorder_report",
      fileName: `${safeSequenceName}_FIELD_RECORDER_REPORT.csv`,
      status: fieldRecorderBlocked ? "blocked" : "planned",
      note: fieldRecorderBlocked
        ? "Field recorder report remains blocked until missing rolls and metadata gaps are resolved."
        : "Field recorder report can be planned from imported production-audio metadata.",
    },
  ] satisfies DeliveryArtifact[];
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
  sourceBundle: SourceBundle,
  clipEvents: ClipEvent[],
  markers: Marker[],
  deliveryArtifacts: DeliveryArtifact[],
  expectedFiles: string[],
  expectedProductionRolls: string[],
) {
  const issues: PreservationIssue[] = [];
  const missingAssets = sourceBundle.assets.filter((asset) => asset.status === "missing");
  const missingExpectedFiles = missingAssets.filter((asset) => expectedFiles.some((expectedFile) => expectedFile.toLowerCase() === asset.name.toLowerCase()) && asset.fileRole !== "production_audio");
  const missingProductionRollAssets = missingAssets.filter((asset) => asset.fileRole === "production_audio" || expectedProductionRolls.some((roll) => roll.toLowerCase() === asset.name.toLowerCase()));
  const unresolvedMetadataClips = clipEvents.filter((clipEvent) => !clipEvent.reel || !clipEvent.tape || !clipEvent.scene || !clipEvent.take);
  const blockedArtifacts = deliveryArtifacts.filter((artifact) => artifact.status === "blocked");
  const fieldReportArtifact = deliveryArtifacts.find((artifact) => artifact.fileRole === "field_recorder_report");

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
      targetArtifactId: fieldReportArtifact?.id,
      targetArtifactName: fieldReportArtifact?.fileName,
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
      targetArtifactId: fieldReportArtifact?.id,
      targetArtifactName: fieldReportArtifact?.fileName,
      recommendedAction: "Complete the missing reel or slate fields in editorial metadata before relying on automated relink logic.",
      requiresDecision: false,
      affectedItems: unresolvedMetadataClips.map((clipEvent) => clipEvent.clipName),
    });
  }

  blockedArtifacts.forEach((artifact, index) => {
    issues.push({
      id: `issue-${slugify(jobId)}-blocked-${index + 1}`,
      jobId,
      category: "manual-review",
      severity: "warning",
      scope: "delivery",
      code: "DELIVERY_ARTIFACT_BLOCKED",
      title: `${artifact.fileName} remains blocked`,
      description: artifact.note,
      sourceLocation: "delivery planning",
      impact: "The canonical model is usable, but the planned Nuendo package is not fully ready for handoff.",
      targetArtifactId: artifact.id,
      targetArtifactName: artifact.fileName,
      recommendedAction: "Resolve the upstream intake issue before enabling this delivery artifact.",
      requiresDecision: false,
      affectedItems: [artifact.fileName],
    });
  });

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
      blockedCount: blockedArtifacts.length,
      intakeCompletenessSummary: missingAssets.length > 0
        ? `Scanned ${sourceBundle.assets.length} intake assets. ${missingAssets.length} expected asset(s) remain missing.`
        : `Scanned ${sourceBundle.assets.length} intake assets. No expected files are currently missing.`,
      deliveryReadinessSummary: blockedArtifacts.length > 0
        ? `${blockedArtifacts.length} delivery artifact(s) remain blocked pending intake cleanup.`
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
  const metadataHydration = metadataRows.length > 0
    ? hydrateFromMetadataRows(bundleId, timelineId, fps, metadataRows, assets)
    : createFallbackClipsFromEdl(bundleId, timelineId, fps, parsedEdl.events, assets);

  const tracks = metadataHydration.tracks;
  const clipEvents = metadataHydration.clipEvents;
  const startFrame = timecodeToFrames(startTimecode, fps);
  const maxRecordFrame = clipEvents.reduce((currentMax, clipEvent) => Math.max(currentMax, clipEvent.recordOutFrames), startFrame);
  const durationFrames = manifest?.durationTimecode
    ? timecodeToFrames(manifest.durationTimecode, fps)
    : maxRecordFrame > startFrame && startFrame >= 0
      ? maxRecordFrame - startFrame
      : UNKNOWN_FRAME;
  const durationTimecode = manifest?.durationTimecode ?? framesToTimecode(durationFrames, fps);
  const markers = createMarkers(fps, timelineId, markerRows);
  const fieldRecorderCandidates = createFieldRecorderCandidates(jobId, clipEvents, assets);
  const fieldRecorderBlocked = fieldRecorderCandidates.some((candidate) => candidate.status !== "linked");
  const referenceVideoPresent = assets.some((asset) => asset.fileRole === "reference_video" && asset.status === "present");
  const deliveryArtifacts = createDeliveryArtifacts(jobId, deliveryPackageId, sequenceName, referenceVideoPresent, fieldRecorderBlocked);

  const sourceBundle = {
    id: bundleId,
    name: bundleName,
    stage: "intake",
    receivedFrom: "editorial" as const,
    folderPath: normalizeRelativePath(process.cwd(), folderPath),
    sequenceName,
    pictureLock: manifest?.pictureLock ?? true,
    fps,
    startTimecode,
    startFrame,
    durationTimecode,
    durationFrames,
    trackCount: tracks.length,
    clipCount: clipEvents.length,
    markerCount: markers.length,
    sampleRate,
    handlesFrames: manifest?.handlesFrames ?? 12,
    dropFrame: manifest?.dropFrame ?? false,
    assets,
  } satisfies SourceBundle;

  const analysis = buildAnalysisReport(
    jobId,
    translationModelId,
    sourceBundle,
    clipEvents,
    markers,
    deliveryArtifacts,
    manifest?.expectedFiles ?? [],
    manifest?.expectedProductionRolls ?? [],
  );

  const translationModel = {
    id: translationModelId,
    jobId,
    sourceBundleId: sourceBundle.id,
    workflow: "resolve_to_nuendo",
    name: `${sequenceName} Canonical Model`,
    primaryTimelineId: timelineId,
    normalizedTimelineIds: [timelineId],
    analysisReportId: analysis.report.id,
    deliveryPackageId,
  } satisfies TranslationModel;

  const timeline = {
    id: timelineId,
    translationModelId,
    name: sequenceName,
    fps,
    sampleRate,
    dropFrame: manifest?.dropFrame ?? false,
    startTimecode,
    durationTimecode,
    startFrame,
    durationFrames,
    trackIds: tracks.map((track) => track.id),
    markerIds: markers.map((marker) => marker.id),
  } satisfies Timeline;

  const deliveryPackage = {
    id: deliveryPackageId,
    jobId,
    stage: "delivery",
    destination: "nuendo",
    outputPresetId: manifest?.outputPresetId ?? manifest?.templateId ?? "tpl-dialogue-premix",
    name: `${sequenceName}_NUENDO_DELIVERY`,
    includeReferenceVideo: referenceVideoPresent,
    includeHandles: true,
    deliverySummary: analysis.report.deliveryReadinessSummary,
    artifacts: deliveryArtifacts,
  } satisfies DeliveryPackage;

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
      sequenceName,
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
    notes: "Imported from a real local intake fixture folder. Delivery planning remains stub-only and no Nuendo writer is implemented yet.",
  } satisfies TranslationJob;

  return {
    sourceBundle,
    translationModel,
    timeline,
    tracks,
    clipEvents,
    markers,
    analysisReport: analysis.report,
    deliveryPackage,
    mappingProfile,
    mappingRules,
    fieldRecorderCandidates,
    conformChangeEvents,
    job,
  };
}

function createDashboardMetrics(data: ImportedAppData): DashboardMetric[] {
  const blockedArtifacts = data.exportArtifacts.filter((artifact) => artifact.status === "blocked").length;
  const highRiskIssues = data.analysisReports.reduce((total, report) => total + report.highRiskCount, 0);
  const missingInputs = data.sourceAssets.filter((asset) => asset.status === "missing").length;

  return [
    { label: "Intake packages", value: data.sourceBundles.length.toString().padStart(2, "0"), note: "Real fixture folders scanned from disk through the importer pipeline.", tone: "neutral" },
    { label: "Canonical timelines", value: data.timelines.length.toString().padStart(2, "0"), note: "Normalized timelines are hydrated only from formats parsed in this phase.", tone: "accent" },
    { label: "Planned delivery files", value: data.exportArtifacts.length.toString().padStart(2, "0"), note: "Delivery artifacts are planned from imported intake analysis, not mock-only placeholders.", tone: "accent" },
    { label: "High-risk issues", value: highRiskIssues.toString().padStart(2, "0"), note: missingInputs > 0 ? `${missingInputs} missing intake asset(s) still affect delivery readiness.` : "No missing intake assets are currently flagged.", tone: blockedArtifacts > 0 ? "danger" : "warning" },
  ];
}

function createActivityFeed(data: ImportedAppData): ActivityItem[] {
  return data.jobs.flatMap((job) => {
    const report = data.analysisReports.find((analysisReport) => analysisReport.jobId === job.id);
    const deliveryPackage = data.deliveryPackages.find((candidate) => candidate.jobId === job.id);
    const bundle = data.sourceBundles.find((candidate) => candidate.id === job.sourceBundleId);

    return [
      {
        id: `activity-${slugify(job.id)}-scan`,
        timestamp: "2026-03-08 10:14",
        title: `${job.jobCode} intake scanned`,
        detail: `${bundle?.folderPath ?? bundle?.name ?? "fixture folder"} was scanned into the canonical translation model.`,
      },
      {
        id: `activity-${slugify(job.id)}-analysis`,
        timestamp: "2026-03-08 10:15",
        title: `${job.jobCode} analysis generated`,
        detail: report
          ? `${report.summary.totalFindings} preservation finding(s) were generated from real CSV, manifest, and EDL inputs.`
          : "Analysis report could not be generated.",
      },
      {
        id: `activity-${slugify(job.id)}-delivery`,
        timestamp: "2026-03-08 10:16",
        title: `${job.jobCode} delivery plan refreshed`,
        detail: deliveryPackage
          ? `${deliveryPackage.artifacts.filter((artifact) => artifact.status === "blocked").length} delivery artifact(s) remain blocked after intake analysis.`
          : "Delivery planning remains unavailable.",
      },
    ];
  });
}

export function importFixtureLibrarySync(rootPath = FIXTURE_ROOT): ImportedAppData {
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
      deliveryPackages: [],
      exportArtifacts: [],
      mappingProfiles: [],
      mappingRules: [],
      fieldRecorderCandidates: [],
      conformChangeEvents: [],
      jobs: [],
      dashboardMetrics: [],
      activityFeed: [],
      fieldRecorderWatchlist: [],
    };
  }

  const folderEntries = readdirSync(rootPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(rootPath, entry.name))
    .sort((left, right) => left.localeCompare(right));

  const imports = folderEntries.map((folderPath) => importTurnoverFolderSync(folderPath));

  const data: ImportedAppData = {
    sourceBundles: imports.map((item) => item.sourceBundle),
    sourceAssets: imports.flatMap((item) => item.sourceBundle.assets),
    translationModels: imports.map((item) => item.translationModel),
    timelines: imports.map((item) => item.timeline),
    tracks: imports.flatMap((item) => item.tracks),
    clipEvents: imports.flatMap((item) => item.clipEvents),
    markers: imports.flatMap((item) => item.markers),
    analysisReports: imports.map((item) => item.analysisReport),
    preservationIssues: imports.flatMap((item) => item.analysisReport.groups.flatMap((group) => group.findings)),
    deliveryPackages: imports.map((item) => item.deliveryPackage),
    exportArtifacts: imports.flatMap((item) => item.deliveryPackage.artifacts),
    mappingProfiles: imports.map((item) => item.mappingProfile),
    mappingRules: imports.flatMap((item) => item.mappingRules),
    fieldRecorderCandidates: imports.flatMap((item) => item.fieldRecorderCandidates),
    conformChangeEvents: imports.flatMap((item) => item.conformChangeEvents),
    jobs: imports.map((item) => item.job),
    dashboardMetrics: [],
    activityFeed: [],
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

  data.dashboardMetrics = createDashboardMetrics(data);
  data.activityFeed = createActivityFeed(data);

  return data;
}

export async function importTurnoverFolder(folderPath: string): Promise<IntakeImportResult> {
  return importTurnoverFolderSync(folderPath);
}

export async function importFixtureLibrary(rootPath = FIXTURE_ROOT): Promise<ImportedAppData> {
  return importFixtureLibrarySync(rootPath);
}
