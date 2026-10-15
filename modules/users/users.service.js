import { usersRepository } from "./users.repository.js";

// Service = business logic, no req/res and no SQL.
async function incrementLoginCount(userId) {
  await usersRepository.incrementLoginCount(userId);
}

// Rule: no session ID means no user, so we don't even query the database.
async function getUserBySession(sessionId) {
  if (!sessionId) return null;
  return usersRepository.findBySessionId(sessionId);
}

// null = the username is already taken
async function createUser(username, passwordHash) {
  return usersRepository.createUser(username, passwordHash);
}

async function findUserByUsername(username) {
  return usersRepository.findByUsername(username);
}

export const usersService = {
  incrementLoginCount,
  getUserBySession,
  createUser,
  findUserByUsername,
};
