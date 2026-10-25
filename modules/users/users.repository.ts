import { pool } from "../../db.js";

// Repository = data access only: SQL in, rows out. No business rules, no req/res.

// The database does the +1 itself. Reading the number into JS, adding 1 and
// writing it back would lose counts when two logins happen at the same time.
async function incrementLoginCount(userId: number) {
  await pool.query(
    "UPDATE users SET login_count = login_count + 1 WHERE id = $1",
    [userId],
  );
}

async function findBySessionId(sessionId: string) {
  const { rows } = await pool.query(
    `SELECT u.id, u.username
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sessionId],
  );
  return rows[0] ?? null;
}

// Returns the new user, or null if the username is taken (23505 = unique_violation).
async function createUser(username: string, passwordHash: string) {
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [username, passwordHash],
    );
    return rows[0];
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return null;
    throw error;
  }
}

async function findByUsername(username: string) {
  const { rows } = await pool.query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [username],
  );
  return rows[0] ?? null;
}

export const usersRepository = {
  incrementLoginCount,
  findBySessionId,
  createUser,
  findByUsername,
};
