import { defineConfig } from "drizzle-kit";

// Sin env vars apunta al archivo local; con TURSO_DATABASE_URL, a Turso.
// Así `npm run db:push` sirve para preparar cualquiera de las dos instancias.
export default defineConfig(
  process.env.TURSO_DATABASE_URL
    ? {
        dialect: "turso",
        schema: "./db/schema.ts",
        out: "./drizzle",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {
        dialect: "sqlite",
        schema: "./db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: "river.db" },
      }
);
