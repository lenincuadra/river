import type { ReactNode } from "react";
import Link from "next/link";
import { Diamond, Merge } from "lucide-react";
import { EVENT_ICON, ENTRY_ICON } from "@/lib/event-icons";
import type { entries as entriesTable, events as eventsTable } from "@/db/schema";

type Entry = typeof entriesTable.$inferSelect;
type Event = typeof eventsTable.$inferSelect;

type EventPayload = {
  version?: string;
  title?: string;
  text?: string;
  reason?: string;
  // Convergence: a dónde convergió este origen / de dónde llegó al destino.
  into_topic_id?: string;
  into_title?: string;
  from?: { topic_id: string; title: string }[];
};

// El motivo del último archivado sale del historial, no de un campo:
// estado ≠ historial (regla 4), el motivo vive en su evento. Un `converged_into`
// también archiva (con motivo autocompletado), así que cuenta como archivado.
export function lastArchivedReason(eventRows: Event[]) {
  const archived = eventRows
    .filter((e) => e.type === "archived" || e.type === "converged_into")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return archived
    ? (JSON.parse(archived.payload) as { reason?: string }).reason
    : undefined;
}

export function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// El ícono de cada tipo vive en lib/event-icons.ts (compartido con Multiverso);
// acá solo el color del círculo y la etiqueta.
const EVENT_META: Record<
  Event["type"],
  { className: string; label: (p: EventPayload) => string }
> = {
  created: { className: "border-border bg-muted text-foreground", label: () => "Creado" },
  shipped: { className: "border-border bg-muted text-foreground", label: (p) => `Shipped ${p.version ?? ""}` },
  snoozed: { className: "border-border bg-muted text-muted-foreground", label: () => "Snoozed" },
  awakened: { className: "border-border bg-muted text-foreground", label: () => "Despertó" },
  reactivated: { className: "border-add bg-add/15 text-add", label: () => "Reactivado" },
  archived: { className: "border-border bg-muted text-muted-foreground", label: (p) => `Archivado${p.reason ? ` · motivo: ${p.reason}` : ""}` },
  decision: { className: "border-foreground bg-card text-foreground", label: () => "Decisión" },
  converged_into: { className: "border-merge bg-merge/15 text-merge", label: () => "Convergió en" },
  converged_from: { className: "border-merge bg-merge/15 text-merge", label: () => "Recibió la convergencia" },
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
                <span className="z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-add bg-add/15 text-add">
                  <ENTRY_ICON className="size-4" />
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
          const Icon = EVENT_ICON[ev.type];
          const labels = sourceLabels[ev.id] ?? [];
          return (
            <div key={`ev-${ev.id}`} className="flex gap-3">
              <span
                className={`z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border ${meta.className}`}
              >
                <Icon className="size-4" />
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
                            className="inline-flex items-center gap-1 rounded-full border border-src px-2 py-0.5 font-medium text-src"
                          >
                            <Diamond className="size-3" /> {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Link de ida: desde el origen archivado hacia el destino. */}
                {ev.type === "converged_into" && p.into_topic_id && (
                  <div className="mt-1.5 text-sm">
                    <Link
                      href={`/topics/${p.into_topic_id}`}
                      className="inline-flex items-center gap-1 font-semibold text-merge hover:underline"
                    >
                      <Merge className="size-3.5" /> {p.into_title}
                    </Link>
                  </div>
                )}
                {/* Link de vuelta: desde el destino hacia cada origen. */}
                {ev.type === "converged_from" && p.from && p.from.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="text-muted-foreground">de:</span>
                    {p.from.map((s) => (
                      <Link
                        key={s.topic_id}
                        href={`/topics/${s.topic_id}`}
                        className="rounded-full border border-merge px-2 py-0.5 text-xs font-medium text-merge hover:bg-merge/10"
                      >
                        {s.title}
                      </Link>
                    ))}
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
