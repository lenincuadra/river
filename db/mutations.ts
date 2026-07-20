import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { topics, entries, events } from "./schema";

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

// Captura sin fricción (regla 7): sin topic va al inbox, con topic entra a su main.
export async function captureEntry(input: {
  body: string;
  topicId?: string | null;
  authorLabel?: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("La entry no puede estar vacía.");
  const entryId = randomUUID();
  await db.insert(entries).values({
    id: entryId,
    topic_id: input.topicId ?? null,
    author_label: input.authorLabel?.trim() || "Yo",
    body,
    created_at: now(),
  });
  return entryId;
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
