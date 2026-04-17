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
  },
  has(_target, property) {
    const pool = getPool();
    return property in pool;
  },
  getOwnPropertyDescriptor(_target, property) {
    const pool = getPool();
    const descriptor = Object.getOwnPropertyDescriptor(pool, property);

    if (descriptor) {
      return descriptor;
    }

    if (property in pool) {
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: Reflect.get(pool, property, pool)
      };
    }

    return undefined;
  }
});
