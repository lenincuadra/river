import { isNull, eq } from "drizzle-orm";
import { db } from "../db";
import { entries, topics, threads, events } from "../db/schema";
import {
  captureEntry,
  assignEntryToTopic,
  createTopicFromEntry,
  createThread,
  deleteInboxEntry,
} from "../db/mutations";

// Smoke test de los flujos de Fases 1 y 2 contra la DB real.
// Deja datos de prueba: correr `npm run db:reset` después para limpiar.

async function main() {
  const inbox0 = await db.select().from(entries).where(isNull(entries.topic_id));
  console.log("1) inbox inicial:", inbox0.length);

  // Captura sin destino → inbox (regla 7)
  const e1 = await captureEntry({ body: "Prueba: captura sin destino" });
  const inbox1 = await db.select().from(entries).where(isNull(entries.topic_id));
  console.log("2) tras capturar sin destino:", inbox1.length, "(esperado +1)");

  // Procesar: asignar a un topic existente
  const [darkMode] = await db
    .select()
    .from(topics)
    .where(eq(topics.title, "dark-mode"));
  await assignEntryToTopic(e1, darkMode.id);
  const [moved] = await db.select().from(entries).where(eq(entries.id, e1));
  console.log(
    "3) asignada a dark-mode:",
    moved.topic_id === darkMode.id ? "OK" : "FALLO"
  );

  // Regla 2: fuera del inbox no se borra
  try {
    await deleteInboxEntry(e1);
    console.log("4) FALLO: dejó borrar una entry que pertenece a un topic");
  } catch (err) {
    console.log("4) borrar fuera del inbox bloqueado OK:", (err as Error).message);
  }

  // Procesar creando topic nuevo: la entry queda como origen
  const e2 = await captureEntry({ body: "Prueba: idea que merece topic propio" });
  const newTopicId = await createTopicFromEntry(e2, "topic-de-prueba");
  const [newTopic] = await db.select().from(topics).where(eq(topics.id, newTopicId));
  const [e2row] = await db.select().from(entries).where(eq(entries.id, e2));
  const newTopicEvents = await db
    .select()
    .from(events)
    .where(eq(events.topic_id, newTopicId));
  console.log(
    "5) topic desde entry:",
    newTopic.origin_entry_id === e2 && e2row.topic_id === newTopicId
      ? "OK"
      : "FALLO",
    "| evento created:",
    newTopicEvents.some((e) => e.type === "created") ? "OK" : "FALLO"
  );

  // Borrar una captura que sí está en el inbox
  const e3 = await captureEntry({ body: "Prueba: esta se borra" });
  await deleteInboxEntry(e3);
  const gone = await db.select().from(entries).where(eq(entries.id, e3));
  console.log("6) borrar en inbox:", gone.length === 0 ? "OK" : "FALLO");

  // --- Fase 2: el caso "Martina trae dos debates en un mensaje" ---
  const eMartina = await captureEntry({
    body: "Martina: el buscador no encuentra acentos, y ¿podría buscar también en archivados?",
    topicId: darkMode.id,
    authorLabel: "Martina",
  });
  const th1 = await createThread({
    topicId: darkMode.id,
    title: "acentos en búsqueda",
    originEntryId: eMartina,
  });
  const th2 = await createThread({
    topicId: darkMode.id,
    title: "buscar en archivados",
    originEntryId: eMartina,
  });
  const [row1] = await db.select().from(threads).where(eq(threads.id, th1));
  const [row2] = await db.select().from(threads).where(eq(threads.id, th2));
  console.log(
    "7) una entry partida en dos threads:",
    row1.origin_entry_id === eMartina && row2.origin_entry_id === eMartina
      ? "OK"
      : "FALLO"
  );

  // Entry dentro de un thread (el topic se deduce del thread)
  const eInThread = await captureEntry({
    body: "Prueba: normalizar con unaccent",
    threadId: th1,
  });
  const [inThread] = await db.select().from(entries).where(eq(entries.id, eInThread));
  console.log(
    "8) entry dentro del thread:",
    inThread.thread_id === th1 && inThread.topic_id === darkMode.id ? "OK" : "FALLO"
  );

  // Subthread (nivel 2) OK; sub-subthread (nivel 3) debe rechazarse
  const sub = await createThread({
    topicId: darkMode.id,
    title: "solo tildes, no eñes",
    parentThreadId: th1,
  });
  console.log("9) subthread creado OK");
  try {
    await createThread({
      topicId: darkMode.id,
      title: "no debería existir",
      parentThreadId: sub,
    });
    console.log("10) FALLO: dejó crear un nivel 3");
  } catch (err) {
    console.log("10) profundidad máx 2 validada OK:", (err as Error).message);
  }

  // Evento created estampado para los threads nuevos
  const thEvents = await db.select().from(events).where(eq(events.thread_id, th1));
  console.log(
    "11) evento created del thread:",
    thEvents.some((e) => e.type === "created") ? "OK" : "FALLO"
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
