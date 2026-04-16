import "server-only";

import { Pool } from "pg";

declare global {
  // Reuse the same pool across hot reloads in development.
  var __pattayabevPool: Pool | undefined;
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createPool() {
  return new Pool({
    connectionString: getRequiredEnv("DATABASE_URL"),
    ssl: {
      rejectUnauthorized: false
    }
  });
}

function getPool() {
  const pool = global.__pattayabevPool ?? createPool();

  if (process.env.NODE_ENV !== "production") {
    global.__pattayabevPool = pool;
  }

  return pool;
}

export const db = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    const pool = getPool();
    const value = Reflect.get(pool, property, receiver);

    return typeof value === "function" ? value.bind(pool) : value;
  }
});
