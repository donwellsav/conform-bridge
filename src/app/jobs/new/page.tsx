import Link from "next/link";

import { NewJobWizard } from "@/components/new-job-wizard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { dataMode, defaultSettings, sourceBundles, templates } from "@/lib/data-source";

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New job"
        title="Translation wizard"
        description={dataMode === "imported"
          ? "Structured draft flow for bundle intake, template policy, mapping assumptions, and validation using imported local fixture folders."
          : "Structured draft flow for bundle intake, template policy, mapping assumptions, and validation. Deterministic mock data remains the fallback until an intake fixture folder is present."}
        actions={
          <Button asChild variant="secondary">
            <Link href="/jobs">View existing jobs</Link>
          </Button>
        }
      />
      <NewJobWizard bundles={sourceBundles} defaultTemplateId={defaultSettings.defaultTemplateId} templates={templates} />
    </div>
  );
}

