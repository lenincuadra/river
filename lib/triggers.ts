import type {
  triggers as triggersTable,
  topics as topicsTable,
  threads as threadsTable,
} from "@/db/schema";

export type Trigger = typeof triggersTable.$inferSelect;
type Topic = typeof topicsTable.$inferSelect;
type Thread = typeof threadsTable.$inferSelect;

// Disparador de fecha vencido = listo para Reentry. Los de condición y
// backlog no los chequea la app: los dispara el usuario desde el radar.
// (Sin segundo parámetro a propósito: así es seguro pasarla directo a
// .filter()/.some() sin que el índice se confunda con un argumento real.)
export function isDue(trigger: Trigger) {
  const nowIso = new Date().toISOString();
  return trigger.kind === "date" && !!trigger.fire_date && trigger.fire_date <= nowIso;
}

export function triggerSummary(
  trigger: Trigger,
  fmtDate: (iso: string) => string
) {
  if (trigger.kind === "date" && trigger.fire_date)
    return `despierta el ${fmtDate(trigger.fire_date)}`;
  if (trigger.kind === "condition") return `condición: ${trigger.condition_text}`;
  return "backlog";
}

// El topic/thread al que apunta un disparador (para el radar y Reentry, que
// listan triggers sin partir de la página del topic).
export function targetInfo(
  trigger: Trigger,
  topicsById: Map<string, Topic>,
  threadsById: Map<string, Thread>
) {
  if (trigger.target_type === "topic") {
    const topic = topicsById.get(trigger.target_id);
    return {
      title: topic?.title ?? "(topic borrado)",
      breadcrumb: undefined as string | undefined,
      href: `/topics/${trigger.target_id}`,
    };
  }
  const thread = threadsById.get(trigger.target_id);
  const topic = thread ? topicsById.get(thread.topic_id) : undefined;
  return {
    title: thread?.title ?? "(thread borrado)",
    breadcrumb: topic?.title,
    href: thread
      ? `/topics/${thread.topic_id}/threads/${trigger.target_id}`
      : "#",
  };
}
