import pg from "pg";

const { Client, Pool } = pg;

const config = { host: "localhost", port: 5432, user: "boha1704" };
const DB_NAME = "practice";

// 1. Create the database if it doesn't exist
async function ensureDatabase() {
  const admin = new Client({ ...config, database: "postgres" });
  await admin.connect();
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [DB_NAME],
  );
  if (rowCount === 0) await admin.query(`CREATE DATABASE ${DB_NAME}`);
  await admin.end();
}

// 2. One shared pool for the whole app
const pool = new Pool({ ...config, database: DB_NAME });

// 3. Create tables if they don't exist
async function initDb() {
  await ensureDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      login_count   INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

export { pool, initDb };
