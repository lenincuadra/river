import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  Pencil,
  CircleDot,
  Star,
  Moon,
  Sun,
  Play,
  Archive,
  Check,
  Columns3,
} from "lucide-react";
import { ThreadIcon, ConvergeIcon } from "@/lib/event-icons";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
  triggers as triggersTable,
} from "@/db/schema";
import { Topbar } from "@/components/topbar";
import { StateBadge } from "@/components/state-badge";
import { fmtDate } from "@/components/feed";

export const dynamic = "force-dynamic";

type State = "active" | "snoozed" | "archived";
type EventPayload = {
  version?: string;
  title?: string;
  reason?: string;
  into_title?: string;
};

// Íconos/colores por tipo de nodo (mismo mapa semántico que el feed vertical:
// entry=verde, merge=morado, disparadores=rosa). Íconos Lucide.
type IconType = ComponentType<{ className?: string }>;
const MARK: Record<string, { Icon: IconType; cls: string }> = {
  entry: { Icon: Pencil, cls: "border-border bg-muted text-add" },
  created: { Icon: CircleDot, cls: "border-border bg-muted text-foreground" },
  shipped: { Icon: Star, cls: "border-border bg-muted text-foreground" },
  snoozed: { Icon: Moon, cls: "border-border bg-muted text-muted-foreground" },
  awakened: { Icon: Sun, cls: "border-border bg-muted text-foreground" },
  reactivated: { Icon: Play, cls: "border-border bg-muted text-add" },
  archived: { Icon: Archive, cls: "border-border bg-muted text-muted-foreground" },
  decision: { Icon: Check, cls: "border-border bg-muted text-foreground" },
  converged_into: { Icon: ConvergeIcon, cls: "border-border bg-muted text-merge" },
  converged_from: { Icon: ConvergeIcon, cls: "border-border bg-muted text-merge" },
  trigger: { Icon: Moon, cls: "border-border bg-muted text-src" },
};

// La hora actual se lee en un helper (no en el cuerpo del componente): la
// página es force-dynamic y se renderiza por request, igual que isDue en
// lib/triggers.ts. Así el eje ubica "hoy" y la zona futuro.
function currentMs() {
  return Date.now();
}

function eventLabel(type: string, p: EventPayload) {
  switch (type) {
    case "created": return "Creado";
    case "shipped": return `Shipped ${p.version ?? ""}`.trim();
    case "snoozed": return "Snoozed";
    case "awakened": return "Despertó";
    case "reactivated": return "Reactivado";
    case "archived": return `Archivado${p.reason ? `: ${p.reason}` : ""}`;
    case "decision": return `Decisión${p.title ? `: ${p.title}` : ""}`;
    case "converged_into": return `Convergió en ${p.into_title ?? ""}`.trim();
    case "converged_from": return "Recibió convergencia";
    default: return type;
  }
}

type LaneNode = { t: number; Icon: IconType; cls: string; label: string };
type Lane = {
  key: string;
  kind: "main" | "thread" | "subthread";
  title: ReactNode;
  href?: string;
  state?: State;
  branchPct?: number;
  nodes: LaneNode[];
  dateTriggers: { pct: number; label: string }[];
};

