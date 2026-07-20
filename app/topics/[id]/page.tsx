import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { Star, Waypoints, GitBranch, Pencil } from "lucide-react";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  eventSources as eventSourcesTable,
} from "@/db/schema";
import { addEntryAction, createThreadAction } from "@/app/actions";
import { pendingTriggerFor } from "@/db/mutations";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { StateActions } from "@/components/state-actions";
import { ShipAction } from "@/components/ship-action";
import { DecisionForm } from "@/components/decision-form";
import { FormDialog } from "@/components/form-dialog";
import { SubmitButton } from "@/components/submit-button";
import { Feed, fmtDate, lastArchivedReason } from "@/components/feed";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
  const sourceLabels: Record<string, string[]> = {};
  for (const s of sources) {
    const label =
      s.source_type === "thread"
        ? (allThreads.find((t) => t.id === s.source_id)?.title ?? "¿?")
        : `entry de ${allEntries.find((e) => e.id === s.source_id)?.author_label ?? "?"}`;
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
          <Link
            href={`/topics/${topic.id}/multiverse`}
            className={`ml-auto ${buttonVariants({ variant: "outline", size: "sm" })} rounded-full text-muted-foreground`}
          >
            <Waypoints /> Multiverso
          </Link>
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
        />
        <ShipAction topicId={topic.id} />

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </h2>
        <div className="mt-4">
          <Feed
            entries={mainEntries}
            events={mainEvents}
            sourceLabels={sourceLabels}
            entryFooter={(e) => (
              <div className="mt-1.5">
                <FormDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-merge hover:text-merge"
                    />
                  }
                  triggerLabel={
                    <>
                      <GitBranch /> Crear thread desde esta entry
                    </>
                  }
                  title="Nuevo thread"
                  description={`Un debate que se ramifica desde la entry de ${e.author_label}. Tendrá estado y disparador propios, independientes del topic.`}
                  submitLabel="Crear thread"
                  action={createThreadAction}
                >
                  <input type="hidden" name="topic_id" value={topic.id} />
                  <input type="hidden" name="origin_entry_id" value={e.id} />
                  <Field>
                    <FieldLabel htmlFor={`thread-title-${e.id}`}>
                      Título del thread
                    </FieldLabel>
                    <Input
                      id={`thread-title-${e.id}`}
                      name="title"
                      required
                      autoFocus
                      placeholder="El debate que se abre acá…"
                      className="text-sm"
                    />
                  </Field>
                </FormDialog>
              </div>
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
            <Label
              htmlFor="author_label"
              className="text-xs text-muted-foreground"
            >
              Autor
            </Label>
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
            <SubmitButton size="sm">
              <Pencil /> Agregar entry
            </SubmitButton>
          </div>
        </form>

        {/* Threads: columnas, cada una un feed propio que crece hacia abajo */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Threads
        </h2>
        {topThreads.length === 0 ? (
          <Empty className="mt-4 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GitBranch className="text-merge" />
              </EmptyMedia>
              <EmptyTitle>Este topic todavía no se ramificó</EmptyTitle>
              <EmptyDescription>
                Cuando un debate no pueda convivir en el main, creá un thread
                desde su entry.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {topThreads.map((t) => {
              const author = originAuthor(t.origin_entry_id);
              const subs = subsOf(t.id);
              return (
                <div key={t.id} className="flex flex-col">
                  <div className="text-xs text-muted-foreground">
                    <span className="mr-1 inline-flex size-6 items-center justify-center rounded-full border border-merge bg-merge/15 text-merge">
                      <GitBranch className="size-3.5" />
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
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        <GitBranch className="size-4" /> {t.title}
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
                              className="inline-flex items-center gap-1 font-semibold hover:underline"
                            >
                              <GitBranch className="size-3" /> {s.title}
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
        <div className="mt-4">
          <FormDialog
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="text-merge hover:text-merge"
              />
            }
            triggerLabel={
              <>
                <GitBranch /> Nuevo thread (sin entry de origen)
              </>
            }
            title="Nuevo thread"
            description="Un debate propio del topic, sin entry que lo origine. Tendrá estado y disparador propios."
            submitLabel="Crear thread"
            action={createThreadAction}
          >
            <input type="hidden" name="topic_id" value={topic.id} />
            <Field>
              <FieldLabel htmlFor="new-thread-title">Título del thread</FieldLabel>
              <Input
                id="new-thread-title"
                name="title"
                required
                autoFocus
                placeholder="Título del thread…"
                className="text-sm"
              />
            </Field>
          </FormDialog>
        </div>

        {/* Decisiones: se registran acá y aparecen en el main con sus fuentes */}
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Decisiones
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La decisión es el pensamiento (qué se resolvió y con qué fundamentos),
          no la ejecución. Queda en el main y linkea sus fuentes.
        </p>
        <DecisionForm
          topicId={topic.id}
          threads={citableThreads}
          entries={citableEntries}
        />
      </main>
    </div>
  );
}
