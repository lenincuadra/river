import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { Star, Waypoints, Plus } from "lucide-react";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  eventSources as eventSourcesTable,
} from "@/db/schema";
import { pendingTriggerFor } from "@/db/mutations";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { StateActions } from "@/components/state-actions";
import { MainComposer } from "@/components/main-composer";
import { BranchCarousel, type Branch } from "@/components/branch-carousel";
import { Feed, FeedActionRow, fmtDate, lastArchivedReason } from "@/components/feed";
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

  // Ramificaciones para el carrusel compartido (misma lógica que los
  // subthreads en la página de thread).
  const branches: Branch[] = topThreads.map((t) => {
    const author = originAuthor(t.origin_entry_id);
    const tEntries = entriesOf(t.id);
    return {
      id: t.id,
      title: t.title,
      state: t.state,
      createdAt: t.created_at,
      href: `/topics/${topic.id}/threads/${t.id}`,
      origin: author ? `desde una entry de ${author}` : undefined,
      entryCount: tEntries.length,
      entries: tEntries.map((e) => ({
        id: e.id,
        author: e.author_label,
        body: e.body,
      })),
      children: subsOf(t.id).map((s) => ({
        id: s.id,
        title: s.title,
        href: `/topics/${topic.id}/threads/${s.id}`,
        state: s.state,
        entryCount: entryCount(s.id),
      })),
    };
  });

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

        {/* Threads: misma lógica de diseño que los subthreads en la página
            de thread — un solo componente (BranchCarousel, UI.md). */}
        <BranchCarousel
          heading="Threads"
          label="Thread"
          branches={branches}
          ctaLabel="Nuevo thread"
          ctaHint="Para el debate que ya no convive en el main"
          dialogTitle="Nuevo thread"
          dialogDescription="Un debate propio del topic, sin entry que lo origine. Tendrá estado y disparador propios. (Para ramificar desde una entry puntual, usá «Crear thread» en esa entry.)"
          submitLabel="Crear thread"
          dialogChildren={
            <>
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
            </>
          }
        />

      </main>
    </div>
  );
}