// Fase 7 (opcional) — vista Multiverso: el mismo topic leído como líneas de
// tiempo horizontales paralelas sobre un eje compartido. El main es la línea
// de arriba; cada thread/subthread es una rama que nace en el instante en que
// se bifurcó; a la derecha, la zona futuro con los disparadores pendientes.
export default async function MultiversePage({
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

  const [allEntries, allEvents, allThreads, allPending] = await Promise.all([
    db.select().from(entriesTable).where(eq(entriesTable.topic_id, id)),
    db.select().from(eventsTable).where(eq(eventsTable.topic_id, id)),
    db.select().from(threadsTable).where(eq(threadsTable.topic_id, id)),
    db.select().from(triggersTable).where(eq(triggersTable.status, "pending")),
  ]);

  const threadIds = new Set(allThreads.map((t) => t.id));
  const topicTriggers = allPending.filter(
    (tr) =>
      (tr.target_type === "topic" && tr.target_id === id) ||
      (tr.target_type === "thread" && threadIds.has(tr.target_id))
  );

  const ms = (s: string) => new Date(s).getTime();
  const now = currentMs();

  // Eje temporal: del primer registro al máximo entre hoy y el disparador más
  // lejano, con un margen a la derecha para respirar.
  const pastDates = [
    ms(topic.created_at),
    ...allEntries.map((e) => ms(e.created_at)),
    ...allEvents.map((e) => ms(e.created_at)),
  ];
  const futureDates = topicTriggers
    .filter((t) => t.kind === "date" && t.fire_date)
    .map((t) => ms(t.fire_date!));
  const tMin = Math.min(...pastDates);
  const tMaxRaw = Math.max(now, ...pastDates, ...futureDates);
  const span = Math.max(tMaxRaw - tMin, 1) * 1.06;
  const xPct = (t: number) =>
    Math.min(100, Math.max(0, ((t - tMin) / span) * 100));
  const nowPct = xPct(now);

  const byCreated = <T extends { created_at: string }>(a: T, b: T) =>
    a.created_at.localeCompare(b.created_at);

  const entryNode = (e: typeof allEntries[number]): LaneNode => ({
    t: ms(e.created_at),
    Icon: MARK.entry.Icon,
    cls: MARK.entry.cls,
    label: `${e.author_label}: ${e.body}`,
  });
  const eventNode = (ev: typeof allEvents[number]): LaneNode => {
    const p = JSON.parse(ev.payload) as EventPayload;
    const m = MARK[ev.type] ?? MARK.created;
    return { t: ms(ev.created_at), Icon: m.Icon, cls: m.cls, label: eventLabel(ev.type, p) };
  };
  const branchTime = (t: typeof allThreads[number]) => {
    if (t.origin_entry_id) {
      const origin = allEntries.find((e) => e.id === t.origin_entry_id);
      if (origin) return ms(origin.created_at);
    }
    return ms(t.created_at);
  };
  const dateTriggersFor = (targetType: "topic" | "thread", targetId: string) =>
    topicTriggers
      .filter(
        (tr) =>
          tr.target_type === targetType &&
          tr.target_id === targetId &&
          tr.kind === "date" &&
          tr.fire_date
      )
      .map((tr) => ({
        pct: xPct(ms(tr.fire_date!)),
        label: `Despierta el ${fmtDate(tr.fire_date!)}`,
      }));

  // Armado de lanes: main, y por cada thread su lane seguida de sus subthreads.
  const lanes: Lane[] = [];
  lanes.push({
    key: "main",
    kind: "main",
    title: "Main",
    href: `/topics/${id}`,
    state: topic.state,
    nodes: [
      ...allEntries.filter((e) => e.thread_id === null).map(entryNode),
      ...allEvents.filter((e) => e.thread_id === null).map(eventNode),
    ].sort((a, b) => a.t - b.t),
    dateTriggers: dateTriggersFor("topic", id),
  });

  const laneForThread = (
    t: typeof allThreads[number],
    kind: "thread" | "subthread"
  ): Lane => ({
    key: t.id,
    kind,
    title: (
      <span className="inline-flex items-center gap-1.5">
        <ThreadIcon className={kind === "subthread" ? "size-3" : "size-3.5"} />
        {t.title}
      </span>
    ),
    href: `/topics/${id}/threads/${t.id}`,
    state: t.state,
    branchPct: xPct(branchTime(t)),
    nodes: [
      ...allEntries.filter((e) => e.thread_id === t.id).map(entryNode),
      ...allEvents.filter((e) => e.thread_id === t.id).map(eventNode),
    ].sort((a, b) => a.t - b.t),
    dateTriggers: dateTriggersFor("thread", t.id),
  });

  const topThreads = allThreads
    .filter((t) => t.parent_thread_id === null)
    .sort(byCreated);
  for (const t of topThreads) {
    lanes.push(laneForThread(t, "thread"));
    for (const s of allThreads
      .filter((x) => x.parent_thread_id === t.id)
      .sort(byCreated)) {
      lanes.push(laneForThread(s, "subthread"));
    }
  }

  // Disparadores sin fecha (condición/backlog): no caen en el eje, se listan.
  const undated = topicTriggers
    .filter((tr) => tr.kind !== "date")
    .map((tr) => {
      const isTopic = tr.target_type === "topic";
      const th = isTopic ? null : allThreads.find((x) => x.id === tr.target_id);
      return {
        id: tr.id,
        target: isTopic ? topic.title : (th?.title ?? "?"),
        href: isTopic ? `/topics/${id}` : `/topics/${id}/threads/${tr.target_id}`,
        label:
          tr.kind === "condition"
            ? `Condición: ${tr.condition_text}`
            : "Backlog (revisión manual)",
      };
    });

  // Líneas verticales de mes para orientar el eje.
  const months: { pct: number; label: string }[] = [];
  const start = new Date(tMin);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = tMin + span;
  const monthFmt = new Intl.DateTimeFormat("es", { month: "short", year: "2-digit" });
  while (cursor.getTime() <= end && months.length < 40) {
    if (cursor.getTime() >= tMin) {
      months.push({ pct: xPct(cursor.getTime()), label: monthFmt.format(cursor) });
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <Topbar currentTopic={{ id: topic.id, title: topic.title }} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight">{topic.title}</h1>
          <StateBadge state={topic.state} />
          <span className="text-sm text-muted-foreground">· Línea de tiempo</span>
          <Link
            href={`/topics/${id}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <Columns3 className="size-3.5" /> Ver como Board
          </Link>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          El mismo topic como líneas de tiempo paralelas: el main arriba, cada
          thread como una rama que nace donde se bifurcó, y a la derecha la zona
          futuro con los disparadores pendientes.
        </p>

        {/* Leyenda */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Pencil className="size-3 text-add" /> entry</span>
          <span className="inline-flex items-center gap-1"><Star className="size-3 text-foreground" /> shipped · <Check className="size-3 text-foreground" /> decisión</span>
          <span className="inline-flex items-center gap-1"><ThreadIcon className="size-3 text-merge" /> rama · <ConvergeIcon className="size-3 text-merge" /> convergió</span>
          <span className="inline-flex items-center gap-1"><Moon className="size-3 text-src" /> disparador (zona futuro)</span>
        </div>

        {/* Timeline horizontal */}
        <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
          <div className="relative min-w-[72rem] py-3">
            {/* Capa de fondo alineada al track (después del gutter de 11rem) */}
            <div className="pointer-events-none absolute inset-y-0 left-44 right-0">
              {/* zona futuro */}
              <div
                className="absolute inset-y-0 right-0 bg-src/[0.04]"
                style={{ left: `${nowPct}%` }}
              />
              {/* líneas de mes */}
              {months.map((m, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 w-px bg-border/40"
                  style={{ left: `${m.pct}%` }}
                />
              ))}
              {/* línea de HOY */}
              <div
                className="absolute inset-y-0 w-px bg-src/60"
                style={{ left: `${nowPct}%` }}
              />
            </div>

            {/* Eje: etiquetas de mes + HOY */}
            <div className="relative ml-44 mb-1 h-4">
              {months.map((m, i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground"
                  style={{ left: `${m.pct}%` }}
                >
                  {m.label}
                </span>
              ))}
              <span
                className="absolute -translate-x-1/2 text-[10px] font-semibold text-src"
                style={{ left: `${nowPct}%` }}
              >
                hoy
              </span>
            </div>

            {/* Lanes */}
            <div className="flex flex-col">
              {lanes.map((lane) => (
                <div key={lane.key} className="flex items-stretch">
                  {/* Gutter con el nombre de la lane */}
                  <div className="w-44 shrink-0 self-center pr-3">
                    <div
                      className={`truncate text-sm ${
                        lane.kind === "main" ? "font-bold" : "font-semibold"
                      } ${lane.kind === "subthread" ? "pl-3" : ""}`}
                    >
                      {lane.href ? (
                        <Link href={lane.href} className="hover:underline">
                          {lane.title}
                        </Link>
                      ) : (
                        lane.title
                      )}
                    </div>
                    {lane.state && (
                      <div className="mt-0.5">
                        <StateBadge state={lane.state} />
                      </div>
                    )}
                  </div>

                  {/* Track con el riel, los nodos y los disparadores */}
                  <div className="relative h-14 flex-1">
                    {/* riel: para threads nace en el punto de bifurcación */}
                    <div
                      className="absolute top-1/2 h-px -translate-y-1/2 bg-border"
                      style={{
                        left: `${lane.branchPct ?? 0}%`,
                        right: 0,
                      }}
                    />
                    {/* tick de rama: baja desde arriba hasta el riel en el instante de bifurcación */}
                    {lane.kind !== "main" && lane.branchPct !== undefined && (
                      <div
                        className="absolute top-0 w-px -translate-x-1/2 bg-merge/60"
                        style={{ left: `${lane.branchPct}%`, height: "50%" }}
                      />
                    )}
                    {/* nodos (entries + eventos) */}
                    {lane.nodes.map((n, i) => (
                      <span
                        key={i}
                        title={`${fmtDate(new Date(n.t).toISOString())} — ${n.label}`}
                        className={`absolute top-1/2 z-[1] flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border ${n.cls}`}
                        style={{ left: `${xPct(n.t)}%` }}
                      >
                        <n.Icon className="size-3" />
                      </span>
                    ))}
                    {/* disparadores de fecha (zona futuro) */}
                    {lane.dateTriggers.map((tr, i) => (
                      <span
                        key={`t-${i}`}
                        title={tr.label}
                        className={`absolute top-1/2 z-[1] flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border ${MARK.trigger.cls}`}
                        style={{ left: `${tr.pct}%` }}
                      >
                        <Moon className="size-3" />
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Disparadores sin fecha en el eje */}
        {undated.length > 0 && (
          <div className="mt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Disparadores sin fecha
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Condiciones y backlog no caen en el eje del tiempo: esperan una
              revisión manual desde el Radar.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {undated.map((u) => (
                <Link
                  key={u.id}
                  href={u.href}
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm hover:bg-muted/40"
                >
                  <Moon className="size-4 shrink-0 text-src" />
                  <span className="font-semibold">{u.target}</span>
                  <span className="text-muted-foreground">· {u.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
