import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["netlify/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    env: {
      NETLIFY_DB_URL:
        "postgres://test:test@localhost:5432/test?sslmode=disable",
    },
  },
});
