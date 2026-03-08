import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { fieldRecorderWatchlist, mappingProfiles, templates } from "@/lib/mock-data";

export default function FieldRecorderPage() {
  const activeTemplate = templates[0];
  const unresolvedCount = mappingProfiles.flatMap((profile) => profile.fieldRecorderOverrides).filter((item) => item.status === "unresolved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Field recorder"
        title="Production audio linking"
        description="Match-key policy, relink watchlist, and override status for production sound metadata flowing from Resolve into Nuendo prep."
      />

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Match keys</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{activeTemplate.fieldRecorderPolicy.matchKeys.length}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Unresolved</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{unresolvedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Channel assignment</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{activeTemplate.fieldRecorderPolicy.channelAssignment.replaceAll("_", " ")}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Fallback</p>
          <p className="mt-3 text-sm font-semibold text-foreground">{activeTemplate.fieldRecorderPolicy.fallbackBehavior.replaceAll("_", " ")}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard eyebrow="Policy" title="Current default policy" description="Dialogue premix template acts as the reference field recorder configuration for the current scaffold.">
          <div className="space-y-3 text-sm leading-6 text-muted">
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Match keys run in fixed order: {activeTemplate.fieldRecorderPolicy.matchKeys.join(" -> ")}.</div>
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Channel assignment is {activeTemplate.fieldRecorderPolicy.channelAssignment.replaceAll("_", " ")} to make mono editorial lanes explicit in Nuendo.</div>
            <div className="rounded-2xl border border-border/70 bg-panel p-4">Fallback behavior is {activeTemplate.fieldRecorderPolicy.fallbackBehavior.replaceAll("_", " ")} when matching metadata is incomplete.</div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Watchlist" title="Current relink issues" description="Realistic production audio issues are surfaced here before any real BWF scan exists.">
          <div className="space-y-3">
            {fieldRecorderWatchlist.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border/70 bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-muted">{item.clip}</p>
                  <Badge variant={item.issue.includes("Missing") || item.issue.includes("not bundled") ? "warning" : "accent"}>{item.issue}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">Fallback: {item.fallback}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
