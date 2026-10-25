import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../helpers/sendJson.js";
import { authService } from "./auth.service.js";

// Controller = HTTP only: read the request, call the service, write the response.

async function signup(req: IncomingMessage, res: ServerResponse) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { message: "Invalid JSON" });
  }
  // "null" and "5" are valid JSON but have no fields to read
  if (!body || typeof body !== "object") {
    return sendJson(res, 400, { message: "Invalid JSON" });
  }

  console.log({ method: req.method, url: req.url, body });

  try {
    const result = await authService.signup(body.email, body.password);
    if (result.reason === "validation")
      return sendJson(res, 400, { errors: result.errors });
    if (result.reason === "duplicate")
      return sendJson(res, 409, { errors: result.errors });
    sendJson(res, 201, { message: "Account created", user: result.user });
  } catch (error) {
    console.log(error);
    sendJson(res, 500, { message: "Something went wrong" });
  }
}

async function login(req: IncomingMessage, res: ServerResponse) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return sendJson(res, 400, { message: "Invalid JSON" });
  }
  // "null" and "5" are valid JSON but have no fields to read
  if (!body || typeof body !== "object") {
    return sendJson(res, 400, { message: "Invalid JSON" });
  }

  console.log({
    method: req.method,
    url: req.url,
    ip: req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    language: req.headers["accept-language"],
    body,
  });

  try {
    const result = await authService.login(body.email, body.password);
    if (!result) {
      return sendJson(res, 401, { message: "Wrong email or password" });
    }
    sendJson(res, 200, { message: "Logged in", ...result });
  } catch (error) {
    console.log(error);
    sendJson(res, 500, { message: "Something went wrong" });
  }
}

async function logout(req: IncomingMessage, res: ServerResponse) {
  // Frontend part sends it as "Authorization: Bearer <id>".
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    await authService.logout(sessionId);
  } catch (error) {
    console.log(error);
    return sendJson(res, 500, { message: "Something went wrong" });
  }

  sendJson(res, 200, { message: "Logged out" });
}

export const authController = {
  signup,
  login,
  logout,
};
