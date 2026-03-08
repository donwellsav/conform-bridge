import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { activityFeed, dashboardMetrics, getBundle, getExportArtifacts, getOutputPreset, jobs } from "@/lib/mock-data";

export default function DashboardPage() {
  const intakeBundle = getBundle(jobs[0].sourceBundleId);
  const outputPreset = getOutputPreset(jobs[2].outputPresetId ?? jobs[2].templateId);
  const plannedArtifacts = getExportArtifacts(jobs[2].id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Resolve intake to Nuendo-ready bundle-out"
        description="Desktop-first operator overview of intake bundles, routing risk, field recorder readiness, and planned output artifacts. All content is deterministic mock data."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/jobs">Open jobs</Link>
            </Button>
            <Button asChild>
              <Link href="/jobs/new">Start new job</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-border/80 bg-panel p-4 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{metric.label}</p>
              <Badge variant={metric.tone === "danger" ? "danger" : metric.tone === "warning" ? "warning" : metric.tone === "accent" ? "accent" : "neutral"}>
                Mock
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{metric.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <SectionCard eyebrow="Intake bundle" title="Current bundle placeholder" description="This panel shows the shape of the Resolve handoff package without parsing any real files.">
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/80 bg-panel-strong p-4">
              <p className="font-semibold text-foreground">{intakeBundle?.sequenceName}</p>
              <p className="mt-2 text-sm text-muted">{intakeBundle?.fps} fps, {intakeBundle?.handlesFrames} frame handles, {intakeBundle?.sampleRate} Hz</p>
            </div>
            {intakeBundle?.sourceFiles.map((asset) => (
              <div key={asset.id} className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-panel p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-foreground">{asset.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{asset.kind.replaceAll("_", " ")} / {asset.sizeLabel}</p>
                </div>
                <Badge variant={asset.status === "missing" ? "danger" : asset.status === "placeholder" ? "warning" : "accent"}>{asset.status}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="Bundle-out placeholder" title="Planned Nuendo package" description={outputPreset ? `Preset: ${outputPreset.name}` : "No output preset selected."} aside={<Badge variant="accent">Frontend only</Badge>}>
            <div className="space-y-3">
              {plannedArtifacts.map((artifact) => (
                <div key={artifact.id} className="rounded-2xl border border-border/80 bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-muted">{artifact.fileName}</p>
                    <Badge variant={artifact.status === "blocked" ? "danger" : artifact.status === "placeholder" ? "warning" : "accent"}>{artifact.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{artifact.note}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Recent activity" title="Operator log" description="Activity items are fixed strings and do not depend on runtime time sources.">
            <div className="space-y-3">
              {activityFeed.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border/80 bg-panel p-4">
                  <p className="font-mono text-xs text-muted">{item.timestamp}</p>
                  <p className="mt-2 font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
