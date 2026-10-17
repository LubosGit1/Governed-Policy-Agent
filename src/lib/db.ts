import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set before using PostgreSQL.");
}

export const db = new Pool({ connectionString });
