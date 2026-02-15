import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./netlify/functions/_shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  migrations: {
    prefix: "timestamp",
  },
});
