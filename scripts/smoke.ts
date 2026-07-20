import { isNull, eq } from "drizzle-orm";
import { db } from "../db";
import { entries, topics, threads, events, triggers } from "../db/schema";
import {
  captureEntry,
  assignEntryToTopic,
  createTopicFromEntry,
  createThread,
  deleteInboxEntry,
  archiveTarget,
  reactivateTarget,
  snoozeTarget,
  resolveTrigger,
  pendingTriggerFor,
  shipTopic,
  convergeTopics,
} from "../db/mutations";

// Smoke test de los flujos de Fases 1 a 4 contra la DB real.
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

  // --- Fase 3: estados y eventos ---

  // Regla 3: archivar sin motivo es imposible
  try {
    await archiveTarget({ targetType: "thread", id: th2, reason: "   " });
    console.log("12) FALLO: dejó archivar sin motivo");
  } catch (err) {
    console.log("12) archivar sin motivo bloqueado OK:", (err as Error).message);
  }

  // Archivar con motivo: cambia el estado Y estampa el evento (regla 4)
  await archiveTarget({
    targetType: "thread",
    id: th2,
    reason: "convergerá con la búsqueda general",
  });
  const [archivedTh] = await db.select().from(threads).where(eq(threads.id, th2));
  const archEvents = await db.select().from(events).where(eq(events.thread_id, th2));
  const archEvent = archEvents.find((e) => e.type === "archived");
  console.log(
    "13) thread archivado:",
    archivedTh.state === "archived" ? "OK" : "FALLO",
    "| evento con motivo:",
    archEvent && JSON.parse(archEvent.payload).reason ? "OK" : "FALLO"
  );

  // Reactivar: vuelve a active y deja su evento
  await reactivateTarget({ targetType: "thread", id: th2 });
  const [reTh] = await db.select().from(threads).where(eq(threads.id, th2));
  const reEvents = await db.select().from(events).where(eq(events.thread_id, th2));
  console.log(
    "14) thread reactivado:",
    reTh.state === "active" ? "OK" : "FALLO",
    "| evento reactivated:",
    reEvents.some((e) => e.type === "reactivated") ? "OK" : "FALLO"
  );

  // Lo mismo a nivel topic (con el topic de prueba de la Fase 1)
  const [testTopic] = await db
    .select()
    .from(topics)
    .where(eq(topics.title, "topic-de-prueba"));
  await archiveTarget({
    targetType: "topic",
    id: testTopic.id,
    reason: "era solo una prueba",
  });
  const [archTopic] = await db.select().from(topics).where(eq(topics.id, testTopic.id));
  const topicEvents = await db.select().from(events).where(eq(events.topic_id, testTopic.id));
  console.log(
    "15) topic archivado con motivo:",
    archTopic.state === "archived" &&
      topicEvents.some(
        (e) => e.type === "archived" && !e.thread_id && JSON.parse(e.payload).reason
      )
      ? "OK"
      : "FALLO"
  );

  // --- Fase 4: disparadores y Reentry ---

  // Snooze con disparador de fecha (pasado, para probar Reentry ya mismo)
  await snoozeTarget({
    targetType: "thread",
    id: th1,
    trigger: { kind: "date", fireDate: "2020-01-01T00:00:00.000Z" },
  });
  const [snoozedTh] = await db.select().from(threads).where(eq(threads.id, th1));
  const trig1 = await pendingTriggerFor("thread", th1);
  console.log(
    "16) snooze con fecha:",
    snoozedTh.state === "snoozed" && trig1?.kind === "date" ? "OK" : "FALLO"
  );

  // Snooze sin motivo/valor debe rechazarse (fecha vacía)
  try {
    await snoozeTarget({
      targetType: "thread",
      id: sub,
      trigger: { kind: "date", fireDate: "" },
    });
    console.log("17) FALLO: dejó snoozear sin fecha");
  } catch (err) {
    console.log("17) snooze sin fecha bloqueado OK:", (err as Error).message);
  }

  // Reentry — salida 1: reactivar (el trigger pasa a fired)
  await resolveTrigger({ triggerId: trig1!.id, action: "reactivate" });
  const [reactivatedTh] = await db.select().from(threads).where(eq(threads.id, th1));
  const [firedTrig1] = await db.select().from(triggers).where(eq(triggers.id, trig1!.id));
  console.log(
    "18) reentry → reactivar:",
    reactivatedTh.state === "active" && firedTrig1.status === "fired" ? "OK" : "FALLO"
  );

  // Snooze con condición, luego Reentry — salida 2: re-dormir con nuevo disparador
  await snoozeTarget({
    targetType: "thread",
    id: sub,
    trigger: { kind: "condition", conditionText: "cuando cierre la Fase 4" },
  });
  const trig2 = await pendingTriggerFor("thread", sub);
  await resolveTrigger({
    triggerId: trig2!.id,
    action: "resnooze",
    trigger: { kind: "backlog" },
  });
  const [resnoozedSub] = await db.select().from(threads).where(eq(threads.id, sub));
  const [firedTrig2] = await db.select().from(triggers).where(eq(triggers.id, trig2!.id));
  const trig3 = await pendingTriggerFor("thread", sub);
  console.log(
    "19) reentry → re-dormir:",
    resnoozedSub.state === "snoozed" &&
      firedTrig2.status === "fired" &&
      trig3?.kind === "backlog"
      ? "OK"
      : "FALLO"
  );

  // Reentry — salida 3: archivar (motivo obligatorio, igual que la Fase 3)
  await resolveTrigger({
    triggerId: trig3!.id,
    action: "archive",
    reason: "ya no aplica",
  });
  const [archivedSub] = await db.select().from(threads).where(eq(threads.id, sub));
  console.log(
    "20) reentry → archivar:",
    archivedSub.state === "archived" ? "OK" : "FALLO"
  );

  // No se puede resolver dos veces el mismo trigger
  try {
    await resolveTrigger({ triggerId: trig1!.id, action: "reactivate" });
    console.log("21) FALLO: dejó resolver un trigger ya resuelto");
  } catch (err) {
    console.log("21) trigger ya resuelto bloqueado OK:", (err as Error).message);
  }

  // --- Fase 5: Shipped y Convergence ---

  // Shipped: estampa la versión del producto SIN cambiar el estado (regla 6)
  await shipTopic({ topicId: darkMode.id, version: "v9.9-test" });
  const [dmAfterShip] = await db.select().from(topics).where(eq(topics.id, darkMode.id));
  const dmEvents = await db.select().from(events).where(eq(events.topic_id, darkMode.id));
  const shipEv = dmEvents.find(
    (e) => e.type === "shipped" && JSON.parse(e.payload).version === "v9.9-test"
  );
  console.log(
    "22) shipped estampa versión sin cambiar estado:",
    shipEv && dmAfterShip.state === darkMode.state ? "OK" : "FALLO"
  );

  // Convergence hacia un destino NUEVO: orígenes archivados + links de ida/vuelta
  const cvA = await createTopicFromEntry(
    await captureEntry({ body: "Convergence origen A" }),
    "convergence-A"
  );
  const cvB = await createTopicFromEntry(
    await captureEntry({ body: "Convergence origen B" }),
    "convergence-B"
  );
  const destId = await convergeTopics({
    sourceTopicIds: [cvA, cvB],
    destination: { kind: "new", title: "convergence-destino" },
  });
  const [rowA] = await db.select().from(topics).where(eq(topics.id, cvA));
  const [rowB] = await db.select().from(topics).where(eq(topics.id, cvB));
  const evA = await db.select().from(events).where(eq(events.topic_id, cvA));
  const evDest = await db.select().from(events).where(eq(events.topic_id, destId));
  const ciA = evA.find((e) => e.type === "converged_into");
  const cfDest = evDest.find((e) => e.type === "converged_from");
  const ciPayload = ciA ? JSON.parse(ciA.payload) : {};
  const cfPayload = cfDest ? JSON.parse(cfDest.payload) : {};
  console.log(
    "23) convergencia: orígenes archivados:",
    rowA.state === "archived" && rowB.state === "archived" ? "OK" : "FALLO"
  );
  console.log(
    "24) navegación de ida (origen → destino):",
    ciPayload.into_topic_id === destId ? "OK" : "FALLO",
    "| de vuelta (destino → orígenes):",
    Array.isArray(cfPayload.from) &&
      cfPayload.from.some((s: { topic_id: string }) => s.topic_id === cvA) &&
      cfPayload.from.some((s: { topic_id: string }) => s.topic_id === cvB)
      ? "OK"
      : "FALLO"
  );

  // Convergence hacia un destino EXISTENTE
  const cvC = await createTopicFromEntry(
    await captureEntry({ body: "Convergence origen C" }),
    "convergence-C"
  );
  const cvD = await createTopicFromEntry(
    await captureEntry({ body: "Convergence origen D" }),
    "convergence-D"
  );
  await convergeTopics({
    sourceTopicIds: [cvC, cvD],
    destination: { kind: "existing", topicId: destId },
  });
  const [rowC] = await db.select().from(topics).where(eq(topics.id, cvC));
  const evDest2 = await db.select().from(events).where(eq(events.topic_id, destId));
  console.log(
    "25) convergencia a topic existente:",
    rowC.state === "archived" &&
      evDest2.filter((e) => e.type === "converged_from").length >= 2
      ? "OK"
      : "FALLO"
  );

  // Validaciones: menos de 2 orígenes, y destino que también es origen
  try {
    await convergeTopics({
      sourceTopicIds: [cvA],
      destination: { kind: "new", title: "no-debería-crearse" },
    });
    console.log("26) FALLO: dejó converger con un solo origen");
  } catch (err) {
    console.log("26) convergir <2 orígenes bloqueado OK:", (err as Error).message);
  }
  try {
    await convergeTopics({
      sourceTopicIds: [destId, cvA],
      destination: { kind: "existing", topicId: destId },
    });
    console.log("27) FALLO: dejó que el destino sea también un origen");
  } catch (err) {
    console.log("27) destino = origen bloqueado OK:", (err as Error).message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
