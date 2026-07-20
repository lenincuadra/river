import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
} from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const STATE_LABEL = {
  active: "Active",
  snoozed: "Snoozed",
  archived: "Archived",
} as const;

function monthYear(iso: string) {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function Home() {
  const [topics, threads, entries, events] = await Promise.all([
    db.select().from(topicsTable),
    db.select().from(threadsTable),
    db.select().from(entriesTable),
    db.select().from(eventsTable),
  ]);

  const inboxCount = entries.filter((e) => e.topic_id === null).length;

  const rows = topics.map((topic) => {
    const topicEvents = events.filter((e) => e.topic_id === topic.id);
    const shipped = topicEvents.find((e) => e.type === "shipped");
    const shippedVersion = shipped
      ? (JSON.parse(shipped.payload) as { version?: string }).version
      : null;
    return {
      topic,
      threadCount: threads.filter(
        (t) => t.topic_id === topic.id && t.parent_thread_id === null
      ).length,
      entryCount: entries.filter((e) => e.topic_id === topic.id).length,
      decisionCount: topicEvents.filter((e) => e.type === "decision").length,
      shippedVersion,
    };
  });

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-extrabold tracking-wider">
          <span className="flex size-6 items-center justify-center rounded-md bg-river text-xs font-extrabold text-background">
            1R
          </span>
          RIVER
        </div>
        <div className="flex-1" />
        <Badge variant="outline" className="text-muted-foreground">
          📥 Inbox · {inboxCount}
        </Badge>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <h1 className="text-xl font-bold tracking-tight">Topics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada topic es una línea de vida: su historial solo crece, nunca se
          reescribe.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {rows.map(({ topic, threadCount, entryCount, decisionCount, shippedVersion }) => (
            <Card key={topic.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">{topic.title}</CardTitle>
                  <Badge variant="outline">
                    <span
                      className={
                        topic.state === "active"
                          ? "size-1.5 rounded-full bg-add"
                          : topic.state === "snoozed"
                            ? "size-1.5 rounded-full border border-foreground"
                            : "size-1.5 rounded-full bg-muted-foreground"
                      }
                    />
                    {STATE_LABEL[topic.state]}
                  </Badge>
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
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                El board jerárquico de este topic llega en las próximas fases.
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
