import Link from "next/link";
import { AlarmClock, Star, Plus, Merge, ArrowRight, Waves } from "lucide-react";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

function monthYear(iso: string) {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

type StateKey = "active" | "snoozed" | "archived";
const FILTERS: Array<{ key: StateKey | "all"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "snoozed", label: "Dormidos" },
  { key: "archived", label: "Archivados" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const stateFilter: StateKey | "all" = (
    ["active", "snoozed", "archived"] as const
  ).includes(state as StateKey)
    ? (state as StateKey)
    : "all";

  const [topics, threads, entries, events, pendingTriggers] = await Promise.all([
    db.select().from(topicsTable),
    db.select().from(threadsTable),
    db.select().from(entriesTable),
    db.select().from(eventsTable),
    allPendingTriggers(),
  ]);
  const dueCount = pendingTriggers.filter(isDue).length;

  const counts = {
    all: topics.length,
    active: topics.filter((t) => t.state === "active").length,
    snoozed: topics.filter((t) => t.state === "snoozed").length,
    archived: topics.filter((t) => t.state === "archived").length,
  };

  const STATE_ORDER = { active: 0, snoozed: 1, archived: 2 } as const;
  const rows = topics
    .filter((t) => stateFilter === "all" || t.state === stateFilter)
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
            <AlarmClock className="size-5 text-src" />
            <span>
              <b>
                {dueCount} {dueCount === 1 ? "tema despertó" : "temas despertaron"}
              </b>{" "}
              hoy — ¿siguen teniendo sentido?
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-src">
              Revisar <ArrowRight className="size-4" />
            </span>
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">Topics</h1>
          <div className="flex-1" />
          {/* Convergence (Fase 5): unir dos o más topics en uno. */}
          {convergibles.length >= 2 && <ConvergePanel topics={convergibles} />}
          <Link
            href="/shipped"
            className={buttonVariants({ size: "sm", variant: "ghost" })}
          >
            <Star className="size-4" /> Versiones
          </Link>
          <Link
            href="/topics/new"
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Plus className="size-4" /> Nuevo topic
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada topic es una línea de vida: su historial solo crece, nunca se
          reescribe.
        </p>

        {/* Filtros por estado (Fase 6): responden "¿qué hago con esto ahora?" */}
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => {
            const active = stateFilter === key;
            return (
              <Link
                key={key}
                href={key === "all" ? "/" : `/?state=${key}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label} · {counts[key]}
              </Link>
            );
          })}
        </div>

        {rows.length === 0 && (
          <Empty className="mt-6 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Waves className="text-river" />
              </EmptyMedia>
              <EmptyTitle>Nada en este estado</EmptyTitle>
              <EmptyDescription>
                Los topics viven en tres estados: activos (se trabajan ahora),
                dormidos (esperan su disparador) y archivados (con motivo).
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {rows.map(({ topic, threadCount, entryCount, decisionCount, shippedVersion, convergedInto }) => (
            // Card entera clickeable (UI.md): link estirado + z en los links internos
            <Card key={topic.id} className="relative">
              <Link
                href={`/topics/${topic.id}`}
                aria-label={topic.title}
                className="absolute inset-0 rounded-xl"
              />
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <StateBadge state={topic.state} />
                  {shippedVersion && (
                    <Badge variant="secondary"><Star /> Shipped {shippedVersion}</Badge>
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
                      className="relative z-[1] inline-flex items-center gap-1 font-medium text-merge hover:underline"
                    >
                      <Merge className="size-3.5" /> convergió en {convergedInto.into_title}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

      </main>
    </div>
  );
}
