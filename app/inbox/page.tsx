import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { entries as entriesTable, topics as topicsTable } from "@/db/schema";
import {
  assignEntryAction,
  createTopicFromEntryAction,
  deleteInboxEntryAction,
} from "@/app/actions";
import { Topbar } from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
        <h1 className="text-xl font-bold tracking-tight">📥 Inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capturas sin destino todavía. Procesalas: movelas a un topic, creá uno
          nuevo, o borralas (solo acá se puede borrar).
        </p>

        {inboxEntries.length === 0 ? (
          <div className="mt-10 rounded-lg border border-border bg-card px-6 py-10 text-center">
            <div className="text-3xl">🌊</div>
            <p className="mt-3 text-sm text-muted-foreground">
              Inbox vacío. Capturá desde cualquier pantalla con{" "}
              <kbd className="rounded border border-border px-1.5 text-[10px]">⌘K</kbd>{" "}
              — sin decidir a dónde va.
            </p>
          </div>
        ) : (
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

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <form action={assignEntryAction} className="flex items-center gap-2">
                      <input type="hidden" name="entry_id" value={entry.id} />
                      <select
                        name="topic_id"
                        required
                        defaultValue=""
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      >
                        <option value="" disabled>
                          Elegir topic…
                        </option>
                        {allTopics.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        → Mover
                      </Button>
                    </form>

                    <form
                      action={createTopicFromEntryAction}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="entry_id" value={entry.id} />
                      <Input
                        name="title"
                        required
                        placeholder="Título del topic nuevo…"
                        className="h-8 w-48 text-sm"
                      />
                      <Button type="submit" size="sm" variant="outline">
                        ＋ Crear topic
                      </Button>
                    </form>

                    <div className="flex-1" />
                    <form action={deleteInboxEntryAction}>
                      <input type="hidden" name="entry_id" value={entry.id} />
                      <Button type="submit" size="sm" variant="ghost" className="text-del">
                        Borrar
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
