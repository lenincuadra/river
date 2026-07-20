import type { ReactNode } from "react";
import type { entries as entriesTable, events as eventsTable } from "@/db/schema";

type Entry = typeof entriesTable.$inferSelect;
type Event = typeof eventsTable.$inferSelect;

type EventPayload = {
  version?: string;
  title?: string;
  text?: string;
  reason?: string;
};

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

const EVENT_META: Record<
  Event["type"],
  { icon: string; className: string; label: (p: EventPayload) => string }
> = {
  created: { icon: "◉", className: "border-border bg-muted text-foreground", label: () => "Creado" },
  shipped: { icon: "★", className: "border-border bg-muted text-foreground", label: (p) => `Shipped ${p.version ?? ""}` },
  snoozed: { icon: "☾", className: "border-border bg-muted text-muted-foreground", label: () => "Snoozed" },
  awakened: { icon: "☀", className: "border-border bg-muted text-foreground", label: () => "Despertó" },
  reactivated: { icon: "▶", className: "border-add bg-add/15 text-add", label: () => "Reactivado" },
  archived: { icon: "▣", className: "border-border bg-muted text-muted-foreground", label: (p) => `Archivado${p.reason ? ` · motivo: ${p.reason}` : ""}` },
  decision: { icon: "✓", className: "border-foreground bg-card text-foreground", label: () => "Decisión" },
  converged_into: { icon: "⇥", className: "border-merge bg-merge/15 text-merge", label: () => "Convergió" },
  converged_from: { icon: "⇤", className: "border-merge bg-merge/15 text-merge", label: () => "Recibió convergencia" },
};

// La gramática GitHub del wireframe: ícono circular sobre un spine vertical,
// con la card colgando al lado. Entries y eventos intercalados por fecha.
export function Feed({
  entries,
  events,
  sourceLabels = {},
  entryFooter,
}: {
  entries: Entry[];
  events: Event[];
  // labels de las fuentes citadas por cada evento decision (event_id → nombres)
  sourceLabels?: Record<string, string[]>;
  // extra opcional debajo de cada entry (ej: "⑂ Crear thread desde esta entry")
  entryFooter?: (entry: Entry) => ReactNode;
}) {
  const items = [
    ...entries.map((e) => ({ kind: "entry" as const, date: e.created_at, entry: e })),
    ...events.map((e) => ({ kind: "event" as const, date: e.created_at, event: e })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="relative">
      <div className="absolute bottom-4 left-[15px] top-4 w-px bg-border" />
      <div className="flex flex-col gap-5">
        {items.map((item) => {
          if (item.kind === "entry") {
            const e = item.entry;
            return (
              <div key={`en-${e.id}`} className="flex gap-3">
                <span className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-add bg-add/15 text-sm text-add">
                  ✎
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="text-sm">
                    <b>{e.author_label}</b> escribió
                    {e.edited_at && (
                      <span className="text-xs text-muted-foreground"> · editado</span>
                    )}
                    <span className="float-right text-xs text-muted-foreground">
                      {fmtDate(e.created_at)}
                    </span>
                  </div>
                  <div className="mt-1.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
                    {e.body}
                  </div>
                  {entryFooter?.(e)}
                </div>
              </div>
            );
          }

          const ev = item.event;
          const p = JSON.parse(ev.payload) as EventPayload;
          const meta = EVENT_META[ev.type];
          const labels = sourceLabels[ev.id] ?? [];
          return (
            <div key={`ev-${ev.id}`} className="flex gap-3">
              <span
                className={`z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border text-sm ${meta.className}`}
              >
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="text-sm">
                  <b>{meta.label(p)}</b>
                  <span className="float-right text-xs text-muted-foreground">
                    {fmtDate(ev.created_at)}
                  </span>
                </div>
                {ev.type === "decision" && (
                  <div className="mt-1.5 rounded-lg border-2 border-foreground/70 bg-card px-3.5 py-2.5">
                    <div className="text-sm font-bold">{p.title}</div>
                    {p.text && (
                      <div className="mt-1 text-sm text-muted-foreground">{p.text}</div>
                    )}
                    {labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground">fuentes:</span>
                        {labels.map((label, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-src px-2 py-0.5 font-medium text-src"
                          >
                            ◆ {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
