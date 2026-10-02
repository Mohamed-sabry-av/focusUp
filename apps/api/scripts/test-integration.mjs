// Prepares a real test database, then runs the integration tests against it.
//   bun run test:integration
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "../../..");

dotenv.config({ path: path.join(root, "apps/api/.env") });
dotenv.config({ path: path.join(root, ".env") });

const TEST_DB_NAME = "focusup_test";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (expected in apps/api/.env).");
  process.exit(1);
}

// Same server as development, different database.
const devUrl = new URL(process.env.DATABASE_URL);
const testUrl = new URL(devUrl.toString());
testUrl.pathname = `/${TEST_DB_NAME}`;

async function ensureTestDatabase() {
  const adminUrl = new URL(devUrl.toString());
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      TEST_DB_NAME,
    ]);
    if (!rowCount) {
      await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`Created database ${TEST_DB_NAME}`);
    }
  } finally {
    await client.end();
  }
}

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv, DATABASE_URL: testUrl.toString() },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  await ensureTestDatabase();
} catch (error) {
  console.error("Could not reach Postgres. Is `docker compose up -d postgres` running?");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

run("bunx", ["prisma", "migrate", "deploy", "--config", "apps/api/prisma.config.ts"]);
run("bunx", ["vitest", "run", "--config", "vitest.integration.config.ts"]);
