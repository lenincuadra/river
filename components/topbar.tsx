import Link from "next/link";
import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { entries, topics } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { CaptureInput } from "./capture-input";
import { TopicSwitcher } from "./topic-switcher";

// Topbar del wireframe: logo, captura como input principal, inbox con badge,
// búsqueda plegada (llega en Fase 6) y el switcher de topic a la derecha.
export async function Topbar({
  currentTopic,
}: {
  currentTopic?: { id: string; title: string };
}) {
  const [inboxEntries, allTopics] = await Promise.all([
    db.select({ id: entries.id }).from(entries).where(isNull(entries.topic_id)),
    db.select().from(topics),
  ]);

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background px-5 py-3">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm font-extrabold tracking-wider"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-river text-xs font-extrabold text-background">
          1R
        </span>
        <span className="max-sm:hidden">RIVER</span>
      </Link>
      {/* key: al cambiar de topic se remonta y el chip de destino vuelve a aparecer */}
      <CaptureInput key={currentTopic?.id ?? "none"} topic={currentTopic ?? null} />
      <div className="flex-1" />
      <Link href="/inbox">
        <Badge variant="outline" className="text-muted-foreground">
          📥 Inbox · {inboxEntries.length}
        </Badge>
      </Link>
      <TopicSwitcher
        topics={allTopics}
        currentTitle={currentTopic?.title}
      />
    </header>
  );
}
