import { Pool } from "pg";

let pool: Pool | undefined;

export function getDbPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before using PostgreSQL.");
  }
  pool = new Pool({ connectionString });
  return pool;
}
