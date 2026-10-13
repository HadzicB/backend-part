import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { pool } from "../../db.js";

const scryptAsync = promisify(scrypt);

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

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function signup(req, res) {
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

export async function login(req, res) {
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
  sendJson(res, 200, {
    message: "Logged in",
    user: { id: user.id, username: user.username },
  });
}
