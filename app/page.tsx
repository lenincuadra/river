import Link from "next/link";
import { db } from "@/db";
import {
  topics as topicsTable,
  threads as threadsTable,
  entries as entriesTable,
  events as eventsTable,
} from "@/db/schema";
import { Topbar } from "@/components/topbar";
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
  const [topics, threads, entries, events] = await Promise.all([
    db.select().from(topicsTable),
    db.select().from(threadsTable),
    db.select().from(entriesTable),
    db.select().from(eventsTable),
  ]);

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
      <Topbar />

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
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
          {rows.map(({ topic, threadCount, entryCount, decisionCount, shippedVersion }) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
