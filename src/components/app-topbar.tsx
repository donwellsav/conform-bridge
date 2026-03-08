import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-4 rounded-[26px] border border-border/80 bg-panel/95 px-5 py-4 shadow-[var(--shadow)] backdrop-blur xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Conform Bridge</p>
        <h1 className="mt-2 text-lg font-semibold tracking-[0.01em] text-foreground">Resolve to Nuendo translation rack</h1>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex min-w-[260px] items-center justify-between rounded-2xl border border-border/70 bg-panel-strong px-4 py-3 text-sm text-muted">
          <span>Phase 1 scaffold only</span>
          <Badge variant="accent">SSR safe</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/jobs">Jobs</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/jobs/new">New Job</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
