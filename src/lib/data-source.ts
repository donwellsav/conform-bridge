import * as fallback from "./mock-data";
import { countMappingReviews, getFieldRecorderDecision } from "./mapping-workflow";
import { createImportedReviewSignature, createReviewStateSourceSignature, type ReviewJobContext } from "./review-state";
import { prepareDeliveryExecutionSync } from "./services/delivery-execution";
import { prepareExternalExecutionPackageSync } from "./services/external-execution-package";
import { prepareDeliveryHandoffSync } from "./services/delivery-handoff";
import { createImportedBaseReviewInfluence, prepareDeliveryStagingSync } from "./services/delivery-staging";
import { planNuendoDeliverySync } from "./services/exporter";
import { importFixtureLibrarySync, type ImportedIntakeData } from "./services/importer";
import { buildOperatorValidationIssues, rebuildAnalysisReport } from "./validation";
import type {
  ActivityItem,
  AnalysisReport,
  ClipEvent,
  ConformChangeEvent,
  DashboardMetric,
  DeliveryArtifact,
  DeliveryExecutionPlan,
  ExternalExecutionPackage,
  DeliveryHandoffBundle,
  DeliveryPackage,
  DeliveryStagingBundle,
  FieldRecorderCandidate,
  MappingProfile,
  MappingRule,
  Marker,
  OutputPreset,
  SourceBundle,
  Track,
  Timeline,
  TranslationJob,
  TranslationModel,
} from "./types";

interface ImportedAppData extends ImportedIntakeData {
  deliveryPackages: DeliveryPackage[];
  exportArtifacts: DeliveryArtifact[];
  deliveryExecutionPlans: DeliveryExecutionPlan[];
  deliveryStagingBundles: DeliveryStagingBundle[];
  deliveryHandoffBundles: DeliveryHandoffBundle[];
  externalExecutionPackages: ExternalExecutionPackage[];
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
  const unresolvedMappings = data.jobs.reduce((total, job) => total + job.mappingSnapshot.unresolvedCount, 0);

