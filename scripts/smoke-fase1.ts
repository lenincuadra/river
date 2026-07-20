import { isNull, eq } from "drizzle-orm";
import { db } from "../db";
import { entries, topics, events } from "../db/schema";
import {
  captureEntry,
  assignEntryToTopic,
  createTopicFromEntry,
  deleteInboxEntry,
} from "../db/mutations";

// Smoke test de los flujos de Fase 1 contra la DB real.
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
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
