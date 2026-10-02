import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a real Postgres (see apps/api/scripts/test-integration.mjs,
 * which creates and migrates the focusup_test database first). Run with:
 *
 *   bun run test:integration
 *
 * They are not part of the pre-commit hook because they need Docker Postgres running.
 */
export default defineConfig({
  test: {
    include: ["apps/*/src/test-integration/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    // lib/prisma.ts uses a stub client when NODE_ENV is "test", so use "development".
    // Tests of the verification gate need the real rule, whatever apps/api/.env says.
    env: { NODE_ENV: "development", SKIP_EMAIL_VERIFICATION: "false" },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