  return [
    { label: "Intake packages", value: data.sourceBundles.length.toString().padStart(2, "0"), note: "Real fixture folders scanned from disk through the importer pipeline.", tone: "neutral" },
    { label: "Canonical timelines", value: data.timelines.length.toString().padStart(2, "0"), note: "Normalized timelines are hydrated only from formats parsed by the current importer implementation.", tone: "accent" },
    { label: "Planned delivery files", value: data.exportArtifacts.length.toString().padStart(2, "0"), note: "Delivery artifacts are planned by exporter.ts from imported intake analysis.", tone: "accent" },
    { label: "Mapping reviews", value: unresolvedMappings.toString().padStart(2, "0"), note: "Track, metadata, marker, and field recorder mapping decisions still open in the operator workflow.", tone: unresolvedMappings > 0 ? "warning" : "accent" },
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
          ? `${report.summary.totalFindings} preservation finding(s) and ${job.mappingSnapshot.unresolvedCount} mapping review item(s) are currently open.`
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

function getImportedTimelineForModel(data: ImportedIntakeData, translationModel: TranslationModel) {
  return data.timelines.find((candidate) => candidate.id === translationModel.primaryTimelineId);
}

function getImportedClipEventsForTimeline(data: ImportedIntakeData, timelineId: string) {
  return data.clipEvents.filter((candidate) => candidate.timelineId === timelineId);
}

function getImportedMarkersForTimeline(data: ImportedIntakeData, timelineId: string) {
  return data.markers.filter((candidate) => candidate.timelineId === timelineId);
}

function createImportedAppData(): ImportedAppData {
  const importedIntakeData = importFixtureLibrarySync();

  if (importedIntakeData.sourceBundles.length === 0) {
    return {
      ...importedIntakeData,
      deliveryPackages: [],
      exportArtifacts: [],
      deliveryExecutionPlans: [],
      deliveryStagingBundles: [],
      deliveryHandoffBundles: [],
      externalExecutionPackages: [],
      dashboardMetrics: [],
      activityFeed: [],
    };
  }

  const jobRecords = importedIntakeData.jobs.map((job) => {
    const translationModel = importedIntakeData.translationModels.find((model) => model.id === job.translationModelId);
    const baseReport = importedIntakeData.analysisReports.find((report) => report.id === job.analysisReportId);
    const mappingProfile = importedIntakeData.mappingProfiles.find((profile) => profile.jobId === job.id);
    const mappingRuleSet = importedIntakeData.mappingRules.filter((rule) => rule.jobId === job.id);
    const sourceBundle = importedIntakeData.sourceBundles.find((bundle) => bundle.id === job.sourceBundleId);
    const outputPreset = fallback.outputPresets.find((preset) => preset.id === (job.outputPresetId ?? job.templateId));
    const fieldRecorderCandidateSet = importedIntakeData.fieldRecorderCandidates.filter((candidate) => candidate.jobId === job.id);
    const baseIssues = importedIntakeData.preservationIssues.filter((issue) => issue.jobId === job.id);
    const timeline = translationModel ? getImportedTimelineForModel(importedIntakeData, translationModel) : undefined;
    const trackSet = timeline ? importedIntakeData.tracks.filter((track) => track.timelineId === timeline.id) : [];
    const clipEventSet = timeline ? getImportedClipEventsForTimeline(importedIntakeData, timeline.id) : [];
    const markerSet = timeline ? getImportedMarkersForTimeline(importedIntakeData, timeline.id) : [];
    const analysisReport = baseReport;

    if (!translationModel || !analysisReport || !mappingProfile || !outputPreset || !sourceBundle || !timeline) {
      throw new Error(`Imported fixture data is incomplete for delivery planning on ${job.id}.`);
    }

    const provisionalPlan = planNuendoDeliverySync(
      job,
      translationModel,
      outputPreset,
      analysisReport,
      mappingProfile,
      baseIssues,
    );
    const provisionalIssues = buildOperatorValidationIssues({
      job,
      sourceBundle,
      clipEvents: clipEventSet,
      markers: markerSet,
      exportArtifacts: provisionalPlan.exportArtifacts,
      fieldRecorderCandidates: fieldRecorderCandidateSet,
      mappingProfile,
      mappingRules: mappingRuleSet,
      existingIssues: baseIssues,
    });
    const validatedReport = rebuildAnalysisReport(
      analysisReport,
      sourceBundle,
      clipEventSet,
      markerSet,
      provisionalPlan.exportArtifacts,
      provisionalIssues,
      mappingProfile,
      mappingRuleSet,
      fieldRecorderCandidateSet,
    );
    const finalPlan = planNuendoDeliverySync(
      job,
      translationModel,
      outputPreset,
      validatedReport,
      mappingProfile,
      provisionalIssues,
    );
    const finalIssues = buildOperatorValidationIssues({
      job,
      sourceBundle,
      clipEvents: clipEventSet,
      markers: markerSet,
      exportArtifacts: finalPlan.exportArtifacts,
      fieldRecorderCandidates: fieldRecorderCandidateSet,
      mappingProfile,
      mappingRules: mappingRuleSet,
      existingIssues: provisionalIssues.filter((issue) => issue.code !== "DELIVERY_ARTIFACT_BLOCKED"),
    });
    const finalReport = rebuildAnalysisReport(
      validatedReport,
      sourceBundle,
      clipEventSet,
      markerSet,
      finalPlan.exportArtifacts,
      finalIssues,
      mappingProfile,
      mappingRuleSet,
      fieldRecorderCandidateSet,
    );
    const mappingReviews = countMappingReviews(mappingProfile, mappingRuleSet, fieldRecorderCandidateSet);
    const mappedTrackCount = mappingProfile.trackMappings.filter((track) => track.action !== "ignore").length;
    const preservedMetadataCount = mappingProfile.metadataMappings.filter((mapping) => mapping.status === "mapped").length;
    const fieldRecorderLinkedCount = fieldRecorderCandidateSet.filter((candidate) =>
      getFieldRecorderDecision(mappingProfile, candidate) === "linked",
    ).length;
    const jobStatus = finalPlan.exportArtifacts.some((artifact) => artifact.status === "blocked")
      || finalReport.highRiskCount > 0
      || mappingReviews.total > 0
      ? "attention"
      : "ready";
    const jobPriority = finalReport.highRiskCount > 0
      ? "high"
      : mappingReviews.total > 0 || finalReport.warningCount > 0
        ? "normal"
        : "low";
    const updatedJob: TranslationJob = {
      ...job,
      status: jobStatus,
      priority: jobPriority,
      analysisReportId: finalReport.id,
      mappingSnapshot: {
        mappedTrackCount,
        preservedMetadataCount,
        unresolvedCount: mappingReviews.total,
        fieldRecorderLinkedCount,
      },
    };
    const executionPlan = prepareDeliveryExecutionSync({
      job: updatedJob,
      bundle: sourceBundle,
      translationModel,
      timelineName: timeline.name,
      tracks: trackSet,
      clipEvents: clipEventSet,
      markers: markerSet,
      analysisReport: finalReport,
      mappingProfile,
      fieldRecorderCandidates: fieldRecorderCandidateSet,
      preservationIssues: finalIssues,
      deliveryPackage: finalPlan.deliveryPackage,
      exportArtifacts: finalPlan.exportArtifacts,
    });
    const sourceSignature = createReviewStateSourceSignature(updatedJob, sourceBundle, timeline);
    const stagingBundle = prepareDeliveryStagingSync({
      job: updatedJob,
      bundle: sourceBundle,
      deliveryPackage: finalPlan.deliveryPackage,
      exportArtifacts: finalPlan.exportArtifacts,
      executionPlan,
      preservationIssues: finalIssues,
      sourceSignature,
      reviewInfluence: createImportedBaseReviewInfluence(),
    });
    const handoffBundle = prepareDeliveryHandoffSync({
      job: updatedJob,
      bundle: sourceBundle,
      translationModel,
      deliveryPackage: finalPlan.deliveryPackage,
      exportArtifacts: finalPlan.exportArtifacts,
      executionPlan,
      stagingBundle,
      preservationIssues: finalIssues,
      sourceSignature,
      reviewSignature: createImportedReviewSignature(updatedJob.id, sourceSignature),
    });
    const externalExecutionPackage = prepareExternalExecutionPackageSync({
      job: updatedJob,
      bundle: sourceBundle,
      deliveryPackage: finalPlan.deliveryPackage,
      executionPlan,
      stagingBundle,
      handoffBundle,
    });

    return {
      job: updatedJob,
      report: finalReport,
      issues: finalIssues,
      deliveryPackage: finalPlan.deliveryPackage,
      exportArtifacts: finalPlan.exportArtifacts,
      executionPlan,
      stagingBundle,
      handoffBundle,
      externalExecutionPackage,
    };
  });

  const data: ImportedAppData = {
    ...importedIntakeData,
    analysisReports: jobRecords.map((record) => record.report),
    preservationIssues: jobRecords.flatMap((record) => record.issues),
    deliveryPackages: jobRecords.map((record) => record.deliveryPackage),
    exportArtifacts: jobRecords.flatMap((record) => record.exportArtifacts),
    deliveryExecutionPlans: jobRecords.map((record) => record.executionPlan),
    deliveryStagingBundles: jobRecords.map((record) => record.stagingBundle),
    deliveryHandoffBundles: jobRecords.map((record) => record.handoffBundle),
    externalExecutionPackages: jobRecords.map((record) => record.externalExecutionPackage),
    jobs: jobRecords.map((record) => record.job),
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
export const deliveryExecutionPlans = hasImportedBundles ? importedData.deliveryExecutionPlans : [];
export const deliveryStagingBundles = hasImportedBundles ? importedData.deliveryStagingBundles : [];
export const deliveryHandoffBundles = hasImportedBundles ? importedData.deliveryHandoffBundles : [];
export const externalExecutionPackages = hasImportedBundles ? importedData.externalExecutionPackages : [];
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
const deliveryExecutionPlanMap = new Map(deliveryExecutionPlans.map((plan) => [plan.jobId, plan]));
const deliveryStagingBundleMap = new Map(deliveryStagingBundles.map((bundle) => [bundle.jobId, bundle]));
const deliveryHandoffBundleMap = new Map(deliveryHandoffBundles.map((bundle) => [bundle.jobId, bundle]));
const externalExecutionPackageMap = new Map(externalExecutionPackages.map((bundle) => [bundle.jobId, bundle]));
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

export function getTranslationModel(translationModelId?: string): TranslationModel | undefined {
  if (!translationModelId) {
    return undefined;
  }

  return translationModelMap.get(translationModelId);
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

export function getMappingRules(jobId: string): MappingRule[] {
  return mappingRules.filter((rule) => rule.jobId === jobId);
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

export function getDeliveryExecutionPlan(jobId: string): DeliveryExecutionPlan | undefined {
  return deliveryExecutionPlanMap.get(jobId);
}

export function getDeliveryStagingBundle(jobId: string): DeliveryStagingBundle | undefined {
  return deliveryStagingBundleMap.get(jobId);
}

export function getDeliveryHandoffBundle(jobId: string): DeliveryHandoffBundle | undefined {
  return deliveryHandoffBundleMap.get(jobId);
}

export function getExternalExecutionPackage(jobId: string): ExternalExecutionPackage | undefined {
  return externalExecutionPackageMap.get(jobId);
}

export function getAnalysisReportForJob(jobId: string): AnalysisReport | undefined {
  const job = getJob(jobId);
  return job ? getReport(job.analysisReportId) : undefined;
}

export function getFieldRecorderCandidates(jobId: string): FieldRecorderCandidate[] {
  return fieldRecorderCandidates.filter((candidate) => candidate.jobId === jobId);
}

export function getMarkersForJob(jobId: string): Marker[] {
  const timeline = getTimelineForJob(jobId);
  return timeline ? markers.filter((marker) => marker.timelineId === timeline.id) : [];
}

export function getClipEventsForJob(jobId: string): ClipEvent[] {
  const timeline = getTimelineForJob(jobId);
  return timeline ? clipEvents.filter((clipEvent) => clipEvent.timelineId === timeline.id) : [];
}

export function getPreservationIssues(jobId: string) {
  return preservationIssues.filter((issue) => issue.jobId === jobId);
}

export function getConformChangeEvents(jobId: string): ConformChangeEvent[] {
  return conformChangeEvents.filter((event) => event.jobId === jobId);
}

export function getJobReviewContext(jobId: string): ReviewJobContext | undefined {
  const job = getJob(jobId);
  const bundle = job ? getBundle(job.sourceBundleId) : undefined;
  const translationModel = job ? getTranslationModel(job.translationModelId) : undefined;
  const timeline = job ? getTimelineForJob(job.id) : undefined;
  const report = job ? getAnalysisReportForJob(job.id) : undefined;
  const mappingProfile = job ? getMappingProfile(job.id) : undefined;
  const outputPreset = job ? getOutputPreset(job.outputPresetId ?? job.templateId) : undefined;

  if (!job || !bundle || !translationModel || !timeline || !report || !mappingProfile || !outputPreset) {
    return undefined;
  }

  return {
    job,
    bundle,
    translationModel,
    timeline,
    report,
    mappingProfile,
    mappingRules: getMappingRules(job.id),
    markers: getMarkersForJob(job.id),
    clipEvents: getClipEventsForJob(job.id),
    fieldRecorderCandidates: getFieldRecorderCandidates(job.id),
    outputPreset: outputPreset as OutputPreset,
    preservationIssues: getPreservationIssues(job.id),
    conformChangeEvents: getConformChangeEvents(job.id),
    tracks: trackSetForJob(job.id),
  };
}

function trackSetForJob(jobId: string): Track[] {
  const timeline = getTimelineForJob(jobId);
  return timeline ? tracks.filter((track) => track.timelineId === timeline.id) : [];
}

export const reviewJobContexts = jobs.flatMap((job) => {
  const context = getJobReviewContext(job.id);
  return context ? [context] : [];
});
