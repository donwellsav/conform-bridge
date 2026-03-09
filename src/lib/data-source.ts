import * as fallback from "./mock-data";
import { planNuendoDeliverySync } from "./services/exporter";
import { importFixtureLibrarySync, type ImportedIntakeData } from "./services/importer";
import type {
  ActivityItem,
  AnalysisReport,
  DashboardMetric,
  DeliveryArtifact,
  DeliveryPackage,
  FieldRecorderCandidate,
  MappingProfile,
  SourceBundle,
  Timeline,
  TranslationJob,
} from "./types";

interface ImportedAppData extends ImportedIntakeData {
  deliveryPackages: DeliveryPackage[];
  exportArtifacts: DeliveryArtifact[];
  dashboardMetrics: DashboardMetric[];
  activityFeed: ActivityItem[];
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createDashboardMetrics(data: ImportedAppData): DashboardMetric[] {
  const blockedArtifacts = data.exportArtifacts.filter((artifact) => artifact.status === "blocked").length;
  const highRiskIssues = data.analysisReports.reduce((total, report) => total + report.highRiskCount, 0);
  const missingInputs = data.sourceAssets.filter((asset) => asset.status === "missing").length;

  return [
    { label: "Intake packages", value: data.sourceBundles.length.toString().padStart(2, "0"), note: "Real fixture folders scanned from disk through the importer pipeline.", tone: "neutral" },
    { label: "Canonical timelines", value: data.timelines.length.toString().padStart(2, "0"), note: "Normalized timelines are hydrated only from formats parsed in this phase.", tone: "accent" },
    { label: "Planned delivery files", value: data.exportArtifacts.length.toString().padStart(2, "0"), note: "Delivery artifacts are planned by exporter.ts from imported intake analysis.", tone: "accent" },
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
          ? `${report.summary.totalFindings} preservation finding(s) were generated from real intake parsing and reconciliation inputs.`
          : "Analysis report could not be generated.",
      },
      {
        id: `activity-${slugify(job.id)}-delivery`,
        timestamp: "2026-03-08 10:16",
        title: `${job.jobCode} exporter plan refreshed`,
        detail: deliveryPackage
          ? `${deliveryPackage.artifacts.filter((artifact) => artifact.status === "blocked").length} exporter-planned delivery artifact(s) remain blocked after canonical analysis.`
          : "Delivery planning remains unavailable.",
      },
    ];
  });
}

function createImportedAppData(): ImportedAppData {
  const importedIntakeData = importFixtureLibrarySync();

  if (importedIntakeData.sourceBundles.length === 0) {
    return {
      ...importedIntakeData,
      deliveryPackages: [],
      exportArtifacts: [],
      dashboardMetrics: [],
      activityFeed: [],
    };
  }

  const deliveryPlans = importedIntakeData.jobs.map((job) => {
    const translationModel = importedIntakeData.translationModels.find((model) => model.id === job.translationModelId);
    const analysisReport = importedIntakeData.analysisReports.find((report) => report.id === job.analysisReportId);
    const mappingProfile = importedIntakeData.mappingProfiles.find((profile) => profile.jobId === job.id);
    const outputPreset = fallback.outputPresets.find((preset) => preset.id === (job.outputPresetId ?? job.templateId));

    if (!translationModel || !analysisReport || !mappingProfile || !outputPreset) {
      throw new Error(`Imported fixture data is incomplete for delivery planning on ${job.id}.`);
    }

    const preservationIssues = importedIntakeData.preservationIssues.filter((issue) => issue.jobId === job.id);

    return planNuendoDeliverySync(
      job,
      translationModel,
      outputPreset,
      analysisReport,
      mappingProfile,
      preservationIssues,
    );
  });

  const data: ImportedAppData = {
    ...importedIntakeData,
    deliveryPackages: deliveryPlans.map((plan) => plan.deliveryPackage),
    exportArtifacts: deliveryPlans.flatMap((plan) => plan.exportArtifacts),
    dashboardMetrics: [],
    activityFeed: [],
  };

  data.dashboardMetrics = createDashboardMetrics(data);
  data.activityFeed = createActivityFeed(data);

  return data;
}

const importedData = createImportedAppData();
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
