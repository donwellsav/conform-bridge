import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { conformChangeEvents, jobs, templates } from "@/lib/data-source";

export default function ReconformPage() {
  const reconformTemplate = templates.find((template) => template.category === "reconform") ?? templates[0];
  const job = jobs[0];
  const changeCount = conformChangeEvents.length;
  const movedCount = conformChangeEvents.filter((event) => event.changeType === "move").length;
  const deletedCount = conformChangeEvents.filter((event) => event.changeType === "delete").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ReConform"
        title="Revision compare surface"
        description="Change-event review for revised turnovers, with operator notes derived from imported EDL events when available and deterministic fallback data otherwise."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard eyebrow="Change list" title="Revision events" description="This compare surface previews the work an operator would do before reconforming Nuendo sessions.">
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

          <div className="mt-4 space-y-3">
            {conformChangeEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{event.changeType}</p>
                  <Badge variant={event.changeType === "replace" ? "neutral" : event.changeType === "move" ? "warning" : "accent"}>{event.changeType}</Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-muted">{event.oldTimecode} ({event.oldFrame}) {" -> "} {event.newTimecode} ({event.newFrame})</p>
                <p className="mt-3 text-sm leading-6 text-muted">{event.note}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Template support" title="Revision policy" description="The reconform template is modeled even before any real compare engine exists.">
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


