import { Waves } from "lucide-react";
import { db } from "@/db";
import { topics as topicsTable, threads as threadsTable } from "@/db/schema";
import { allPendingTriggers } from "@/db/mutations";
import { isDue, targetInfo } from "@/lib/triggers";
import { Topbar } from "@/components/topbar";
import { ReentryItem } from "@/components/reentry-item";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

// Reentry: el momento en que un disparador de fecha se cumple. La app lo
// chequea sola al abrir (los de condición/backlog los dispara el usuario
// desde /triggers). Criterio de listo de la Fase 4: un topic snoozeado con
// fecha vencida interpela acá, resolvible por sus tres salidas.
export default async function ReentryPage() {
  const [pending, allTopics, allThreads] = await Promise.all([
    allPendingTriggers(),
    db.select().from(topicsTable),
    db.select().from(threadsTable),
  ]);
  const due = pending.filter(isDue);
  const topicsById = new Map(allTopics.map((t) => [t.id, t]));
  const threadsById = new Map(allThreads.map((t) => [t.id, t]));

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="text-xl font-bold tracking-tight">Reentry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que estaba dormido y hoy llegó su fecha. Nada se hace solo: vos
          decidís si sigue teniendo sentido.
        </p>

        {due.length === 0 ? (
          <Empty className="mt-8 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Waves className="text-river" />
              </EmptyMedia>
              <EmptyTitle>Nada te espera hoy</EmptyTitle>
              <EmptyDescription>El río sigue su curso.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {due.map((trigger) => {
              const info = targetInfo(trigger, topicsById, threadsById);
              return (
                <ReentryItem
                  key={trigger.id}
                  trigger={trigger}
                  href={info.href}
                  title={info.title}
                  breadcrumb={info.breadcrumb}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
