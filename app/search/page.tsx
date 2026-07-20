import Link from "next/link";
import { like, or } from "drizzle-orm";
import { Search, GitBranch } from "lucide-react";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
} from "@/db/schema";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { fmtDate } from "@/components/feed";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

type Topic = typeof topicsTable.$inferSelect;
type Thread = typeof threadsTable.$inferSelect;
type Entry = typeof entriesTable.$inferSelect;

// Fase 6: la respuesta directa a "¿alguien ya mencionó esta idea?". Busca por
// texto en topics (título/descripción), threads (título) y entries (cuerpo +
// autor: así "Martina" encuentra todo lo que citó). LIKE de SQLite es
// case-insensitive para ASCII, alcanza para un solo usuario.
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let topicHits: Topic[] = [];
  let threadHits: Thread[] = [];
  let entryHits: Entry[] = [];
  let topicsById = new Map<string, Topic>();
  let threadsById = new Map<string, Thread>();

  if (query) {
    // Escapar los comodines de LIKE para que se busquen literales.
    const term = `%${query.replace(/[%_\\]/g, "\\$&")}%`;
    const [allTopics, allThreads, tHits, thHits, eHits] = await Promise.all([
      db.select().from(topicsTable),
      db.select().from(threadsTable),
      db
        .select()
        .from(topicsTable)
        .where(
          or(
            like(topicsTable.title, term),
            like(topicsTable.description, term)
          )
        ),
      db.select().from(threadsTable).where(like(threadsTable.title, term)),
      db
        .select()
        .from(entriesTable)
        .where(
          or(
            like(entriesTable.body, term),
            like(entriesTable.author_label, term)
          )
        ),
    ]);
    topicsById = new Map(allTopics.map((t) => [t.id, t]));
    threadsById = new Map(allThreads.map((t) => [t.id, t]));
    topicHits = tHits;
    threadHits = thHits;
    entryHits = eHits;
  }

  // Dónde vive una entry (para linkearla): inbox, main del topic o un thread.
  const entryLocation = (e: Entry) => {
    if (!e.topic_id) return { href: "/inbox", label: "Inbox" };
    const topic = topicsById.get(e.topic_id);
    if (e.thread_id) {
      const thread = threadsById.get(e.thread_id);
      return {
        href: `/topics/${e.topic_id}/threads/${e.thread_id}`,
        label: `${topic?.title ?? "?"} / ${thread?.title ?? "?"}`,
      };
    }
    return { href: `/topics/${e.topic_id}`, label: topic?.title ?? "?" };
  };

  const total = topicHits.length + threadHits.length + entryHits.length;

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
          <Search className="size-5" /> Buscar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ¿Alguien ya mencionó esta idea? Buscá en topics, threads y entries.
        </p>

        <form method="get" className="mt-5 flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Buscar por texto o autor (ej: Martina, contraste…)"
            />
          </InputGroup>
          <Button type="submit">Buscar</Button>
        </form>

        {query && (
          <p className="mt-4 text-xs text-muted-foreground">
            {total} {total === 1 ? "resultado" : "resultados"} para «{query}»
          </p>
        )}

        {query && total === 0 && (
          <Empty className="mt-6 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Nada todavía</EmptyTitle>
              <EmptyDescription>
                Puede que sea la primera vez que aparece: capturá la idea y
                quedará registrada para la próxima búsqueda.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {topicHits.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Topics ({topicHits.length})
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {topicHits.map((t) => (
                <Link
                  key={t.id}
                  href={`/topics/${t.id}`}
                  className="rounded-lg border border-border bg-card px-3.5 py-2.5 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">{t.title}</span>
                    <StateBadge state={t.state} />
                  </div>
                  {t.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {threadHits.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Threads ({threadHits.length})
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {threadHits.map((t) => {
                const topic = topicsById.get(t.topic_id);
                const isSub = t.parent_thread_id !== null;
                return (
                  <Link
                    key={t.id}
                    href={`/topics/${t.topic_id}/threads/${t.id}`}
                    className="rounded-lg border border-border bg-card px-3.5 py-2.5 hover:bg-muted/40"
                  >
                    <div className="text-xs text-muted-foreground">
                      {topic?.title ?? "?"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        <GitBranch className={isSub ? "size-3" : "size-3.5"} /> {t.title}
                      </span>
                      <StateBadge state={t.state} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {entryHits.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Entries ({entryHits.length})
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {entryHits
                .slice()
                .sort((a, b) => b.created_at.localeCompare(a.created_at))
                .map((e) => {
                  const loc = entryLocation(e);
                  return (
                    <Link
                      key={e.id}
                      href={loc.href}
                      className="rounded-lg border border-border bg-card px-3.5 py-2.5 hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {e.author_label}
                        </span>
                        <span>·</span>
                        <span>{loc.label}</span>
                        <span className="ml-auto">{fmtDate(e.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm">{e.body}</p>
                    </Link>
                  );
                })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
