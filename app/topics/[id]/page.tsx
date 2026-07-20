import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  eventSources as eventSourcesTable,
} from "@/db/schema";
import { addEntryAction, createThreadAction } from "@/app/actions";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { Feed, fmtDate } from "@/components/feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

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

  const [allEntries, allEvents, allThreads] = await Promise.all([
    db.select().from(entriesTable).where(eq(entriesTable.topic_id, id)),
    db.select().from(eventsTable).where(eq(eventsTable.topic_id, id)),
    db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
  ]);

  const mainEntries = allEntries.filter((e) => e.thread_id === null);
  const mainEvents = allEvents.filter((e) => e.thread_id === null);

  // Fuentes citadas por las decisiones del main (event_id → labels)
  const decisionIds = mainEvents
    .filter((e) => e.type === "decision")
    .map((e) => e.id);
  const sources = decisionIds.length
    ? await db
        .select()
        .from(eventSourcesTable)
        .where(inArray(eventSourcesTable.event_id, decisionIds))
    : [];
  const sourceLabels: Record<string, string[]> = {};
  for (const s of sources) {
    const label =
      s.source_type === "thread"
        ? (allThreads.find((t) => t.id === s.source_id)?.title ?? "¿?")
        : "entry";
    (sourceLabels[s.event_id] ??= []).push(label);
  }

  const topThreads = allThreads.filter((t) => t.parent_thread_id === null);
  const subsOf = (threadId: string) =>
    allThreads.filter((t) => t.parent_thread_id === threadId);
  const entryCount = (threadId: string) =>
    allEntries.filter((e) => e.thread_id === threadId).length;
  const originAuthor = (originEntryId: string | null) =>
    originEntryId
      ? allEntries.find((e) => e.id === originEntryId)?.author_label
      : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <Topbar currentTopic={{ id: topic.id, title: topic.title }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
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

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </h2>
        <div className="mt-4">
          <Feed
            entries={mainEntries}
            events={mainEvents}
            sourceLabels={sourceLabels}
            entryFooter={(e) => (
              <details className="mt-1.5">
                <summary className="cursor-pointer text-xs font-medium text-merge">
                  ⑂ Crear thread desde esta entry
                </summary>
                <form action={createThreadAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="topic_id" value={topic.id} />
                  <input type="hidden" name="origin_entry_id" value={e.id} />
                  <Input
                    name="title"
                    required
                    placeholder="Título del thread (el debate que se abre acá)…"
                    className="h-8 text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Crear
                  </Button>
                </form>
              </details>
            )}
          />
        </div>

        {/* Agregar entry al main */}
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

        {/* Threads: columnas, cada una un feed propio que crece hacia abajo */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Threads
        </h2>
        {topThreads.length === 0 ? (
          <div className="mt-4 rounded-lg border border-border bg-card px-6 py-8 text-center text-sm text-muted-foreground">
            Este topic todavía no se ramificó. Cuando un debate no pueda
            convivir en el main, creá un thread desde su entry (⑂).
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topThreads.map((t) => {
              const author = originAuthor(t.origin_entry_id);
              const subs = subsOf(t.id);
              return (
                <div key={t.id} className="flex flex-col">
                  <div className="text-xs text-muted-foreground">
                    <span className="mr-1 inline-flex size-6 items-center justify-center rounded-full border border-merge bg-merge/15 text-merge">
                      ⑂
                    </span>
                    {author ? (
                      <>
                        <b className="text-foreground">Thread</b> desde una entry
                        de {author}
                      </>
                    ) : (
                      <b className="text-foreground">Thread</b>
                    )}
                    <span className="float-right pt-1">{fmtDate(t.created_at)}</span>
                  </div>
                  <div className="mt-2 flex-1 rounded-lg border border-border bg-card p-3.5">
                    <div className="text-sm font-bold">
                      <Link
                        href={`/topics/${topic.id}/threads/${t.id}`}
                        className="hover:underline"
                      >
                        🧵 {t.title}
                      </Link>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-add">
                          +{entryCount(t.id)}
                        </span>{" "}
                        entries
                      </span>
                      <StateBadge state={t.state} />
                    </div>
                    {subs.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                        {subs.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-md border border-border px-2.5 py-2 text-xs"
                          >
                            <Link
                              href={`/topics/${topic.id}/threads/${s.id}`}
                              className="font-semibold hover:underline"
                            >
                              ◦ {s.title}
                            </Link>
                            <span className="ml-2 text-muted-foreground">
                              {entryCount(s.id)}{" "}
                              {entryCount(s.id) === 1 ? "entry" : "entries"}
                            </span>
                            <span className="float-right">
                              <StateBadge state={s.state} />
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Thread sin entry de origen ("creado por mí") */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-merge">
            ⑂ Nuevo thread (sin entry de origen)
          </summary>
          <form action={createThreadAction} className="mt-2 flex max-w-md gap-2">
            <input type="hidden" name="topic_id" value={topic.id} />
            <Input
              name="title"
              required
              placeholder="Título del thread…"
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Crear
            </Button>
          </form>
        </details>
      </main>
    </div>
  );
}
