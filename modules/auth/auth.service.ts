import { randomBytes } from "node:crypto";
import { usersService } from "../users/users.service.js";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "./auth.helpers.js";
import type { FieldErrors, LoginResult, SignupResult } from "./auth.types.js";

const SESSION_DURATION_MS = 20 * 60 * 1000; // 20 minutes

// Never trust the client's validation, check again on the server
function validateSignup(email: string, password: string) {
  const errors: FieldErrors = {};
  if (!email) errors.email = ["This field is required"];
  else if (!email.includes("@")) errors.email = ["Enter a valid email"];
  if (!password) errors.password = ["This field is required"];
  else if (password.length < 8)
    errors.password = ["Password must be at least 8 characters"];
  return errors;
}

// Service = business rules, no req/res and no SQL. It never picks HTTP
// statuses: it returns a result and the controller maps it to a status.
async function signup(
  rawEmail: unknown,
  rawPassword: unknown,
): Promise<SignupResult> {
  const email = String(rawEmail ?? "").trim();
  const password = String(rawPassword ?? "");

  const errors = validateSignup(email, password);
  if (Object.keys(errors).length > 0) return { reason: "validation", errors };

  const hash = await hashPassword(password);
  const user = await usersService.createUser(email, hash);
  // null = that username already exists
  if (!user) {
    return {
      reason: "duplicate",
      errors: { email: ["This email is already registered"] },
    };
  }
  return { user };
}

// Returns { user, session }, or null for wrong credentials.
async function login(
  rawEmail: unknown,
  rawPassword: unknown,
): Promise<LoginResult | null> {
  const user = await usersService.findUserByUsername(
    String(rawEmail ?? "").trim(),
  );
  const valid =
    user && (await verifyPassword(String(rawPassword ?? ""), user.password_hash));
  if (!valid) return null;

  // 32 random bytes = 64 hex chars. Unguessable, so it works as the "key".
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await authRepository.createSession(sessionId, user.id, expiresAt);
  await usersService.incrementLoginCount(user.id);

  return {
    user: { id: user.id, username: user.username },
    session: { id: sessionId, expiresAt },
  };
}

// Deleting the row is the real logout. Safe to repeat: no row is fine too.
async function logout(sessionId: string) {
  if (!sessionId) return;
  await authRepository.deleteSession(sessionId);
}

async function isSessionActive(sessionId: string | undefined) {
  if (!sessionId) return false;
  return (await authRepository.findActiveSession(sessionId)) !== null;
}

export const authService = {
  signup,
  login,
  logout,
  isSessionActive,
};
