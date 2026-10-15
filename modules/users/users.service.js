import { pool } from "../../db.js";
import { sendJson } from "../../helpers/sendJson.js";

// The database does the +1 itself. Reading the number into JS, adding 1 and
// writing it back would lose counts when two logins happen at the same time.
async function incrementLoginCount(userId) {
  await pool.query(
    "UPDATE users SET login_count = login_count + 1 WHERE id = $1",
    [userId],
  );
}

async function getCurrentUser(req, res) {
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > now()`,
      [sessionId],
    );
    const user = rows[0];
    if (!user) return sendJson(res, 401, { message: "Not logged in" });
    sendJson(res, 200, { user });
  } catch (error) {
    console.log(error);
    sendJson(res, 500, { message: "Something went wrong" });
  }
}

export const usersService = {
  incrementLoginCount,
  getCurrentUser,
};
