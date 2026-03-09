"use client";

import { useSyncExternalStore } from "react";

import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SourceBundle, TranslationTemplate } from "@/lib/domain";
import type { NewJobDraft } from "@/lib/local-draft";
import { readStoredDraft, subscribeToDraft, writeStoredDraft } from "@/lib/local-draft";
import { useHydrated } from "@/lib/use-hydrated";

const steps = ["Intake", "Template", "Mapping", "Validation"] as const;

export function NewJobWizard({
  bundles,
  templates,
  defaultTemplateId,
}: {
  bundles: SourceBundle[];
  templates: TranslationTemplate[];
  defaultTemplateId: string;
}) {
  const draftDefaults: NewJobDraft = {
    stepIndex: 0,
    selectedBundleId: bundles[0]?.id ?? "",
    selectedTemplateId: defaultTemplateId,
  };

  const draft = useSyncExternalStore(
    subscribeToDraft,
    () => readStoredDraft(draftDefaults),
    () => draftDefaults,
  );
  const hydrated = useHydrated();

  const selectedBundle = bundles.find((bundle) => bundle.id === draft.selectedBundleId) ?? bundles[0];
  const selectedTemplate = templates.find((template) => template.id === draft.selectedTemplateId) ?? templates[0];

  const updateDraft = (updater: (current: NewJobDraft) => NewJobDraft) => {
    writeStoredDraft(updater(draft));
  };

  const nextStep = () => updateDraft((current) => ({ ...current, stepIndex: Math.min(current.stepIndex + 1, steps.length - 1) }));
  const previousStep = () => updateDraft((current) => ({ ...current, stepIndex: Math.max(current.stepIndex - 1, 0) }));

  return (
    <div className="grid gap-5 xl:grid-cols-[1.6fr_0.9fr]">
      <div className="space-y-5">
        <SectionCard eyebrow="Wizard status" title="New translation job" description="Front-end only flow for intake selection, template selection, mapping assumptions, and validation.">
          <div className="grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => (
              <button
                key={step}
                className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                  index === draft.stepIndex
                    ? "border-accent/40 bg-accent/10"
                    : "border-border/70 bg-panel hover:border-accent/30"
                }`}
                onClick={() => updateDraft((current) => ({ ...current, stepIndex: index }))}
                type="button"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{step}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        {draft.stepIndex === 0 ? (
          <SectionCard eyebrow="Source intake" title="Pick an intake package" description="Use imported local fixture folders when available, with stable fallback bundles only when nothing has been scanned yet.">
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <button
                  key={bundle.id}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                    bundle.id === draft.selectedBundleId
                      ? "border-accent/40 bg-accent/10"
                      : "border-border/70 bg-panel hover:border-accent/30"
                  }`}
                  onClick={() => updateDraft((current) => ({ ...current, selectedBundleId: bundle.id }))}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{bundle.sequenceName}</p>
                      <p className="mt-1 text-sm text-muted">{bundle.clipCount} clips, {bundle.trackCount} tracks, {bundle.fps} fps</p>
                      {bundle.folderPath ? (
                        <p className="mt-1 font-mono text-[11px] text-muted">{bundle.folderPath}</p>
                      ) : null}
                    </div>
                    <Badge variant={bundle.pictureLock ? "accent" : "warning"}>{bundle.pictureLock ? "Picture lock" : "Revision pending"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {draft.stepIndex === 1 ? (
          <SectionCard eyebrow="Template selection" title="Choose operator policy" description="Templates define lane grouping, metadata preservation, and field recorder behavior.">
            <div className="grid gap-3 lg:grid-cols-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    template.id === draft.selectedTemplateId
                      ? "border-accent/40 bg-accent/10"
                      : "border-border/70 bg-panel hover:border-accent/30"
                  }`}
                  onClick={() => updateDraft((current) => ({ ...current, selectedTemplateId: template.id }))}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{template.name}</p>
                    <Badge variant="neutral">{template.category}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{template.description}</p>
                </button>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {draft.stepIndex === 2 ? (
          <SectionCard eyebrow="Mapping strategy" title="Preview deterministic mapping defaults" description="The wizard previews current mapping defaults without implying that delivery writing already exists.">
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Track grouping</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedTemplate.trackPolicy.trackGrouping.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Metadata source</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedTemplate.metadataPolicy.clipNameSource.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Field recorder</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{selectedTemplate.fieldRecorderPolicy.enabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </SectionCard>
        ) : null}

        {draft.stepIndex === 3 ? (
          <SectionCard eyebrow="Validation" title="Stable first-pass review" description="Validation is computed from imported intake analysis when available, with deterministic fallback data otherwise.">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Intake assets</p>
                <p className="mt-2 text-sm text-foreground">{selectedBundle.assets.length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Missing items</p>
                <p className="mt-2 text-sm text-foreground">{selectedBundle.assets.filter((file) => file.status === "missing").length}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-panel p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Reference video</p>
                <p className="mt-2 text-sm text-foreground">{selectedTemplate.exportDefaults.includeReferenceVideo ? "Included in delivery plan" : "Skipped in delivery plan"}</p>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <Button onClick={previousStep} type="button" variant="secondary">Back</Button>
          <Button onClick={nextStep} type="button">Next</Button>
        </div>
      </div>

      <SectionCard eyebrow="Draft summary" title="Current job draft" description="This side summary stays stable while the step content changes.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Intake package</p>
            <p className="mt-2 font-semibold text-foreground">{selectedBundle.sequenceName}</p>
            <p className="mt-1 text-sm text-muted">{selectedBundle.startTimecode} start, {selectedBundle.handlesFrames} frame handles</p>
            {selectedBundle.folderPath ? (
              <p className="mt-2 font-mono text-[11px] text-muted">{selectedBundle.folderPath}</p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Template</p>
            <p className="mt-2 font-semibold text-foreground">{selectedTemplate.name}</p>
            <p className="mt-1 text-sm text-muted">{selectedTemplate.exportDefaults.destinationLabel}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Field recorder keys</p>
            <p className="mt-2 text-sm text-foreground">{selectedTemplate.fieldRecorderPolicy.matchKeys.join(" -> ")}</p>
          </div>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm leading-6 text-accent-strong">
            {hydrated
              ? "Draft selection is now persisted locally without changing the deterministic server render."
              : "Initial render uses only fixed props. Local draft persistence activates after hydration."}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
