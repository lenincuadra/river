import { notFound } from "next/navigation";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  eventSources as eventSourcesTable,
} from "@/db/schema";
import { addEntryAction } from "@/app/actions";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

type EventPayload = {
  version?: string;
  title?: string;
  text?: string;
  reason?: string;
  trigger?: string;
  fire_date?: string;
  condition?: string;
};

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// El main: entries + eventos intercalados en orden cronológico (vocabulario oficial).
export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [topic] = await db
    .select()
    .from(topicsTable)
    .where(eq(topicsTable.id, id));
  if (!topic) notFound();

  const [mainEntries, topicEvents, topicThreads] = await Promise.all([
    db
      .select()
      .from(entriesTable)
      .where(and(eq(entriesTable.topic_id, id), isNull(entriesTable.thread_id))),
    db
      .select()
      .from(eventsTable)
      .where(and(eq(eventsTable.topic_id, id), isNull(eventsTable.thread_id))),
    db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
  ]);

  const decisionIds = topicEvents
    .filter((e) => e.type === "decision")
    .map((e) => e.id);
  const sources = decisionIds.length
    ? await db
        .select()
        .from(eventSourcesTable)
        .where(inArray(eventSourcesTable.event_id, decisionIds))
    : [];
  const threadTitle = (threadId: string) =>
    topicThreads.find((t) => t.id === threadId)?.title ?? "¿?";

  const items = [
    ...mainEntries.map((e) => ({ kind: "entry" as const, date: e.created_at, entry: e })),
    ...topicEvents.map((e) => ({ kind: "event" as const, date: e.created_at, event: e })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const parentThreads = topicThreads.filter((t) => t.parent_thread_id === null);

  return (
    <div className="flex flex-1 flex-col">
      <Topbar currentTopic={{ id: topic.id, title: topic.title }} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{topic.title}</h1>
          <StateBadge state={topic.state} />
          <span className="ml-auto text-xs text-muted-foreground">
            desde {fmtDate(topic.created_at)}
          </span>
        </div>
        {topic.description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {topic.description}
          </p>
        )}
        {parentThreads.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {parentThreads.length}{" "}
              {parentThreads.length === 1 ? "thread" : "threads"}:
            </span>
            {parentThreads.map((t) => (
              <Badge key={t.id} variant="outline" className="text-muted-foreground">
                🧵 {t.title}
              </Badge>
            ))}
            <span>· el board jerárquico llega en la Fase 2</span>
          </div>
        )}

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </h2>

        {/* Gramática GitHub: ícono circular sobre un spine vertical + card */}
        <div className="relative mt-4">
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
                    </div>
                  </div>
                );
              }
              const ev = item.event;
              const p = JSON.parse(ev.payload) as EventPayload;
              const evSources = sources.filter((s) => s.event_id === ev.id);
              const meta: Record<string, { icon: string; className: string; label: string }> = {
                created: { icon: "◉", className: "border-border bg-muted text-foreground", label: "Topic creado" },
                shipped: { icon: "★", className: "border-border bg-muted text-foreground", label: `Shipped ${p.version ?? ""}` },
                snoozed: { icon: "☾", className: "border-border bg-muted text-muted-foreground", label: "Snoozed" },
                awakened: { icon: "☀", className: "border-border bg-muted text-foreground", label: "Despertó" },
                reactivated: { icon: "▶", className: "border-add bg-add/15 text-add", label: "Reactivado" },
                archived: { icon: "▣", className: "border-border bg-muted text-muted-foreground", label: `Archivado${p.reason ? ` · motivo: ${p.reason}` : ""}` },
                decision: { icon: "✓", className: "border-foreground bg-card text-foreground", label: "Decisión" },
                converged_into: { icon: "⇥", className: "border-merge bg-merge/15 text-merge", label: "Convergió" },
                converged_from: { icon: "⇤", className: "border-merge bg-merge/15 text-merge", label: "Recibió convergencia" },
              };
              const m = meta[ev.type];
              return (
                <div key={`ev-${ev.id}`} className="flex gap-3">
                  <span
                    className={`z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border text-sm ${m.className}`}
                  >
                    {m.icon}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="text-sm">
                      <b>{m.label}</b>
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
                        {evSources.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">fuentes:</span>
                            {evSources.map((s) => (
                              <span
                                key={s.id}
                                className="rounded-full border border-src px-2 py-0.5 font-medium text-src"
                              >
                                ◆ {s.source_type === "thread" ? threadTitle(s.source_id) : "entry"}
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

        {/* Agregar entry al main; author_label editable para citar gente */}
        <form
          action={addEntryAction}
          className="mt-8 rounded-lg border border-border bg-card p-4"
        >
          <input type="hidden" name="topic_id" value={topic.id} />
          <div className="flex items-center gap-2">
            <label htmlFor="author_label" className="text-xs text-muted-foreground">
              Autor
            </label>
            <Input
              id="author_label"
              name="author_label"
              defaultValue="Yo"
              className="h-7 w-32 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              (editalo para citar a alguien: &quot;Martina&quot;)
            </span>
          </div>
          <Textarea
            name="body"
            required
            placeholder="Escribir una entry en el main…"
            className="mt-3 min-h-20 text-sm"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm">
              ✎ Agregar entry
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
