import {
  sqliteTable,
  text,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

// Modelo de datos de river-plan.md §4. Fechas como ISO 8601 en texto.
// La tabla `events` es inmutable: sin UPDATE ni DELETE, jamás (regla 1).

export const topics = sqliteTable("topics", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  state: text("state", { enum: ["active", "snoozed", "archived"] })
    .notNull()
    .default("active"),
  // La entry que originó el topic (ej: la nota donde cité a Martina). Null si nació directo.
  origin_entry_id: text("origin_entry_id").references(
    (): AnySQLiteColumn => entries.id
  ),
  created_at: text("created_at").notNull(),
});

export const threads = sqliteTable("threads", {
  id: text("id").primaryKey(),
  topic_id: text("topic_id")
    .notNull()
    .references(() => topics.id),
  // null = thread; con valor = subthread. Profundidad máx 2, validar en backend (regla 5).
  parent_thread_id: text("parent_thread_id").references(
    (): AnySQLiteColumn => threads.id
  ),
  title: text("title").notNull(),
  state: text("state", { enum: ["active", "snoozed", "archived"] })
    .notNull()
    .default("active"),
  origin_entry_id: text("origin_entry_id").references(
    (): AnySQLiteColumn => entries.id
  ),
  created_at: text("created_at").notNull(),
});

export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  // null mientras está en el inbox
  topic_id: text("topic_id").references(() => topics.id),
  // null = vive en el main del topic
  thread_id: text("thread_id").references(() => threads.id),
  author_label: text("author_label").notNull().default("Yo"),
  body: text("body").notNull(),
  created_at: text("created_at").notNull(),
  // Si tiene valor, la UI muestra "editado". Los eventos no se editan; las entries sí.
  edited_at: text("edited_at"),
});

// Snapshot del texto anterior cuando se edita una entry citada como fuente de una decisión.
export const entryRevisions = sqliteTable("entry_revisions", {
  id: text("id").primaryKey(),
  entry_id: text("entry_id")
    .notNull()
    .references(() => entries.id),
  body: text("body").notNull(),
  replaced_at: text("replaced_at").notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  topic_id: text("topic_id")
    .notNull()
    .references(() => topics.id),
  thread_id: text("thread_id").references(() => threads.id),
  type: text("type", {
    enum: [
      "created",
      "snoozed",
      "awakened",
      "reactivated",
      "archived",
      "shipped",
      "decision",
      "converged_into",
      "converged_from",
    ],
  }).notNull(),
  // JSON: motivo, versión, disparador, topic destino/origen según type.
  // En `shipped` puede incluir `decision_id` para linkear qué decisión materializa.
  payload: text("payload").notNull().default("{}"),
  created_at: text("created_at").notNull(),
});

// Fuentes citadas por un evento (usada por eventos `decision`).
export const eventSources = sqliteTable("event_sources", {
  id: text("id").primaryKey(),
  event_id: text("event_id")
    .notNull()
    .references(() => events.id),
  source_type: text("source_type", { enum: ["thread", "entry"] }).notNull(),
  source_id: text("source_id").notNull(),
});

export const triggers = sqliteTable("triggers", {
  id: text("id").primaryKey(),
  target_type: text("target_type", { enum: ["topic", "thread"] }).notNull(),
  target_id: text("target_id").notNull(),
  kind: text("kind", { enum: ["date", "condition", "backlog"] }).notNull(),
  fire_date: text("fire_date"),
  condition_text: text("condition_text"),
  status: text("status", { enum: ["pending", "fired", "dismissed"] })
    .notNull()
    .default("pending"),
  created_at: text("created_at").notNull(),
});
