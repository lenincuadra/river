import Link from "next/link";
import { Search, Radar, Inbox, Plus } from "lucide-react";
import { db } from "@/db";
import { entries, topics, threads, events } from "@/db/schema";
import { allPendingTriggers } from "@/db/mutations";
import { isDue, triggerSummary } from "@/lib/triggers";
import { fmtRelative } from "@/lib/dates";
import { fmtDate } from "@/components/feed";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Capture } from "./capture";
import { TopicSwitcher } from "./topic-switcher";

// Topbar del wireframe: logo, captura como input principal, inbox con badge,
// búsqueda plegada a un botón (Fase 6) y el switcher de topic a la derecha.
// El radar suma la Fase 4: cuenta lo dormido, resaltado si algo venció.
export async function Topbar({
  currentTopic,
}: {
  currentTopic?: { id: string; title: string };
}) {
  const [allEntries, allTopics, allThreads, allEvents, pendingTriggers] =
    await Promise.all([
      db
        .select({
          id: entries.id,
          topic_id: entries.topic_id,
          thread_id: entries.thread_id,
          created_at: entries.created_at,
        })
        .from(entries),
      db.select().from(topics),
      db
        .select({
          id: threads.id,
          topic_id: threads.topic_id,
          parent_thread_id: threads.parent_thread_id,
        })
        .from(threads),
      db
        .select({ topic_id: events.topic_id, created_at: events.created_at })
        .from(events),
      allPendingTriggers(),
    ]);
  const inboxCount = allEntries.filter((e) => e.topic_id === null).length;
  const dueCount = pendingTriggers.filter(isDue).length;

  // Lista enriquecida del switcher (wireframe): cada topic con el preview de
  // su último movimiento y, si duerme, su disparador visible.
  const switcherItems = allTopics.map((t) => {
    const moves = [
      ...allEntries.filter((e) => e.topic_id === t.id),
      ...allEvents.filter((e) => e.topic_id === t.id),
    ].map((m) => m.created_at);
    const lastMove = moves.sort().at(-1);
    const trigger = pendingTriggers.find(
      (tr) => tr.target_type === "topic" && tr.target_id === t.id
    );
    const meta = [
      lastMove ? `últ. mov. ${fmtRelative(lastMove)}` : null,
      trigger ? triggerSummary(trigger, fmtDate) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: t.id,
      title: t.title,
      state: t.state,
      meta,
      // Solo threads de primer nivel: es lo que se ve al abrir el topic.
      threads: allThreads.filter(
        (th) => th.topic_id === t.id && th.parent_thread_id === null
      ).length,
      mainEntries: allEntries.filter(
        (e) => e.topic_id === t.id && e.thread_id === null
      ).length,
    };
  });

  const navLink = (extra?: string) =>
    cn(
      buttonVariants({ variant: "ghost", size: "sm" }),
      "text-muted-foreground",
      extra
    );

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background px-5 py-3">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-extrabold tracking-wider"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-river text-xs font-extrabold text-background">
          1R
        </span>
        <span className="max-sm:hidden">RIVER</span>
      </Link>
      {/* ⌘K abre el modal de captura; key: al cambiar de topic se remonta y
          el chip de destino vuelve a aparecer */}
      <Capture
        key={currentTopic?.id ?? "none"}
        hotkey
        topic={currentTopic ?? null}
        trigger={
          <Button variant="outline" size="sm" className="text-muted-foreground" />
        }
        triggerLabel={
          <>
            <Plus /> <span className="max-md:hidden">Capturar rápido…</span>
            <Kbd className="max-sm:hidden">⌘K</Kbd>
          </>
        }
      />
      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger
          render={<Link href="/search" className={navLink()} />}
        >
          <Search /> <span className="max-md:hidden">Buscar</span>
        </TooltipTrigger>
        <TooltipContent>Buscar en topics, threads y entries</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href="/triggers"
              className={navLink(
                dueCount > 0 ? "text-src hover:text-src" : undefined
              )}
            />
          }
        >
          <Radar /> <span className="max-md:hidden">Radar</span>
          <Badge
            variant="secondary"
            className={cn("px-1.5", dueCount > 0 && "bg-src/15 text-src")}
          >
            {pendingTriggers.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? "disparador vencido" : "disparadores vencidos"} — ¿siguen teniendo sentido?`
            : "Disparadores pendientes: lo que duerme y espera"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<Link href="/inbox" className={navLink()} />}
        >
          <Inbox /> <span className="max-md:hidden">Inbox</span>
          <Badge variant="secondary" className="px-1.5">
            {inboxCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Capturas sin destino, para procesar después</TooltipContent>
      </Tooltip>

      <TopicSwitcher topics={switcherItems} currentId={currentTopic?.id} />
    </header>
  );
}
