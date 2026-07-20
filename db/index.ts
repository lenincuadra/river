import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "./schema";

// Un solo archivo local, fácil de respaldar: copiar river.db (regla 8).
export const sqlite = new Database(path.join(process.cwd(), "river.db"));
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
