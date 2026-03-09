import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Not found"
        title="The requested turnover does not exist"
        description="The route is present, but the requested job ID is not part of the current imported-or-fallback fixture set."
        actions={
          <Button asChild>
            <Link href="/jobs">Return to jobs</Link>
          </Button>
        }
      />
      <SectionCard eyebrow="Fixture data" title="Fixture boundary" description="Dynamic job detail pages are generated from the current imported fixture library or deterministic fallback registry.">
        <div className="rounded-2xl border border-border/70 bg-panel p-4 text-sm leading-6 text-muted">
          Add or change fixture jobs in the imported fixture library or the fallback registry before expecting additional routes to resolve.
        </div>
      </SectionCard>
    </div>
  );
}
