import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { topics as topicsTable, events as eventsTable } from "@/db/schema";
import { Topbar } from "@/components/topbar";
import { fmtDate } from "@/components/feed";

export const dynamic = "force-dynamic";

// Fase 6: "¿qué se shippeó en cada versión?". Las versiones son del producto
// (regla 6), así que agrupamos los eventos `shipped` por su texto de versión.
// Un topic puede aparecer en más de una versión (v2.0, luego v3.0).
export default async function ShippedPage() {
  const [shippedEvents, allTopics] = await Promise.all([
    db.select().from(eventsTable).where(eq(eventsTable.type, "shipped")),
    db.select().from(topicsTable),
  ]);
  const topicsById = new Map(allTopics.map((t) => [t.id, t]));

  // version → { items: {topicId, title, at}[], latestAt }
  const groups = new Map<
    string,
    { items: { topicId: string; title: string; at: string }[]; latestAt: string }
  >();
  for (const ev of shippedEvents) {
    const version =
      (JSON.parse(ev.payload) as { version?: string }).version ?? "(sin versión)";
    const title = topicsById.get(ev.topic_id)?.title ?? "(topic borrado)";
    const group = groups.get(version) ?? { items: [], latestAt: ev.created_at };
    group.items.push({ topicId: ev.topic_id, title, at: ev.created_at });
    if (ev.created_at > group.latestAt) group.latestAt = ev.created_at;
    groups.set(version, group);
  }

  // Versiones más recientes primero (por el shipped más nuevo de cada una).
  const versions = [...groups.entries()].sort((a, b) =>
    b[1].latestAt.localeCompare(a[1].latestAt)
  );

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="text-xl font-bold tracking-tight">★ Versiones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué se shippeó en cada versión del producto. Shipped es un evento, no
          un estado: un topic acá puede seguir activo o dormido.
        </p>

        {versions.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            Todavía no se shippeó nada. Cuando un topic se concrete, estampá su
            versión con ★ Marcar como Shipped y aparecerá acá.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {versions.map(([version, { items }]) => (
              <section
                key={version}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-bold">{version}</h2>
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "topic" : "topics"}
                  </span>
                </div>
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  {items
                    .slice()
                    .sort((a, b) => b.at.localeCompare(a.at))
                    .map((it, i) => (
                      <div
                        key={`${it.topicId}-${i}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="text-add">★</span>
                        <Link
                          href={`/topics/${it.topicId}`}
                          className="font-medium hover:underline"
                        >
                          {it.title}
                        </Link>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {fmtDate(it.at)}
                        </span>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
