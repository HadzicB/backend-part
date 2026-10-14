import { pool } from "../../db.js";

// The database does the +1 itself. Reading the number into JS, adding 1 and
// writing it back would lose counts when two logins happen at the same time.
async function incrementLoginCount(userId) {
  await pool.query(
    "UPDATE users SET login_count = login_count + 1 WHERE id = $1",
    [userId],
  );
}

export const usersService = {
  incrementLoginCount,
};
