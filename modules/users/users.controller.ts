import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../../helpers/sendJson.js";
import { usersService } from "./users.service.js";

// Controller = HTTP only: read the request, call the service, write the response.
async function getCurrentUser(req: IncomingMessage, res: ServerResponse) {
  const sessionId = (req.headers.authorization ?? "").replace("Bearer ", "");

  try {
    const user = await usersService.getUserBySession(sessionId);
    if (!user) return sendJson(res, 401, { message: "Not authenticated" });
    sendJson(res, 200, { user });
  } catch (error) {
    console.log(error);
    sendJson(res, 500, { message: "Something went wrong" });
  }
}

export const usersController = {
  getCurrentUser,
};
