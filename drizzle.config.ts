import { defineConfig } from "drizzle-kit";

// A geração de migrações usa apenas o esquema local. Comandos que acessam o banco
// continuam exigindo DATABASE_URL válida no ambiente em que forem executados.
const connectionString = process.env.DATABASE_URL || "mysql://codex_user:codex_local_only@127.0.0.1:3306/codex_academico";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
