import Link from "next/link";

import { JobsTable } from "@/components/jobs-table";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jobs, sourceBundles } from "@/lib/data-source";

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Jobs"
        title="Translation job register"
        description="Current Resolve to Nuendo turnovers with separate intake, canonical, and delivery layers visible from the operator shell."
        actions={
          <Button asChild>
            <Link href="/jobs/new">Create draft job</Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <SectionCard eyebrow="Job list" title="Active turnovers" description="Operator-facing list view with direct access to preservation and mapping detail.">
          <JobsTable jobs={jobs} />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard eyebrow="Intake readiness" title="Intake package inventory" description="Inbound package health drives validation messaging in the wizard and job detail pages.">
            <div className="space-y-3">
              {sourceBundles.map((bundle) => (
                <div key={bundle.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{bundle.sequenceName}</p>
                    <Badge variant={bundle.assets.some((file) => file.status === "missing") ? "warning" : "accent"}>
                      {bundle.assets.some((file) => file.status === "missing") ? "Attention" : "Ready"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{bundle.assets.length} intake assets, {bundle.handlesFrames} frame handles, {bundle.sampleRate} Hz</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard eyebrow="Queue notes" title="Operating assumptions" description="Fixed notes keep the initial view dense and readable without client-only filters.">
            <div className="space-y-3 text-sm leading-6 text-muted">
              <div className="rounded-2xl border border-border/70 bg-panel p-4">All dates are stable fixture strings rather than live timestamps.</div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">Canonical analysis stays separate from raw intake assets and planned delivery artifacts.</div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">Job detail pages combine real intake analysis, canonical review, mapping, and delivery planning without implying export-writer behavior.</div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

