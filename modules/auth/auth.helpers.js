import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Store "salt:hash". The random salt makes equal passwords hash differently.
export async function hashPassword(password) {
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

export async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = await scryptAsync(password, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  // timingSafeEqual compares in constant time (no timing leaks)
  return keyBuffer.length === hash.length && timingSafeEqual(keyBuffer, hash);
}
