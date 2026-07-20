import { isNull } from "drizzle-orm";
import { Inbox, Plus, Waves } from "lucide-react";
import { db } from "@/db";
import { entries as entriesTable, topics as topicsTable } from "@/db/schema";
import { Topbar } from "@/components/topbar";
import { InboxEntryActions } from "@/components/inbox-entry-actions";
import { Capture } from "@/components/capture";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

// El inbox es la mitad de la "captura de dos tiempos": acá se procesa lo
// capturado sin destino. Borrar solo está permitido acá (regla 2).
export default async function InboxPage() {
  const [inboxEntries, allTopics] = await Promise.all([
    db.select().from(entriesTable).where(isNull(entriesTable.topic_id)),
    db.select().from(topicsTable),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <Topbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="inline-flex items-center gap-2 text-xl font-bold tracking-tight">
          <Inbox className="size-5" /> Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capturas sin destino todavía. Procesalas: movelas a un topic, creá uno
          nuevo, o borralas (solo acá se puede borrar).
        </p>

        {inboxEntries.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {inboxEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex flex-col gap-3">
                  <div className="text-sm">
                    <b>{entry.author_label}</b>
                    <span className="float-right text-xs text-muted-foreground">
                      {fmtDate(entry.created_at)}
                    </span>
                    <p className="mt-1">{entry.body}</p>
                  </div>
                  <InboxEntryActions
                    entryId={entry.id}
                    topics={allTopics.map((t) => ({ id: t.id, title: t.title }))}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* El bloque de captura vive siempre debajo de los items (UI.md):
            misma estructura, texto según contexto. */}
        <Empty
          className={`${inboxEntries.length === 0 ? "mt-10" : "mt-6"} border border-dashed`}
        >
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Waves className="text-river" />
            </EmptyMedia>
            <EmptyTitle>
              {inboxEntries.length === 0 ? "Inbox vacío" : "¿Apareció algo más?"}
            </EmptyTitle>
            <EmptyDescription>
              Capturá desde cualquier pantalla con <Kbd>⌘K</Kbd> — sin decidir
              a dónde va. Después se procesa acá.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Capture
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <Plus /> Capturar al inbox
                </>
              }
            />
          </EmptyContent>
        </Empty>
      </main>
    </div>
  );
}
