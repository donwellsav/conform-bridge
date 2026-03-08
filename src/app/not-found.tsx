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
        description="The route is present, but the requested mock job ID is not part of the current fixture set."
        actions={
          <Button asChild>
            <Link href="/jobs">Return to jobs</Link>
          </Button>
        }
      />
      <SectionCard eyebrow="Mock data" title="Fixture boundary" description="Dynamic job detail pages are generated from the fixed mock registry only.">
        <div className="rounded-2xl border border-border/70 bg-panel p-4 text-sm leading-6 text-muted">
          Add or change job fixtures in the shared mock data registry before expecting additional routes to resolve.
        </div>
      </SectionCard>
    </div>
  );
}
