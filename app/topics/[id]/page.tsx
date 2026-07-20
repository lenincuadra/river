import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { Star, Waypoints, GitBranch, Plus } from "lucide-react";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  eventSources as eventSourcesTable,
} from "@/db/schema";
import { createThreadAction } from "@/app/actions";
import { pendingTriggerFor } from "@/db/mutations";
import { Topbar } from "@/components/topbar";
import { CardLink } from "@/components/card-link";
import { StateBadge } from "@/components/state-badge";
import { StateActions } from "@/components/state-actions";
import { MainComposer } from "@/components/main-composer";
import { FormDialog } from "@/components/form-dialog";
import {
  Feed,
  FeedActionRow,
  TIMELINE_ICON,
  fmtDate,
  lastArchivedReason,
} from "@/components/feed";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const [allEntries, allEvents, allThreads, topicTrigger] = await Promise.all([
    db.select().from(entriesTable).where(eq(entriesTable.topic_id, id)),
    db.select().from(eventsTable).where(eq(eventsTable.topic_id, id)),
    db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
    pendingTriggerFor("topic", id),
  ]);

  const mainEntries = allEntries.filter((e) => e.thread_id === null);
  const mainEvents = allEvents.filter((e) => e.thread_id === null);

  // Un topic puede shippearse más de una vez: mostramos la versión más reciente.
  const shippedVersion = mainEvents
    .filter((e) => e.type === "shipped")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => (JSON.parse(e.payload) as { version?: string }).version)[0];

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
  // Cada fuente citada linkea a su destino: la página del thread, o el ancla
  // de la entry en el main de esta misma página.
  const sourceLinks: Record<string, { label: string; href: string }[]> = {};
  for (const s of sources) {
    const link =
      s.source_type === "thread"
        ? {
            label: allThreads.find((t) => t.id === s.source_id)?.title ?? "¿?",
            href: `/topics/${id}/threads/${s.source_id}`,
          }
        : {
            label: `entry de ${allEntries.find((e) => e.id === s.source_id)?.author_label ?? "?"}`,
            href: `#entry-${s.source_id}`,
          };
    (sourceLinks[s.event_id] ??= []).push(link);
  }

  const topThreads = allThreads.filter((t) => t.parent_thread_id === null);
  const subsOf = (threadId: string) =>
    allThreads.filter((t) => t.parent_thread_id === threadId);
  const entryCount = (threadId: string) =>
    allEntries.filter((e) => e.thread_id === threadId).length;
  // Las entries se ven en esta misma vista (UI.md): abrir el thread es la
  // forma de aislarlo, no la única de leerlo.
  const entriesOf = (threadId: string) =>
    allEntries
      .filter((e) => e.thread_id === threadId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const originAuthor = (originEntryId: string | null) =>
    originEntryId
      ? allEntries.find((e) => e.id === originEntryId)?.author_label
      : undefined;

  // Fuentes citables por una decisión: threads (con sus subthreads debajo) y
  // entries del main. Cualquier combinación de 1..N (river-plan.md §4).
  const citableThreads = topThreads.flatMap((t) => [
    { id: t.id, title: t.title, sub: false },
    ...subsOf(t.id).map((s) => ({ id: s.id, title: s.title, sub: true })),
  ]);
  const citableEntries = mainEntries
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((e) => ({
      id: e.id,
      label: `${e.author_label}: ${e.body.length > 60 ? e.body.slice(0, 60) + "…" : e.body}`,
    }));

  return (
    <div className="flex flex-1 flex-col">
      <Topbar currentTopic={{ id: topic.id, title: topic.title }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{topic.title}</h1>
          <StateBadge state={topic.state} />
          {shippedVersion && (
            <Badge variant="secondary"><Star /> Shipped {shippedVersion}</Badge>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href={`/topics/${topic.id}/multiverse`}
                  className={`ml-auto ${buttonVariants({ variant: "outline", size: "sm" })} rounded-full text-muted-foreground`}
                />
              }
            >
              <Waypoints /> Línea de tiempo
            </TooltipTrigger>
            <TooltipContent>
              Ver el topic completo en el tiempo: el main y cada thread como
              líneas paralelas, con lo dormido en la zona futura
            </TooltipContent>
          </Tooltip>
          <span className="text-xs text-muted-foreground">
            desde {fmtDate(topic.created_at)}
          </span>
        </div>
        {topic.description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {topic.description}
          </p>
        )}
        <StateActions
          targetType="topic"
          targetId={topic.id}
          state={topic.state}
          archivedReason={lastArchivedReason(mainEvents)}
          pendingTrigger={topicTrigger}
          canShip
        />

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </h2>
        <div className="mt-4">
          <Feed
            entries={mainEntries}
            events={mainEvents}
            sourceLinks={sourceLinks}
            mainTopicId={topic.id}
            tail={
              // Un solo empty state al final del timeline: lo próximo es UNA
              // cosa — entry, decisión o thread (UI.md).
              <FeedActionRow
                icon={<Plus className="size-3.5" />}
                iconClassName="border-border bg-muted text-muted-foreground"
              >
                <MainComposer
                  topicId={topic.id}
                  threads={citableThreads}
                  entries={citableEntries}
                />
              </FeedActionRow>
            }
          />
        </div>

        {/* Threads: columnas siempre al lado (nunca apiladas). La línea del
            main sigue hacia abajo hasta el riel; el carrusel cierra con el
            CTA de thread nuevo, del mismo tamaño que una card. */}
        <div className="relative mt-10">
          <span
            aria-hidden
            className="absolute -top-10 left-[11.5px] h-[4.75rem] w-px bg-border"
          />
          <h2 className="pl-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Threads
          </h2>
          <div className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 max-sm:-mx-5 max-sm:scroll-px-5 max-sm:px-5">
            {topThreads.map((t) => {
              const author = originAuthor(t.origin_entry_id);
              const subs = subsOf(t.id);
              const tEntries = entriesOf(t.id);
              return (
                <div
                  key={t.id}
                  className="relative flex w-[85%] shrink-0 snap-center flex-col sm:w-80 sm:snap-start"
                >
                  {/* Riel (wireframe): une este ícono con el del vecino de la
                      derecha (o el CTA final), y baja del ícono a la card. */}
                  <span
                    aria-hidden
                    className="absolute -right-8 left-3 top-3 h-px bg-border"
                  />
                  <span
                    aria-hidden
                    className="absolute left-3 top-3 h-5 w-px bg-border"
                  />
                  <span className={`${TIMELINE_ICON} relative border-merge bg-merge/15 text-merge`}>
                    <GitBranch className="size-3.5" />
                  </span>

                  {/* Card entera clickeable; adentro va todo: qué es, de dónde
                      viene, fecha, y sus entries a la vista. */}
                  <div className="relative mt-2 flex-1 rounded-lg border border-border bg-card p-3.5">
                    <CardLink
                      href={`/topics/${topic.id}/threads/${t.id}`}
                      label={t.title}
                    />
                    <div className="text-xs text-muted-foreground">
                      <b className="text-foreground">Thread</b>
                      {author && <> desde una entry de {author}</>}
                      <span className="float-right">{fmtDate(t.created_at)}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm font-bold">
                      <GitBranch className="size-4" /> {t.title}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-add">
                          +{entryCount(t.id)}
                        </span>{" "}
                        entries
                      </span>
                      <StateBadge state={t.state} />
                    </div>
                    {tEntries.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {tEntries.map((en) => (
                          <div key={en.id} className="line-clamp-3 text-xs">
                            <b>{en.author_label}</b>{" "}
                            <span className="text-muted-foreground">
                              {en.body}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {subs.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {subs.map((s) => (
                          <div
                            key={s.id}
                            className="relative z-[1] rounded-md border border-border bg-card px-2.5 py-2 text-xs"
                          >
                            <CardLink
                              href={`/topics/${topic.id}/threads/${s.id}`}
                              label={s.title}
                            />
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <GitBranch className="size-3" /> {s.title}
                            </span>
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

            {/* Cierre del carrusel: empty state para ramificar, del mismo
                tamaño que un thread. */}
            <div className="relative flex w-[85%] shrink-0 snap-center flex-col sm:w-80 sm:snap-start">
              <span
                aria-hidden
                className="absolute left-3 top-3 h-5 w-px bg-border"
              />
              <span className={`${TIMELINE_ICON} relative border-border bg-muted text-muted-foreground`}>
                <Plus className="size-3.5" />
              </span>
              <div className="mt-2 flex flex-1">
                <FormDialog
                  trigger={
                    <button
                      type="button"
                      className="flex min-h-40 flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card/50 p-4 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    />
                  }
                  triggerLabel={
                    <>
                      <GitBranch className="size-5 text-merge" />
                      <span className="text-sm font-semibold">Nuevo thread</span>
                      <span className="text-xs">
                        Para el debate que ya no convive en el main
                      </span>
                    </>
                  }
                  title="Nuevo thread"
                  description="Un debate propio del topic, sin entry que lo origine. Tendrá estado y disparador propios. (Para ramificar desde una entry puntual, usá «Crear thread» en esa entry.)"
                  submitLabel="Crear thread"
                  action={createThreadAction}
                >
                  <input type="hidden" name="topic_id" value={topic.id} />
                  <Field>
                    <FieldLabel htmlFor="carousel-thread-title">
                      Título del thread
                    </FieldLabel>
                    <Input
                      id="carousel-thread-title"
                      name="title"
                      required
                      autoFocus
                      placeholder="El debate que se abre…"
                      className="text-sm"
                    />
                  </Field>
                </FormDialog>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
