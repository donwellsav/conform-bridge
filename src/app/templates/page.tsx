import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { templates } from "@/lib/data-source";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Templates"
        title="Translation policy library"
        description="Reusable routing, metadata, and field recorder presets grounded in real Resolve and Nuendo turnover patterns."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {templates.map((template) => (
          <SectionCard
            key={template.id}
            eyebrow={template.category}
            title={template.name}
            description={template.description}
            aside={<Badge variant={template.fieldRecorderPolicy.enabled ? "accent" : "neutral"}>{template.fieldRecorderPolicy.enabled ? "Field recorder on" : "Field recorder off"}</Badge>}
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-panel p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Track grouping</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{template.trackPolicy.trackGrouping.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Multichannel</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{template.trackPolicy.multichannelMode.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Clip names</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{template.metadataPolicy.clipNameSource.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Destination</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{template.exportDefaults.destinationLabel}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-border/70 bg-panel p-4 text-sm leading-6 text-muted">
              Match keys: {template.fieldRecorderPolicy.matchKeys.join(" -> ")}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

