import { randomUUID } from "node:crypto";
import { db, client } from "../db";
import {
  topics,
  threads,
  entries,
  events,
  eventSources,
  triggers,
} from "../db/schema";

// Datos de ejemplo: el caso dark-mode con Martina (river-plan.md Fase 0,
// espejando river-wireframe-board-v3.html). Vacía las tablas y las repuebla
// (no borra el archivo: un server corriendo ve los datos nuevos al instante,
// y contra Turso no hay archivo que borrar). `npm run db:reset` = push + seed.

const id = () => randomUUID();
const at = (iso: string) => `${iso}:00.000Z`;

async function seed() {
  // topic ↔ entry de origen se referencian mutuamente: ningún orden de
  // inserción satisface las FKs, así que se apagan solo durante el seed.
  // (Turso puede no aceptar el pragma; ahí las FKs ya vienen desactivadas.)
  await client.execute("PRAGMA foreign_keys = OFF").catch(() => {});

  // Empezar de cero: vaciar todas las tablas. El seed es la única excepción
  // a la regla 1 (borra events): repuebla el caso de ejemplo completo.
  for (const table of [
    "event_sources",
    "triggers",
    "events",
    "entry_revisions",
    "entries",
    "threads",
    "topics",
  ]) {
    await client.execute(`DELETE FROM ${table}`);
  }

  // --- IDs cruzados ---
  const topicId = id();
  const originEntryId = id(); // mi propuesta inicial (origen del topic)
  const martinaEntryId = id(); // la entry de Martina que detona dos threads
  const tFixTablets = id();
  const tAutoNoche = id();
  const tAccesibilidad = id();
  const sReproduccion = id();
  const sPaleta = id();
  const sHorarioManual = id();
  const sSunset = id();
  const decisionEventId = id();

  // --- Topic ---
  await db.insert(topics).values({
    id: topicId,
    title: "dark-mode",
    description:
      "Modo oscuro para reducir fatiga visual. Propuesta inicial mía; shippeado en v2.0; reabierto por feedback de Martina en tablets.",
    state: "active",
    origin_entry_id: originEntryId,
    created_at: at("2026-03-02T10:00"),
  });

  // --- Threads y subthreads ---
  await db.insert(threads).values([
    {
      id: tFixTablets,
      topic_id: topicId,
      title: "fix tablets",
      state: "active",
      origin_entry_id: martinaEntryId,
      created_at: at("2026-07-12T11:00"),
    },
    {
      id: tAutoNoche,
      topic_id: topicId,
      title: "auto-noche",
      state: "snoozed",
      origin_entry_id: martinaEntryId,
      created_at: at("2026-07-12T11:05"),
    },
    {
      id: tAccesibilidad,
      topic_id: topicId,
      title: "accesibilidad",
      state: "snoozed",
      created_at: at("2026-07-15T09:00"),
    },
    {
      id: sReproduccion,
      topic_id: topicId,
      parent_thread_id: tFixTablets,
      title: "reproducción del bug",
      state: "archived",
      created_at: at("2026-07-13T10:00"),
    },
    {
      id: sPaleta,
      topic_id: topicId,
      parent_thread_id: tFixTablets,
      title: "paleta >10 pulgadas",
      state: "active",
      created_at: at("2026-07-14T10:00"),
    },
    {
      id: sHorarioManual,
      topic_id: topicId,
      parent_thread_id: tAutoNoche,
      title: "horario manual",
      state: "active",
      created_at: at("2026-07-13T12:00"),
    },
    {
      id: sSunset,
      topic_id: topicId,
      parent_thread_id: tAutoNoche,
      title: "sunset por ubicación",
      state: "snoozed",
      created_at: at("2026-07-14T12:00"),
    },
  ]);

  // --- Entries ---
  await db.insert(entries).values([
    // Main del topic
    {
      id: originEntryId,
      topic_id: topicId,
      author_label: "Yo",
      body: "Propongo un modo oscuro para reducir fatiga visual en sesiones largas de lectura.",
      created_at: at("2026-03-02T10:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      author_label: "Yo",
      body: "Paleta v1 definida en gris azulado. Contraste AA verificado en mobile.",
      created_at: at("2026-03-18T16:00"),
    },
    {
      id: martinaEntryId,
      topic_id: topicId,
      author_label: "Martina",
      body: "El contraste queda ilegible en tablets. Y ya que estamos: ¿no podría activarse solo de noche?",
      created_at: at("2026-07-12T10:30"),
    },
    // Thread: fix tablets
    {
      id: id(),
      topic_id: topicId,
      thread_id: tFixTablets,
      author_label: "Yo",
      body: "Reproducido en iPad de 11\": el gris de fondo pierde contraste con el brillo alto.",
      created_at: at("2026-07-13T09:30"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tFixTablets,
      author_label: "Martina",
      body: "En la Samsung Tab pasa igual, sobre todo de día.",
      created_at: at("2026-07-13T14:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tFixTablets,
      author_label: "Yo",
      body: "El problema es la paleta única: en pantallas grandes necesita más contraste, no es un bug puntual.",
      created_at: at("2026-07-14T09:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tFixTablets,
      author_label: "Yo",
      body: "Prototipo con paleta específica para >10 pulgadas: se ve mucho mejor.",
      created_at: at("2026-07-15T17:00"),
    },
    // SubThread: reproducción del bug (archivado: resuelto)
    {
      id: id(),
      topic_id: topicId,
      thread_id: sReproduccion,
      author_label: "Yo",
      body: "iPad 11\" con brillo máximo: reproducido. Capturas guardadas.",
      created_at: at("2026-07-13T10:15"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sReproduccion,
      author_label: "Martina",
      body: "Confirmo en la Tab S9. Mismo resultado.",
      created_at: at("2026-07-13T18:00"),
    },
    // SubThread: paleta >10 pulgadas (fuente de la decisión)
    {
      id: id(),
      topic_id: topicId,
      thread_id: sPaleta,
      author_label: "Yo",
      body: "Paleta específica para tablets con más contraste: fondos más profundos, texto más claro.",
      created_at: at("2026-07-14T10:30"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sPaleta,
      author_label: "Yo",
      body: "Umbral: se activa a partir de 10 pulgadas de pantalla.",
      created_at: at("2026-07-14T15:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sPaleta,
      author_label: "Martina",
      body: "Probé el prototipo en la tablet: ahora sí se lee perfecto.",
      created_at: at("2026-07-16T11:00"),
    },
    // Thread: auto-noche
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAutoNoche,
      author_label: "Yo",
      body: "Idea de Martina: que el modo oscuro se active solo de noche.",
      created_at: at("2026-07-12T11:10"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAutoNoche,
      author_label: "Martina",
      body: "Pensándolo mejor: prefiero control manual. La automagia molesta cuando trabajo tarde con la luz encendida.",
      created_at: at("2026-07-13T11:30"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAutoNoche,
      author_label: "Yo",
      body: "Queda abierta la variante de seguir el sunset real por ubicación, pero suma complejidad de permisos.",
      created_at: at("2026-07-14T11:45"),
    },
    // SubThread: horario manual (fuente de la decisión)
    {
      id: id(),
      topic_id: topicId,
      thread_id: sHorarioManual,
      author_label: "Yo",
      body: "Horario configurable por el usuario: desde/hasta, sin sorpresas.",
      created_at: at("2026-07-13T12:15"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sHorarioManual,
      author_label: "Martina",
      body: "Eso me sirve: yo lo pondría de 22 a 7.",
      created_at: at("2026-07-13T19:00"),
    },
    // SubThread: sunset por ubicación (dormido junto a auto-noche)
    {
      id: id(),
      topic_id: topicId,
      thread_id: sSunset,
      author_label: "Yo",
      body: "Seguir el atardecer real por ubicación. Requiere permiso de ubicación: evaluar si vale la pena.",
      created_at: at("2026-07-14T12:30"),
    },
    // Thread: accesibilidad
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAccesibilidad,
      author_label: "Yo",
      body: "Revisar contraste AA en ambos temas cuando la paleta de tablets esté cerrada.",
      created_at: at("2026-07-15T09:15"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAccesibilidad,
      author_label: "Yo",
      body: "Incluir a los íconos, no solo al texto.",
      created_at: at("2026-07-15T09:20"),
    },
    // Inbox: capturas sin procesar (topic_id null)
    {
      id: id(),
      author_label: "Yo",
      body: "Idea: exportar un topic entero a Markdown para compartirlo.",
      created_at: at("2026-07-17T20:00"),
    },
    {
      id: id(),
      author_label: "Franco",
      body: "¿Los eventos podrían tener íconos propios en el timeline?",
      created_at: at("2026-07-18T13:00"),
    },
  ]);

  // --- Eventos (inmutables) ---
  await db.insert(events).values([
    {
      id: id(),
      topic_id: topicId,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-03-02T10:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      type: "shipped",
      payload: JSON.stringify({ version: "v2.0" }),
      created_at: at("2026-04-20T12:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tFixTablets,
      type: "created",
      payload: JSON.stringify({ from_entry_id: martinaEntryId }),
      created_at: at("2026-07-12T11:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAutoNoche,
      type: "created",
      payload: JSON.stringify({ from_entry_id: martinaEntryId }),
      created_at: at("2026-07-12T11:05"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sReproduccion,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-07-13T10:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sHorarioManual,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-07-13T12:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sPaleta,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-07-14T10:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sSunset,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-07-14T12:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sSunset,
      type: "snoozed",
      payload: JSON.stringify({
        trigger: "condition",
        condition: "Cuando auto-noche se reactive",
      }),
      created_at: at("2026-07-14T12:40"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAccesibilidad,
      type: "created",
      payload: JSON.stringify({}),
      created_at: at("2026-07-15T09:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAccesibilidad,
      type: "snoozed",
      payload: JSON.stringify({ trigger: "backlog" }),
      created_at: at("2026-07-16T09:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: sReproduccion,
      type: "archived",
      payload: JSON.stringify({ reason: "resuelto" }),
      created_at: at("2026-07-16T10:00"),
    },
    {
      id: decisionEventId,
      topic_id: topicId,
      type: "decision",
      payload: JSON.stringify({
        title: "Sistema de temas adaptativo",
        text: "Paleta por tamaño de pantalla + activación manual configurable. Se descarta la detección automática por ahora.",
      }),
      created_at: at("2026-07-18T15:00"),
    },
    {
      id: id(),
      topic_id: topicId,
      thread_id: tAutoNoche,
      type: "snoozed",
      payload: JSON.stringify({ trigger: "date", fire_date: "2027-01-18" }),
      created_at: at("2026-07-18T15:30"),
    },
  ]);

  // --- Fuentes de la decisión (referencia bidireccional) ---
  await db.insert(eventSources).values([
    {
      id: id(),
      event_id: decisionEventId,
      source_type: "thread",
      source_id: sPaleta,
    },
    {
      id: id(),
      event_id: decisionEventId,
      source_type: "thread",
      source_id: sHorarioManual,
    },
  ]);

  // --- Disparadores pendientes ---
  await db.insert(triggers).values([
    {
      id: id(),
      target_type: "thread",
      target_id: tAutoNoche,
      kind: "date",
      fire_date: at("2027-01-18T09:00"),
      status: "pending",
      created_at: at("2026-07-18T15:30"),
    },
    {
      id: id(),
      target_type: "thread",
      target_id: sSunset,
      kind: "condition",
      condition_text: "Cuando auto-noche se reactive",
      status: "pending",
      created_at: at("2026-07-14T12:40"),
    },
    {
      id: id(),
      target_type: "thread",
      target_id: tAccesibilidad,
      kind: "backlog",
      status: "pending",
      created_at: at("2026-07-16T09:00"),
    },
  ]);

  console.log("Seed listo: topic dark-mode con 3 threads, 4 subthreads, 1 decisión y 2 entries en el inbox.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
