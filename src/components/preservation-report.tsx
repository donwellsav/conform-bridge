import { AlertTriangle, CheckCircle2, CircleDashed, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/section-card";
import type { PreservationFinding, PreservationReport, Severity } from "@/lib/domain";

function severityVariant(severity: Severity) {
  switch (severity) {
    case "critical":
      return "danger" as const;
    case "warning":
      return "warning" as const;
    case "info":
      return "accent" as const;
  }
}

function SeverityIcon({ severity }: { severity: Severity }) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-danger" />;
    case "warning":
      return <CircleDashed className="h-4 w-4 text-warning" />;
    case "info":
      return <Info className="h-4 w-4 text-accent" />;
  }
}

function FindingCard({ finding }: { finding: PreservationFinding }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-panel-strong/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityIcon severity={finding.severity} />
          <div>
            <p className="font-semibold text-foreground">{finding.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">{finding.code}</p>
          </div>
        </div>
        <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{finding.description}</p>
      <div className="mt-3 grid gap-3 text-sm leading-6 lg:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Impact</p>
          <p className="mt-1 text-foreground">{finding.impact}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Recommendation</p>
          <p className="mt-1 text-foreground">{finding.recommendation}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {finding.affectedItems.map((item) => (
          <span key={item} className="rounded-full border border-border/70 bg-panel px-2 py-1 font-mono text-[11px] text-muted">
            {item}
          </span>
        ))}
      </div>
      {finding.requiresDecision ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <CheckCircle2 className="h-4 w-4" />
          Operator decision required before export stub sign-off.
        </div>
      ) : null}
    </div>
  );
}

export function PreservationReportView({ report }: { report: PreservationReport }) {
  return (
    <SectionCard
      eyebrow="Preservation report"
      title="Translation assumptions and issues"
      description={`Updated ${report.updatedOn}. Findings are grouped by preservation scope for operator review.`}
      aside={<Badge variant={report.summary.criticalCount > 0 ? "danger" : "accent"}>{report.summary.totalFindings} findings</Badge>}
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Critical</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{report.summary.criticalCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Warnings</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{report.summary.warningCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Info</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{report.summary.infoCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Decisions</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{report.summary.operatorDecisionCount}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {report.groups.map((group) => (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">{group.title}</h4>
                <p className="text-xs text-muted">Scope: {group.scope.replaceAll("_", " ")}</p>
              </div>
              <Badge variant="neutral">{group.findings.length} items</Badge>
            </div>
            <div className="space-y-3">
              {group.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
