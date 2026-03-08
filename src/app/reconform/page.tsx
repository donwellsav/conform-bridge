import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { reconformEvents, templates } from "@/lib/mock-data";

export default function ReconformPage() {
  const reconformTemplate = templates.find((template) => template.category === "reconform") ?? templates[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ReConform"
        title="Revision compare surface"
        description="Change-event review for turnovers and revised deliveries, with deterministic mock counts and operator notes."
      />

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard eyebrow="Change list" title="Revision events" description="Mock compare output simulates the work an operator would do before reconforming Nuendo sessions.">
          <div className="space-y-3">
            {reconformEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{event.turnover}</p>
                    <p className="mt-1 text-sm text-muted">{event.sequenceName}</p>
                  </div>
                  <Badge variant="warning">Compare required</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Changed</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{event.changedEvents}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Moved</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{event.movedEvents}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Deleted</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{event.deletedEvents}</p>
                  </div>
                </div>
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
