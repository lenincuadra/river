import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Dos instancias, un mismo código (river-plan.md §10):
// - Trabajo/local: sin env vars → archivo river.db en la raíz (backup = copiarlo).
// - Personal/nube: TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) → Turso.
export const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:river.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
