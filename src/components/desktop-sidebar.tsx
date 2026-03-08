"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  Blend,
  BookTemplate,
  FolderKanban,
  Gauge,
  Settings2,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { title: "Dashboard", href: "/", subtitle: "Queue and intake overview", icon: Gauge },
  { title: "Jobs", href: "/jobs", subtitle: "Current translation register", icon: FolderKanban },
  { title: "New Job", href: "/jobs/new", subtitle: "Operator draft wizard", icon: Workflow },
  { title: "Templates", href: "/templates", subtitle: "Output presets and routing", icon: BookTemplate },
  { title: "Field Recorder", href: "/field-recorder", subtitle: "Matching candidates", icon: AudioLines },
  { title: "ReConform", href: "/reconform", subtitle: "Revision compare", icon: Blend },
  { title: "Settings", href: "/settings", subtitle: "Local operator defaults", icon: Settings2 },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[296px] shrink-0 rounded-[30px] border border-border/80 bg-[#0c1117]/95 p-5 shadow-[var(--shadow)] lg:flex lg:flex-col">
      <div className="border-b border-border/80 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Operator shell</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[0.02em] text-foreground">Dark desktop-first scaffold</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Realistic turnover fixtures, strong placeholders, and no fake backend behavior.</p>
      </div>

      <nav className="mt-5 flex-1 space-y-2">
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-3 py-3 transition-colors",
                active
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-transparent bg-transparent text-muted hover:border-border hover:bg-panel hover:text-foreground",
              )}
            >
              <span className={cn("mt-0.5 rounded-md border p-2", active ? "border-accent/30 bg-panel-strong text-accent" : "border-border bg-panel-strong") }>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted">{item.subtitle}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-border/80 pt-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Mode</p>
          <Badge variant="accent">Frontend only</Badge>
        </div>
        <div className="rounded-2xl border border-border/80 bg-panel p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">No parser. No writer. No backend.</p>
          <p className="mt-2">The scaffold models intake bundles and Nuendo-ready bundle-out placeholders strictly from fixed mock data.</p>
        </div>
      </div>
    </aside>
  );
}
