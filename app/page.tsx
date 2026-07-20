import Link from "next/link";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
} from "@/db/schema";
import { allPendingTriggers } from "@/db/mutations";
import { isDue } from "@/lib/triggers";
import { Topbar } from "@/components/topbar";
import { ConvergePanel } from "@/components/converge-panel";
import { StateBadge } from "@/components/state-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function monthYear(iso: string) {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function Home() {
  const [topics, threads, entries, events, pendingTriggers] = await Promise.all([
    db.select().from(topicsTable),
    db.select().from(threadsTable),
    db.select().from(entriesTable),
    db.select().from(eventsTable),
    allPendingTriggers(),
  ]);
  const dueCount = pendingTriggers.filter(isDue).length;

  const STATE_ORDER = { active: 0, snoozed: 1, archived: 2 } as const;
  const rows = topics
    .sort(
      (a, b) =>
        STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
        b.created_at.localeCompare(a.created_at)
    )
    .map((topic) => {
    const topicEvents = events.filter((e) => e.topic_id === topic.id);
    // Un topic puede shippearse más de una vez: mostramos la más reciente.
    const shippedVersion = topicEvents
      .filter((e) => e.type === "shipped")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((e) => (JSON.parse(e.payload) as { version?: string }).version)[0] ?? null;
    // Si convergió, guardamos a dónde para poder saltar al destino desde acá.
    const convergedInto = topicEvents
      .filter((e) => e.type === "converged_into")
      .map(
        (e) =>
          JSON.parse(e.payload) as { into_topic_id?: string; into_title?: string }
      )[0];
    return {
      topic,
      threadCount: threads.filter(
        (t) => t.topic_id === topic.id && t.parent_thread_id === null
      ).length,
      entryCount: entries.filter((e) => e.topic_id === topic.id).length,
      decisionCount: topicEvents.filter((e) => e.type === "decision").length,
      shippedVersion,
      convergedInto,
    };
    });

  // Solo los topics vivos (no archivados) pueden ser origen/destino de una
  // convergencia: los archivados ya cerraron su ciclo.
  const convergibles = topics
    .filter((t) => t.state !== "archived")
    .map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        {/* Interpelación de Reentry al abrir la app: lo que hoy venció */}
        {dueCount > 0 && (
          <Link
            href="/reentry"
            className="mb-6 flex items-center gap-3 rounded-lg border border-src bg-src/10 px-4 py-3 text-sm hover:bg-src/15"
          >
            <span className="text-lg">⏰</span>
            <span>
              <b>
                {dueCount} {dueCount === 1 ? "tema despertó" : "temas despertaron"}
              </b>{" "}
              hoy — ¿siguen teniendo sentido?
            </span>
            <span className="ml-auto font-semibold text-src">Revisar →</span>
          </Link>
        )}

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Topics</h1>
          <div className="flex-1" />
          <Link
            href="/topics/new"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            ＋ Nuevo topic
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada topic es una línea de vida: su historial solo crece, nunca se
          reescribe.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {rows.map(({ topic, threadCount, entryCount, decisionCount, shippedVersion, convergedInto }) => (
            <Card key={topic.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    <Link href={`/topics/${topic.id}`} className="hover:underline">
                      {topic.title}
                    </Link>
                  </CardTitle>
                  <StateBadge state={topic.state} />
                  {shippedVersion && (
                    <Badge variant="secondary">★ Shipped {shippedVersion}</Badge>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    activo desde {monthYear(topic.created_at)}
                  </span>
                </div>
                {topic.description && (
                  <CardDescription>{topic.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    <span className="font-semibold text-add">+{entryCount}</span>{" "}
                    entries
                  </span>
                  <span>
                    {threadCount} {threadCount === 1 ? "thread" : "threads"}
                  </span>
                  <span>
                    {decisionCount}{" "}
                    {decisionCount === 1 ? "decisión" : "decisiones"}
                  </span>
                </div>
                {convergedInto?.into_topic_id && (
                  <div className="mt-2 text-xs">
                    <Link
                      href={`/topics/${convergedInto.into_topic_id}`}
                      className="font-medium text-merge hover:underline"
                    >
                      ⇥ convergió en {convergedInto.into_title}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Convergence (Fase 5): unir dos o más topics en uno. */}
        {convergibles.length >= 2 && <ConvergePanel topics={convergibles} />}
      </main>
    </div>
  );
}
