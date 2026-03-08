import * as fallback from "./mock-data";
import { importFixtureLibrarySync } from "./services/importer";
import type {
  AnalysisReport,
  DeliveryArtifact,
  DeliveryPackage,
  FieldRecorderCandidate,
  MappingProfile,
  SourceBundle,
  Timeline,
  TranslationJob,
} from "./types";

const importedData = importFixtureLibrarySync();
const hasImportedBundles = importedData.sourceBundles.length > 0;

export const dataMode = hasImportedBundles ? "imported" as const : "mock" as const;
export const defaultSettings = fallback.defaultSettings;
export const templates = fallback.templates;
export const outputPresets = fallback.outputPresets;
export const sourceBundles = hasImportedBundles ? importedData.sourceBundles : fallback.sourceBundles;
export const sourceAssets = hasImportedBundles ? importedData.sourceAssets : fallback.sourceAssets;
export const translationModels = hasImportedBundles ? importedData.translationModels : fallback.translationModels;
export const timelines = hasImportedBundles ? importedData.timelines : fallback.timelines;
export const tracks = hasImportedBundles ? importedData.tracks : fallback.tracks;
export const clipEvents = hasImportedBundles ? importedData.clipEvents : fallback.clipEvents;
export const markers = hasImportedBundles ? importedData.markers : fallback.markers;
export const analysisReports = hasImportedBundles ? importedData.analysisReports : fallback.analysisReports;
export const preservationIssues = hasImportedBundles ? importedData.preservationIssues : fallback.preservationIssues;
export const deliveryPackages = hasImportedBundles ? importedData.deliveryPackages : fallback.deliveryPackages;
export const exportArtifacts = hasImportedBundles ? importedData.exportArtifacts : fallback.exportArtifacts;
export const mappingProfiles = hasImportedBundles ? importedData.mappingProfiles : fallback.mappingProfiles;
export const mappingRules = hasImportedBundles ? importedData.mappingRules : fallback.mappingRules;
export const fieldRecorderCandidates = hasImportedBundles ? importedData.fieldRecorderCandidates : fallback.fieldRecorderCandidates;
export const conformChangeEvents = hasImportedBundles ? importedData.conformChangeEvents : fallback.conformChangeEvents;
export const jobs = hasImportedBundles ? importedData.jobs : fallback.jobs;
export const dashboardMetrics = hasImportedBundles ? importedData.dashboardMetrics : fallback.dashboardMetrics;
export const activityFeed = hasImportedBundles ? importedData.activityFeed : fallback.activityFeed;
export const fieldRecorderWatchlist = hasImportedBundles ? importedData.fieldRecorderWatchlist : fallback.fieldRecorderWatchlist;

const bundleMap = new Map(sourceBundles.map((bundle) => [bundle.id, bundle]));
const templateMap = new Map(templates.map((template) => [template.id, template]));
const outputPresetMap = new Map(outputPresets.map((outputPreset) => [outputPreset.id, outputPreset]));
const timelineMap = new Map(timelines.map((timeline) => [timeline.id, timeline]));
const reportMap = new Map(analysisReports.map((report) => [report.id, report]));
const mappingMap = new Map(mappingProfiles.map((profile) => [profile.jobId, profile]));
const deliveryPackageMap = new Map(deliveryPackages.map((deliveryPackage) => [deliveryPackage.id, deliveryPackage]));
const jobMap = new Map(jobs.map((job) => [job.id, job]));
const translationModelMap = new Map(translationModels.map((model) => [model.id, model]));

export function getBundle(bundleId: string): SourceBundle | undefined {
  return bundleMap.get(bundleId);
}

export function getTemplate(templateId?: string) {
  if (!templateId) {
    return undefined;
  }

  return templateMap.get(templateId);
}

export function getOutputPreset(outputPresetId?: string) {
  if (!outputPresetId) {
    return undefined;
  }

  return outputPresetMap.get(outputPresetId);
}

export function getTimeline(timelineId?: string): Timeline | undefined {
  if (!timelineId) {
    return undefined;
  }

  return timelineMap.get(timelineId);
}

export function getTimelineForJob(jobId: string): Timeline | undefined {
  const job = getJob(jobId);

  if (!job) {
    return undefined;
  }

  const translationModel = translationModelMap.get(job.translationModelId);
  if (!translationModel) {
    return undefined;
  }

  return getTimeline(translationModel.primaryTimelineId);
}

export function getJob(jobId: string): TranslationJob | undefined {
  return jobMap.get(jobId);
}

export function getReport(reportId: string): AnalysisReport | undefined {
  return reportMap.get(reportId);
}

export function getMappingProfile(jobId: string): MappingProfile | undefined {
  return mappingMap.get(jobId);
}

export function getDeliveryPackage(deliveryPackageId?: string): DeliveryPackage | undefined {
  if (!deliveryPackageId) {
    return undefined;
  }

  return deliveryPackageMap.get(deliveryPackageId);
}

export function getExportArtifacts(jobId: string): DeliveryArtifact[] {
  const job = getJob(jobId);
  const deliveryPackage = job ? getDeliveryPackage(job.deliveryPackageId) : undefined;

  return deliveryPackage?.artifacts ?? [];
}

export function getAnalysisReportForJob(jobId: string): AnalysisReport | undefined {
  const job = getJob(jobId);
  return job ? getReport(job.analysisReportId) : undefined;
}

export function getFieldRecorderCandidates(jobId: string): FieldRecorderCandidate[] {
  return fieldRecorderCandidates.filter((candidate) => candidate.jobId === jobId);
}
