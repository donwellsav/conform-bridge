import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";
import { defaultSettings, templates } from "@/lib/data-source";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Stable defaults and local persistence"
        description="This is the only route that reads browser storage, and only after mount. The initial render always comes from fixed server defaults."
      />
      <SettingsPanel defaults={defaultSettings} templates={templates} />
    </div>
  );
}

