import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobStatus, TranslationJob } from "@/lib/domain";
import { getBundle, getReport, getTemplate } from "@/lib/data-source";

function statusVariant(status: JobStatus) {
  switch (status) {
    case "ready":
      return "accent" as const;
    case "attention":
      return "danger" as const;
    case "validating":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function JobsTable({ jobs }: { jobs: TranslationJob[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Sequence</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Analysis</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const bundle = getBundle(job.sourceBundleId);
            const template = getTemplate(job.templateId);
            const report = getReport(job.analysisReportId);

            return (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{job.jobCode}</span>
                      <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                    </div>
                    <p className="text-sm text-muted">{job.title}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground">{bundle?.sequenceName ?? job.sourceSnapshot.sequenceName}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">{bundle?.fps ?? "24"} fps</p>
                </TableCell>
                <TableCell>
                  <p>{template?.name ?? "No template"}</p>
                  <p className="text-xs text-muted">{job.mappingSnapshot.mappedTrackCount} track mappings</p>
                </TableCell>
                <TableCell>
                  <p>{report?.summary.totalFindings ?? 0} findings</p>
                  <p className="text-xs text-muted">{report?.highRiskCount ?? 0} high risk / {report?.blockedCount ?? 0} blocked</p>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted">{job.updatedOn}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/jobs/${job.id}`}>Inspect</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

