import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { topics, threads, entries, events, triggers } from "./schema";

// Toda mutación pasa por acá: las reglas del sistema se validan en backend,
// no solo en UI (CLAUDE.md). La tabla `events` solo recibe INSERT.

const now = () => new Date().toISOString();

export async function createTopic(input: {
  title: string;
  description?: string;
  originEntryId?: string;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("El título del topic es obligatorio.");
  const topicId = randomUUID();
  await db.insert(topics).values({
    id: topicId,
    title,
    description: input.description?.trim() || null,
    state: "active",
    origin_entry_id: input.originEntryId ?? null,
    created_at: now(),
  });
  await db.insert(events).values({
    id: randomUUID(),
    topic_id: topicId,
    type: "created",
    payload: JSON.stringify(
      input.originEntryId ? { from_entry_id: input.originEntryId } : {}
    ),
    created_at: now(),
  });
  return topicId;
}

// Captura sin fricción (regla 7): sin topic va al inbox, con topic entra a su
// main, y con thread entra dentro del thread (el topic se deduce del thread).
export async function captureEntry(input: {
  body: string;
  topicId?: string | null;
  threadId?: string | null;
  authorLabel?: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("La entry no puede estar vacía.");
  let topicId = input.topicId ?? null;
  if (input.threadId) {
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, input.threadId));
    if (!thread) throw new Error("El thread no existe.");
    topicId = thread.topic_id;
  }
  const entryId = randomUUID();
  await db.insert(entries).values({
    id: entryId,
    topic_id: topicId,
    thread_id: input.threadId ?? null,
    author_label: input.authorLabel?.trim() || "Yo",
    body,
    created_at: now(),
  });
  return entryId;
}

// Threads: ramificaciones de un topic. Con originEntryId queda registrado
// desde qué entry del main nació ("Thread creado desde una entry de Martina").
export async function createThread(input: {
  topicId: string;
  title: string;
  originEntryId?: string;
  parentThreadId?: string;
}) {
  const title = input.title.trim();
  if (!title) throw new Error("El título del thread es obligatorio.");
  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, input.topicId));
  if (!topic) throw new Error("El topic no existe.");

  if (input.parentThreadId) {
    const [parent] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, input.parentThreadId));
    if (!parent) throw new Error("El thread padre no existe.");
    if (parent.topic_id !== input.topicId)
      throw new Error("El thread padre pertenece a otro topic.");
    // Regla 5: profundidad máxima 2 (topic → thread → subthread), en backend.
    if (parent.parent_thread_id)
      throw new Error(
        "Profundidad máxima 2: un subthread no puede ramificarse de nuevo (regla 5)."
      );
  }

  if (input.originEntryId) {
    const [origin] = await db
      .select()
      .from(entries)
      .where(eq(entries.id, input.originEntryId));
    if (!origin) throw new Error("La entry de origen no existe.");
    if (origin.topic_id !== input.topicId)
      throw new Error("La entry de origen pertenece a otro topic.");
  }

  const threadId = randomUUID();
  await db.insert(threads).values({
    id: threadId,
    topic_id: input.topicId,
    parent_thread_id: input.parentThreadId ?? null,
    title,
    state: "active",
    origin_entry_id: input.originEntryId ?? null,
    created_at: now(),
  });
  await db.insert(events).values({
    id: randomUUID(),
    topic_id: input.topicId,
    thread_id: threadId,
    type: "created",
    payload: JSON.stringify(
      input.originEntryId ? { from_entry_id: input.originEntryId } : {}
    ),
    created_at: now(),
  });
  return threadId;
}

// Procesar inbox: asignar una entry suelta a un topic.
export async function assignEntryToTopic(entryId: string, topicId: string) {
  const [entry] = await db.select().from(entries).where(eq(entries.id, entryId));
  if (!entry) throw new Error("La entry no existe.");
  if (entry.topic_id)
    throw new Error("La entry ya pertenece a un topic; el inbox no la contiene.");
  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId));
  if (!topic) throw new Error("El topic destino no existe.");
  await db
    .update(entries)
    .set({ topic_id: topicId })
    .where(eq(entries.id, entryId));
}

// Procesar inbox creando un topic nuevo: la entry queda como su origen.
export async function createTopicFromEntry(entryId: string, title: string) {
  const topicId = await createTopic({ title, originEntryId: entryId });
  await assignEntryToTopic(entryId, topicId);
  return topicId;
}

// --- Estados (Fase 3). Estado ≠ historial: el estado es un campo mutable,
// y cada cambio genera su evento inmutable (regla 4). ---

type TargetType = "topic" | "thread";

async function getTarget(targetType: TargetType, id: string) {
  if (targetType === "topic") {
    const [topic] = await db.select().from(topics).where(eq(topics.id, id));
    if (!topic) throw new Error("El topic no existe.");
    return { state: topic.state, topicId: topic.id, threadId: null };
  }
  const [thread] = await db.select().from(threads).where(eq(threads.id, id));
  if (!thread) throw new Error("El thread no existe.");
  return { state: thread.state, topicId: thread.topic_id, threadId: thread.id };
}

async function setState(
  targetType: TargetType,
  id: string,
  state: "active" | "snoozed" | "archived"
) {
  if (targetType === "topic") {
    await db.update(topics).set({ state }).where(eq(topics.id, id));
  } else {
    await db.update(threads).set({ state }).where(eq(threads.id, id));
  }
}

