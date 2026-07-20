import Link from "next/link";
import { Radar } from "lucide-react";
import { db } from "@/db";
import { topics as topicsTable, threads as threadsTable } from "@/db/schema";
import { allPendingTriggers } from "@/db/mutations";
import { isDue, targetInfo, triggerSummary, type Trigger } from "@/lib/triggers";
import { Topbar } from "@/components/topbar";
import { ReentryItem, ResolveControls } from "@/components/reentry-item";
import { fmtDate } from "@/components/feed";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const KIND_LABEL = { date: "Fecha", condition: "Condición", backlog: "Backlog" } as const;

// Vista radar: todos los disparadores pendientes, no solo los vencidos.
// Los vencidos (fecha) ya interpelan en /reentry; acá además se puede
// disparar a mano una condición o revisar un backlog cuando uno decide.
export default async function TriggersPage() {
  const [pending, allTopics, allThreads] = await Promise.all([
    allPendingTriggers(),
    db.select().from(topicsTable),
    db.select().from(threadsTable),
  ]);
  const topicsById = new Map(allTopics.map((t) => [t.id, t]));
  const threadsById = new Map(allThreads.map((t) => [t.id, t]));

  const sorted = [...pending].sort((a, b) => {
    const da = isDue(a) ? 0 : 1;
    const db_ = isDue(b) ? 0 : 1;
    return da - db_ || a.kind.localeCompare(b.kind);
  });

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
          <Radar className="size-5" /> Radar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo lo que hoy está dormido, esperando su disparador.
        </p>

        {sorted.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
            No hay nada snoozeado. Todo lo demás está activo o archivado.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {sorted.map((trigger) => (
              <TriggerRow
                key={trigger.id}
                trigger={trigger}
                topicsById={topicsById}
                threadsById={threadsById}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TriggerRow({
  trigger,
  topicsById,
  threadsById,
}: {
  trigger: Trigger;
  topicsById: Map<string, typeof topicsTable.$inferSelect>;
  threadsById: Map<string, typeof threadsTable.$inferSelect>;
}) {
  const info = targetInfo(trigger, topicsById, threadsById);
  const due = isDue(trigger);

  // Vencido: interpela ya mismo con las 3 salidas (mismo componente que Reentry).
  if (due) {
    return (
      <ReentryItem
        trigger={trigger}
        href={info.href}
        title={info.title}
        breadcrumb={info.breadcrumb ? `${info.breadcrumb} · vencido` : "vencido"}
      />
    );
  }

  // No vencido: se puede revisar igual a mano (condición cumplida, backlog).
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{info.breadcrumb}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        <Link href={info.href} className="text-sm font-bold hover:underline">
          {info.title}
        </Link>
        <Badge variant="outline" className="text-muted-foreground">
          {KIND_LABEL[trigger.kind]}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {triggerSummary(trigger, fmtDate)}
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-merge">
          Revisar ahora
        </summary>
        <div className="mt-2">
          <ResolveControls trigger={trigger} />
        </div>
      </details>
    </div>
  );
}
