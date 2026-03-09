import Link from "next/link";
import { notFound } from "next/navigation";

import { MappingView } from "@/components/mapping-view";
import { PageHeader } from "@/components/page-header";
import { PreservationReportView } from "@/components/preservation-report";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBundle,
  getClipEventsForJob,
  getExportArtifacts,
  getFieldRecorderCandidates,
  getJob,
  getMappingProfile,
  getMappingRules,
  getMarkersForJob,
  getOutputPreset,
  getPreservationIssues,
  getReport,
  getTimelineForJob,
  getTranslationModel,
  jobs,
} from "@/lib/data-source";

export function generateStaticParams() {
  return jobs.map((job) => ({ jobId: job.id }));
}

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    notFound();
  }

  const bundle = getBundle(job.sourceBundleId);
  const report = getReport(job.analysisReportId);
  const mapping = getMappingProfile(job.id);
  const mappingRules = getMappingRules(job.id);
  const timeline = getTimelineForJob(job.id);
  const translationModel = getTranslationModel(job.translationModelId);
  const outputPreset = getOutputPreset(job.outputPresetId ?? job.templateId);
  const artifacts = getExportArtifacts(job.id);
  const markers = getMarkersForJob(job.id);
  const clipEvents = getClipEventsForJob(job.id);
  const fieldRecorderCandidates = getFieldRecorderCandidates(job.id);
  const preservationIssues = getPreservationIssues(job.id);

  if (!bundle || !report || !mapping || !timeline || !translationModel || !outputPreset) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={job.jobCode}
        title={job.title}
        description={job.notes}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/jobs">Back to jobs</Link>
            </Button>
            <Button asChild>
              <Link href="/jobs/new">Clone as draft</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Status</p>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-2xl font-semibold text-foreground">{job.status}</p>
            <Badge variant={job.status === "ready" ? "accent" : job.status === "attention" ? "danger" : "warning"}>{job.priority}</Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-border/80 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Canonical timeline</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{timeline.name}</p>
          <p className="mt-2 font-mono text-xs text-muted">{timeline.startTimecode} / {timeline.durationTimecode}</p>
          <p className="mt-2 text-xs text-muted">{timeline.startFrame} start frame / {timeline.durationFrames} frames</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Output preset</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{outputPreset.name}</p>
          <p className="mt-2 text-xs text-muted">{outputPreset.exportDefaults.destinationLabel}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Planned delivery artifacts</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{artifacts.length} items</p>
          <p className="mt-2 text-xs text-muted">Separate from intake assets</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <SectionCard eyebrow="Intake Package" title="Resolve and editorial handoff" description="Inbound assets are listed separately from canonical analysis and delivery planning.">
            <div className="space-y-3 text-sm text-muted">
              {bundle.assets.map((asset) => (
                <div key={asset.id} className="rounded-2xl border border-border/80 bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{asset.name}</p>
                    <Badge variant={asset.status === "missing" ? "danger" : asset.status === "placeholder" ? "warning" : "accent"}>{asset.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{asset.fileRole.replaceAll("_", " ")} / {asset.fileKind} / {asset.origin}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{asset.note}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <PreservationReportView report={report} />
        </div>

        <div className="space-y-5">
          <SectionCard eyebrow="Delivery Package" title="Planned Nuendo outputs" description="Artifacts are listed as exporter-generated delivery outputs only. Intake analysis and validation are real, but no Nuendo writer exists yet.">
            <div className="space-y-3">
              {artifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-border/80 bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
                    <Badge variant={artifact.status === "blocked" ? "danger" : artifact.status === "placeholder" ? "warning" : "accent"}>{artifact.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted">{artifact.fileRole.replaceAll("_", " ")} / {artifact.fileKind}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{artifact.note}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <MappingView
            job={job}
            bundle={bundle}
            translationModel={translationModel}
            timeline={timeline}
            mapping={mapping}
            mappingRules={mappingRules}
            markers={markers}
            clipEvents={clipEvents}
            fieldRecorderCandidates={fieldRecorderCandidates}
            report={report}
            outputPreset={outputPreset}
            preservationIssues={preservationIssues}
          />
        </div>
      </div>
    </div>
  );
}