// Regla 3: nada se archiva sin motivo. Vale para topics y threads.
export async function archiveTarget(input: {
  targetType: TargetType;
  id: string;
  reason: string;
}) {
  const reason = input.reason.trim();
  if (!reason)
    throw new Error("Archivar sin motivo es imposible (regla 3).");
  const target = await getTarget(input.targetType, input.id);
  if (target.state === "archived") throw new Error("Ya está archivado.");
  await setState(input.targetType, input.id, "archived");
  await db.insert(events).values({
    id: randomUUID(),
    topic_id: target.topicId,
    thread_id: target.threadId,
    type: "archived",
    payload: JSON.stringify({ reason }),
    created_at: now(),
  });
}

// Archived es reversible manualmente; snoozed también se puede reactivar.
export async function reactivateTarget(input: {
  targetType: TargetType;
  id: string;
}) {
  const target = await getTarget(input.targetType, input.id);
  if (target.state === "active") throw new Error("Ya está activo.");
  await setState(input.targetType, input.id, "active");
  await db.insert(events).values({
    id: randomUUID(),
    topic_id: target.topicId,
    thread_id: target.threadId,
    type: "reactivated",
    payload: JSON.stringify({ from: target.state }),
    created_at: now(),
  });
}

// --- Disparadores y Reentry (Fase 4). Snooze: elegir disparador → state =
// snoozed → evento `snoozed` + fila en triggers (river-plan.md §4). ---

export type TriggerInput =
  | { kind: "date"; fireDate: string }
  | { kind: "condition"; conditionText: string }
  | { kind: "backlog" };

function triggerEventPayload(trigger: TriggerInput) {
  if (trigger.kind === "date") return { trigger: "date", fire_date: trigger.fireDate };
  if (trigger.kind === "condition")
    return { trigger: "condition", condition: trigger.conditionText };
  return { trigger: "backlog" };
}

export async function snoozeTarget(input: {
  targetType: TargetType;
  id: string;
  trigger: TriggerInput;
}) {
  if (input.trigger.kind === "date" && !input.trigger.fireDate)
    throw new Error("La fecha del disparador es obligatoria.");
  if (input.trigger.kind === "condition" && !input.trigger.conditionText.trim())
    throw new Error("El texto de la condición es obligatorio.");

  const target = await getTarget(input.targetType, input.id);
  if (target.state === "archived")
    throw new Error("Un archived no se snoozea directamente: reactivalo primero.");

  await setState(input.targetType, input.id, "snoozed");
  await db.insert(events).values({
    id: randomUUID(),
    topic_id: target.topicId,
    thread_id: target.threadId,
    type: "snoozed",
    payload: JSON.stringify(triggerEventPayload(input.trigger)),
    created_at: now(),
  });
  await db.insert(triggers).values({
    id: randomUUID(),
    target_type: input.targetType,
    target_id: input.id,
    kind: input.trigger.kind,
    fire_date: input.trigger.kind === "date" ? input.trigger.fireDate : null,
    condition_text:
      input.trigger.kind === "condition" ? input.trigger.conditionText.trim() : null,
    status: "pending",
    created_at: now(),
  });
}

export async function pendingTriggerFor(targetType: TargetType, id: string) {
  const [trigger] = await db
    .select()
    .from(triggers)
    .where(
      and(
        eq(triggers.target_type, targetType),
        eq(triggers.target_id, id),
        eq(triggers.status, "pending")
      )
    );
  return trigger;
}

export async function allPendingTriggers() {
  return db.select().from(triggers).where(eq(triggers.status, "pending"));
}

// Reentry: el momento en que un disparador se cumple. Los de fecha los
// chequea la app sola (vencidos = radar de hoy); los de condición y backlog
// los dispara el usuario cuando decide revisarlos. Misma resolución de
// 3 salidas para los tres (river-plan.md §4).
export async function resolveTrigger(
  input:
    | { triggerId: string; action: "reactivate" }
    | { triggerId: string; action: "archive"; reason: string }
    | { triggerId: string; action: "resnooze"; trigger: TriggerInput }
) {
  const [trigger] = await db
    .select()
    .from(triggers)
    .where(eq(triggers.id, input.triggerId));
  if (!trigger) throw new Error("El disparador no existe.");
  if (trigger.status !== "pending")
    throw new Error("Este disparador ya fue resuelto.");

  const targetType = trigger.target_type as TargetType;
  if (input.action === "reactivate") {
    await reactivateTarget({ targetType, id: trigger.target_id });
  } else if (input.action === "archive") {
    await archiveTarget({ targetType, id: trigger.target_id, reason: input.reason });
  } else {
    await snoozeTarget({ targetType, id: trigger.target_id, trigger: input.trigger });
  }

  // El trigger resuelto pasa a fired, se haya elegido la salida que se haya elegido.
  await db.update(triggers).set({ status: "fired" }).where(eq(triggers.id, trigger.id));
}

// Regla 2: borrar solo mientras la entry está en el inbox,
// es decir antes de formar parte de la historia de un topic.
export async function deleteInboxEntry(entryId: string) {
  const [entry] = await db.select().from(entries).where(eq(entries.id, entryId));
  if (!entry) throw new Error("La entry no existe.");
  if (entry.topic_id)
    throw new Error(
      "Solo se pueden borrar entries del inbox: esta ya es parte de la historia de un topic (regla 2)."
    );
  await db.delete(entries).where(eq(entries.id, entryId));
}
