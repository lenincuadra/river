import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { topics, threads, entries, events } from "./schema";

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
