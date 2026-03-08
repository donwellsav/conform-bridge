"use client";

import { useSyncExternalStore } from "react";

import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppSettings, TranslationTemplate } from "@/lib/domain";
import { hasStoredSettings, readStoredSettings, subscribeToSettings, writeStoredSettings } from "@/lib/local-settings";

export function SettingsPanel({ defaults, templates }: { defaults: AppSettings; templates: TranslationTemplate[] }) {
  const settings = useSyncExternalStore(
    subscribeToSettings,
    () => readStoredSettings(defaults),
    () => defaults,
  );
  const hydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const stored = useSyncExternalStore(
    subscribeToSettings,
    hasStoredSettings,
    () => false,
  );

  const updateSettings = (updater: (current: AppSettings) => AppSettings) => {
    writeStoredSettings(updater(settings));
  };

  const storageState = !hydrated
    ? "Server defaults"
    : !settings.localPersistenceEnabled
      ? "Persistence disabled for this browser"
      : stored
        ? "Loaded from or persisted to local storage"
        : "Ready to persist after the next change";

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.85fr]">
      <div className="space-y-5">
        <SectionCard eyebrow="Default template" title="Operator routing preset" description="Template choice seeds new job drafts before any local overrides are applied.">
          <div className="grid gap-3 lg:grid-cols-2">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  settings.defaultTemplateId === template.id
                    ? "border-accent/40 bg-accent/10"
                    : "border-border/70 bg-panel hover:border-accent/30"
                }`}
                onClick={() => updateSettings((current) => ({ ...current, defaultTemplateId: template.id }))}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{template.name}</p>
                  <Badge variant="neutral">{template.category}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{template.description}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard eyebrow="Turnover defaults" title="Stable initial values" description="These values define SSR-safe defaults for new jobs before client persistence hydrates.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="block font-semibold text-foreground">Default handles</span>
              <Input
                min={0}
                onChange={(event) =>
                  updateSettings((current) => ({
                    ...current,
                    defaultHandlesFrames: Number(event.target.value) || 0,
                  }))
                }
                type="number"
                value={settings.defaultHandlesFrames}
              />
            </label>
            <div className="space-y-2 text-sm">
              <span className="block font-semibold text-foreground">Report grouping</span>
              <div className="flex gap-2">
                <Button
                  onClick={() => updateSettings((current) => ({ ...current, defaultReportGrouping: "severity" }))}
                  type="button"
                  variant={settings.defaultReportGrouping === "severity" ? "default" : "secondary"}
                >
                  Severity
                </Button>
                <Button
                  onClick={() => updateSettings((current) => ({ ...current, defaultReportGrouping: "scope" }))}
                  type="button"
                  variant={settings.defaultReportGrouping === "scope" ? "default" : "secondary"}
                >
                  Scope
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <button
              className={`rounded-2xl border p-4 text-left transition-colors ${
                settings.defaultReferenceVideo ? "border-accent/40 bg-accent/10" : "border-border/70 bg-panel"
              }`}
              onClick={() => updateSettings((current) => ({ ...current, defaultReferenceVideo: !current.defaultReferenceVideo }))}
              type="button"
            >
              <p className="font-semibold text-foreground">Reference video by default</p>
              <p className="mt-1 text-sm text-muted">{settings.defaultReferenceVideo ? "Enabled" : "Disabled"}</p>
            </button>
            <button
              className={`rounded-2xl border p-4 text-left transition-colors ${
                settings.showDenseTables ? "border-accent/40 bg-accent/10" : "border-border/70 bg-panel"
              }`}
              onClick={() => updateSettings((current) => ({ ...current, showDenseTables: !current.showDenseTables }))}
              type="button"
            >
              <p className="font-semibold text-foreground">Dense tables</p>
              <p className="mt-1 text-sm text-muted">{settings.showDenseTables ? "Enabled" : "Disabled"}</p>
            </button>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Persistence" title="Local browser storage" description="Persistence activates only after hydration so the server render stays deterministic.">
          <button
            className={`w-full rounded-2xl border p-4 text-left transition-colors ${
              settings.localPersistenceEnabled ? "border-accent/40 bg-accent/10" : "border-border/70 bg-panel"
            }`}
            onClick={() => updateSettings((current) => ({ ...current, localPersistenceEnabled: !current.localPersistenceEnabled }))}
            type="button"
          >
            <p className="font-semibold text-foreground">Persist settings in localStorage</p>
            <p className="mt-1 text-sm text-muted">{settings.localPersistenceEnabled ? "Enabled" : "Disabled"}</p>
          </button>
        </SectionCard>
      </div>

      <SectionCard eyebrow="Hydration state" title="Persistence status" description="This panel makes the post-mount persistence boundary explicit.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Current status</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{storageState}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Hydrated</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{hydrated ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning">
            No browser storage is read during the initial SSR pass. Defaults render first, then the client snapshot can supply local overrides.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
