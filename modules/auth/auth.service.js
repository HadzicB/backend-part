import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "../../db.js";
import { sendJson } from "../../helpers/sendJson.js";
import { usersService } from "../users/users.service.js";

const scryptAsync = promisify(scrypt);
const SESSION_DURATION_MS = 20 * 60 * 1000; // 20 minutes

// Store "salt:hash". The random salt makes equal passwords hash differently.
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString("hex")}`;
}

// If other services need to use our users they need to what was used for hashing:
// argon2 and something else is standard
// Standard-format version (argon2id). Output is self-describing:
// $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

// async function hashPassword2(password) {
//   const argon2 = await import("argon2");
//   return argon2.hash(password);
// }

async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = await scryptAsync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  // timingSafeEqual compares in constant time (no timing leaks)
  return keyBuffer.length === hash.length && timingSafeEqual(keyBuffer, hash);
}

async function signup(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);

  console.log({ method: req.method, url: req.url, body });

  // Never trust the client's validation, check again on the server
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const errors = {};
  if (!email) errors.email = ["This field is required"];
  else if (!email.includes("@")) errors.email = ["Enter a valid email"];
  if (!password) errors.password = ["This field is required"];
  else if (password.length < 8)
    errors.password = ["Password must be at least 8 characters"];

  if (Object.keys(errors).length > 0) return sendJson(res, 400, { errors });

  try {
    const hash = await hashPassword(password);
    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [email, hash],
    );
    sendJson(res, 201, { message: "Account created", user: rows[0] });
  } catch (error) {
    // 23505 = unique_violation: that username already exists
    if (error.code === "23505") {
      return sendJson(res, 409, {
        errors: { email: ["This email is already registered"] },
      });
    }
    console.log(error);
    sendJson(res, 500, { message: "Something went wrong" });
  }
}

async function login(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);

  console.log({
    method: req.method,
    url: req.url,
    ip: req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    language: req.headers["accept-language"],
    body,
  });

  const { rows } = await pool.query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [String(body.email ?? "").trim()],
  );

  const user = rows[0];
  const valid =
    user &&
    (await verifyPassword(String(body.password ?? ""), user.password_hash));

  if (!valid) {
    return sendJson(res, 401, { message: "Wrong email or password" });
  }
  // 32 random bytes = 64 hex chars. Unguessable, so it works as the "key".
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  try {
    await pool.query(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
      [sessionId, user.id, expiresAt],
    );
    await usersService.incrementLoginCount(user.id);
  } catch (error) {
    console.log(error);
    return sendJson(res, 500, { message: "Something went wrong" });
  }

  sendJson(res, 200, {
    message: "Logged in",
    user: { id: user.id, username: user.username },
    session: { id: sessionId, expiresAt },
  });
}

async function logout(req, response) {
  // Frontend part sends it as "Authorization: Bearer <id>".
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    // Deleting the row is the real logout. Safe to repeat: no row is fine too.
    if (sessionId) {
      await pool.query("DELETE FROM sessions WHERE id = $1", [sessionId]);
    }
  } catch (error) {
    console.log(error);
    return sendJson(response, 500, { message: "Something went wrong" });
  }

  sendJson(response, 200, { message: "Logged out" });
}

async function isSessionActive(sessionId) {
  if (!sessionId) return false;
  const { rowCount } = await pool.query(
    "SELECT 1 FROM sessions WHERE id = $1 AND expires_at > now()",
    [sessionId],
  );
  return rowCount > 0;
}

export const authService = {
  signup,
  login,
  logout,
  isSessionActive,
};
