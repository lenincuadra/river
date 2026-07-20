import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { GitBranch, Pencil, Plus } from "lucide-react";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
} from "@/db/schema";
import { addThreadEntryAction, createThreadAction } from "@/app/actions";
import { pendingTriggerFor } from "@/db/mutations";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { StateActions } from "@/components/state-actions";
import { FormDialog } from "@/components/form-dialog";
import { SubmitButton } from "@/components/submit-button";
import { Feed, fmtDate, lastArchivedReason } from "@/components/feed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-dynamic";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string; threadId: string }>;
}) {
  const { id, threadId } = await params;
  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.id, threadId));
  if (!thread || thread.topic_id !== id) notFound();

  const [[topic], threadEntries, threadEvents, topicThreads, threadTrigger] =
    await Promise.all([
      db.select().from(topicsTable).where(eq(topicsTable.id, id)),
      db.select().from(entriesTable).where(eq(entriesTable.thread_id, threadId)),
      db.select().from(eventsTable).where(eq(eventsTable.thread_id, threadId)),
      db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
      pendingTriggerFor("thread", threadId),
    ]);
  if (!topic) notFound();

  const isSubthread = thread.parent_thread_id !== null;
  const parent = isSubthread
    ? topicThreads.find((t) => t.id === thread.parent_thread_id)
    : undefined;
  const subs = topicThreads.filter((t) => t.parent_thread_id === thread.id);
  const originEntry = thread.origin_entry_id
    ? (
        await db
          .select()
          .from(entriesTable)
          .where(eq(entriesTable.id, thread.origin_entry_id))
      )[0]
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <Topbar currentTopic={{ id: topic.id, title: topic.title }} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/topics/${topic.id}`} />}>
                {topic.title}
              </BreadcrumbLink>
            </BreadcrumbItem>
            {parent && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={
                      <Link href={`/topics/${topic.id}/threads/${parent.id}`} />
                    }
                    className="inline-flex items-center gap-1"
                  >
                    <GitBranch className="size-3" /> {parent.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{thread.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
            <GitBranch className={isSubthread ? "size-4" : "size-5"} /> {thread.title}
          </h1>
          <StateBadge state={thread.state} />
          <span className="ml-auto text-xs text-muted-foreground">
            desde {fmtDate(thread.created_at)}
          </span>
        </div>

        {originEntry && (
          <div className="mt-3 rounded-lg border border-merge/40 bg-merge/10 px-3.5 py-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-merge">
              <GitBranch className="size-3.5" /> Creado desde una entry de {originEntry.author_label}:
            </span>
            <p className="mt-1 text-muted-foreground">“{originEntry.body}”</p>
          </div>
        )}
        <StateActions
          targetType="thread"
          targetId={thread.id}
          state={thread.state}
          archivedReason={lastArchivedReason(threadEvents)}
          pendingTrigger={threadTrigger}
        />

        <div className="mt-6">
          <Feed entries={threadEntries} events={threadEvents} />
        </div>

        {/* Agregar entry al thread */}
        <form
          action={addThreadEntryAction}
          className="mt-8 rounded-lg border border-border bg-card p-4"
        >
          <input type="hidden" name="thread_id" value={thread.id} />
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
            placeholder={`Escribir una entry en ${thread.title}…`}
            className="mt-3 min-h-20 text-sm"
          />
          <div className="mt-3 flex justify-end">
            <SubmitButton size="sm">
              <Pencil /> Agregar entry
            </SubmitButton>
          </div>
        </form>

        {/* Subthreads: solo desde un thread de primer nivel (regla 5) */}
        {!isSubthread && (
          <>
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Subthreads
            </h2>
            {subs.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Este thread todavía no se ramificó. Cuando dos posturas no
                puedan convivir acá, nace el primer subthread.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {subs.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm"
                  >
                    <Link
                      href={`/topics/${topic.id}/threads/${s.id}`}
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                    >
                      <GitBranch className="size-3" /> {s.title}
                    </Link>
                    <span className="float-right">
                      <StateBadge state={s.state} />
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3">
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
                    <Plus /> Crear subthread
                  </>
                }
                title="Nuevo subthread"
                description="Nivel máximo de profundidad (regla 5): topic → thread → subthread. Acá se separa una postura que ya no convive en el thread."
                submitLabel="Crear subthread"
                action={createThreadAction}
              >
                <input type="hidden" name="topic_id" value={topic.id} />
                <input type="hidden" name="parent_thread_id" value={thread.id} />
                <Field>
                  <FieldLabel htmlFor="new-subthread-title">
                    Título del subthread
                  </FieldLabel>
                  <Input
                    id="new-subthread-title"
                    name="title"
                    required
                    autoFocus
                    placeholder="Título del subthread…"
                    className="text-sm"
                  />
                </Field>
              </FormDialog>
            </div>
          </>
        )}
        {isSubthread && (
          <p className="mt-8 text-xs text-muted-foreground">
            Este es un subthread: nivel máximo de profundidad (topic → thread →
            subthread). Acá no se ramifica más.
          </p>
        )}
      </main>
    </div>
  );
}
