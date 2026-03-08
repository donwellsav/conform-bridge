import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SectionCard } from "@/components/section-card";
import type { FieldRecorderOverrideStatus, MappingAction, MappingProfile, MetadataStatus } from "@/lib/domain";

function actionVariant(action: MappingAction) {
  switch (action) {
    case "preserve":
      return "accent" as const;
    case "remap":
      return "warning" as const;
    case "merge":
      return "neutral" as const;
    case "ignore":
      return "danger" as const;
  }
}

function metadataVariant(status: MetadataStatus) {
  switch (status) {
    case "mapped":
      return "accent" as const;
    case "transformed":
      return "warning" as const;
    case "dropped":
      return "danger" as const;
  }
}

function overrideVariant(status: FieldRecorderOverrideStatus) {
  switch (status) {
    case "linked":
      return "accent" as const;
    case "unresolved":
      return "danger" as const;
    case "ignored":
      return "neutral" as const;
  }
}

export function MappingView({ mapping }: { mapping: MappingProfile }) {
  return (
    <div className="space-y-5">
      <SectionCard
        eyebrow="Timecode policy"
        title="Timeline and event timing"
        description="Static timing policy for the current mock translation job."
        aside={<Badge variant="neutral">{mapping.timecodePolicy.eventStartMode.replaceAll("_", " ")}</Badge>}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Timeline start</p>
            <p className="mt-2 font-mono text-sm text-foreground">{mapping.timecodePolicy.timelineStart}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Pull mode</p>
            <p className="mt-2 text-sm text-foreground">{mapping.timecodePolicy.pullMode}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Drop frame</p>
            <p className="mt-2 text-sm text-foreground">{mapping.timecodePolicy.dropFrame ? "Yes" : "No"}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-panel p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Overrides</p>
            <p className="mt-2 text-sm text-foreground">{mapping.fieldRecorderOverrides.length}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Track mapping" title="Resolve lanes to Nuendo targets" description="Role-aware mapping table with deterministic mock actions.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source track</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Layout</TableHead>
                <TableHead>Target lane</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapping.trackMappings.map((track) => (
                <TableRow key={track.id}>
                  <TableCell className="font-medium">{track.sourceTrack}</TableCell>
                  <TableCell>{track.sourceRole.toUpperCase()}</TableCell>
                  <TableCell>{track.channelLayout}</TableCell>
                  <TableCell>{track.targetLane}</TableCell>
                  <TableCell>
                    <Badge variant={actionVariant(track.action)}>{track.action}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Metadata mapping" title="Editorial fields and transforms" description="Preserved values remain fixed across SSR and hydration.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mapping.metadataMappings.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="uppercase tracking-[0.12em] text-muted">{item.field.replaceAll("_", " ")}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sourceValue}</TableCell>
                  <TableCell className="font-mono text-xs">{item.targetValue}</TableCell>
                  <TableCell>
                    <Badge variant={metadataVariant(item.status)}>{item.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Field recorder" title="Override register" description="Per-field relink overrides for production audio matching.">
        <div className="space-y-3">
          {mapping.fieldRecorderOverrides.map((override) => (
            <div key={override.id} className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-panel-strong/80 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{override.matchField.replaceAll("_", " ")}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {override.sourceValue || "<empty>"}
                  {" -> "}
                  {override.targetValue}
                </p>
              </div>
              <Badge variant={overrideVariant(override.status)}>{override.status}</Badge>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
