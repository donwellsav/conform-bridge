import type { ReactNode } from "react";

import { AppTopbar } from "@/components/app-topbar";
import { DesktopSidebar } from "@/components/desktop-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1880px] gap-5 px-4 py-4 lg:px-5">
        <DesktopSidebar />
        <div className="min-w-0 flex-1 space-y-5">
          <AppTopbar />
          <main className="min-w-0 rounded-[28px] border border-border/80 bg-panel/80 p-4 shadow-[var(--shadow)] backdrop-blur lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
