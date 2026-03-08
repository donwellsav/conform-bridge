import Link from "next/link";

import { NewJobWizard } from "@/components/new-job-wizard";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { defaultSettings, sourceBundles, templates } from "@/lib/mock-data";

export default function NewJobPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="New job"
        title="Translation wizard"
        description="Structured draft flow for bundle intake, template policy, mapping assumptions, and validation without any live parsing."
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
