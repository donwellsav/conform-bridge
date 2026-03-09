import { PageHeader } from "@/components/page-header";
import { ReconformReview } from "@/components/reconform-review";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { getJobReviewContext, jobs, templates } from "@/lib/data-source";

export default function ReconformPage() {
  const reconformTemplate = templates.find((template) => template.category === "reconform") ?? templates[0];
  const job = jobs[0];
  const reviewContext = getJobReviewContext(job.id);

  if (!reviewContext) {
    return null;
  }

  const changeCount = reviewContext.conformChangeEvents.length;
  const movedCount = reviewContext.conformChangeEvents.filter((event) => event.changeType === "move").length;
  const deletedCount = reviewContext.conformChangeEvents.filter((event) => event.changeType === "delete").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ReConform"
        title="Revision compare surface"
        description="Change-event review for revised turnovers, with operator notes derived from imported EDL events when available and deterministic fallback data otherwise."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <ReconformReview context={reviewContext} />

        <SectionCard eyebrow="Template support" title="Revision policy" description="Saved reconform review stays local to the browser. The reconform template still drives delivery-planning assumptions without introducing a writer.">
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{job.sourceSnapshot.revisionLabel} compare</p>
                <p className="mt-1 text-sm text-muted">{job.sourceSnapshot.sequenceName}</p>
              </div>
              <Badge variant="warning">Compare required</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Changed</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{changeCount}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Moved</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{movedCount}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deleted</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{deletedCount}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted">
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Template: <span className="font-semibold text-foreground">{reconformTemplate.name}</span></div>
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Track grouping: {reconformTemplate.trackPolicy.trackGrouping.replaceAll("_", " ")}</div>
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Clip naming: {reconformTemplate.metadataPolicy.clipNameSource.replaceAll("_", " ")}</div>
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Destination: {reconformTemplate.exportDefaults.destinationLabel}</div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}


