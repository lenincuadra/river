import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { ThreadIcon } from "@/lib/event-icons";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
} from "@/db/schema";
import { pendingTriggerFor } from "@/db/mutations";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { StateActions } from "@/components/state-actions";
import { ThreadComposer } from "@/components/thread-composer";
import { BranchCarousel, type Branch } from "@/components/branch-carousel";
import { Feed, FeedActionRow, fmtDate, lastArchivedReason } from "@/components/feed";
import { Input } from "@/components/ui/input";
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

  const [[topic], topicEntries, threadEvents, topicThreads, threadTrigger] =
    await Promise.all([
      db.select().from(topicsTable).where(eq(topicsTable.id, id)),
      db.select().from(entriesTable).where(eq(entriesTable.topic_id, id)),
      db.select().from(eventsTable).where(eq(eventsTable.thread_id, threadId)),
      db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
      pendingTriggerFor("thread", threadId),
    ]);
  if (!topic) notFound();

  const isSubthread = thread.parent_thread_id !== null;
  const parent = isSubthread
    ? topicThreads.find((t) => t.id === thread.parent_thread_id)
    : undefined;
  const threadEntries = topicEntries.filter((e) => e.thread_id === threadId);
  const originEntry = thread.origin_entry_id
    ? topicEntries.find((e) => e.id === thread.origin_entry_id)
    : undefined;

  // Las entries de cada subthread se ven acá mismo (design.md §5).
  const entriesOf = (tid: string) =>
    topicEntries
      .filter((e) => e.thread_id === tid)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const subs: Branch[] = topicThreads
    .filter((t) => t.parent_thread_id === thread.id)
    .map((s) => {
      const sEntries = entriesOf(s.id);
      return {
        id: s.id,
        title: s.title,
        state: s.state,
        createdAt: s.created_at,
        href: `/topics/${topic.id}/threads/${s.id}`,
        entryCount: sEntries.length,
        entries: sEntries.map((e) => ({
          id: e.id,
          author: e.author_label,
          body: e.body,
        })),
      };
    });

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
                    <ThreadIcon className="size-3" /> {parent.title}
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
            <ThreadIcon className={isSubthread ? "size-4" : "size-5"} /> {thread.title}
          </h1>
          <StateBadge state={thread.state} />
          <span className="ml-auto text-xs text-muted-foreground">
            desde {fmtDate(thread.created_at)}
          </span>
        </div>

        {originEntry && (
          <div className="mt-3 rounded-lg border border-merge/40 bg-merge/10 px-3.5 py-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-merge">
              <ThreadIcon className="size-3.5" /> Creado desde una entry de {originEntry.author_label}:
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
          <Feed
            entries={threadEntries}
            events={threadEvents}
            tail={
              // Un solo empty state al final del timeline (design.md): lo próximo
              // acá es UNA cosa — entry, o subthread si aún puede ramificarse.
              <FeedActionRow
                icon={<Plus className="size-3.5" />}
                iconClassName="border-dashed border-border bg-muted text-muted-foreground"
              >
                <ThreadComposer
                  topicId={topic.id}
                  threadId={thread.id}
                  threadTitle={thread.title}
                  canBranch={!isSubthread}
                />
              </FeedActionRow>
            }
          />
        </div>

        {/* Subthreads: solo desde un thread de primer nivel (regla 5). Misma
            lógica de diseño que los threads del topic (BranchCarousel). */}
        {!isSubthread && (
          <BranchCarousel
            heading="Subthreads"
            label="Subthread"
            branches={subs}
            ctaLabel="Crear subthread"
            ctaHint="Para la postura que ya no convive en este thread"
            dialogTitle="Nuevo subthread"
            dialogDescription="Nivel máximo de profundidad (regla 5): topic → thread → subthread. Acá se separa una postura que ya no convive en el thread."
            submitLabel="Crear subthread"
            dialogChildren={
              <>
                <input type="hidden" name="topic_id" value={topic.id} />
                <input type="hidden" name="parent_thread_id" value={thread.id} />
                <Field>
                  <FieldLabel htmlFor="carousel-subthread-title">
                    Título del subthread
                  </FieldLabel>
                  <Input
                    id="carousel-subthread-title"
                    name="title"
                    required
                    autoFocus
                    placeholder="La postura que se separa…"
                    className="text-sm"
                  />
                </Field>
              </>
            }
          />
        )}
      </main>
    </div>
  );
}
