import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/*/src/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    exclude: [
      "**/node_modules/**",
      "livekit/**",
      "meet/**",
      // Real-database suite: run with `bun run test:integration`.
      "apps/*/src/test-integration/**",
    ],
    // Unit tests never need a real .env or a real database.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5437/focusup_unit_unused",
      CORS_ORIGIN: "http://localhost:3001",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      BETTER_AUTH_URL: "http://localhost:3000",
      LIVEKIT_API_KEY: "testkey",
      LIVEKIT_API_SECRET: "test-livekit-secret-test-livekit-secret",
    },
  },
});
