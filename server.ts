import express, { type Express } from "express";
import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import { initDb } from "./db.js";
import { authController } from "./modules/auth/auth.controller.js";
import { authService } from "./modules/auth/auth.service.js";
import { usersController } from "./modules/users/users.controller.js";

await initDb();

const app: Express = express();
const port = 8081;

// Path without the query string: "/login?x=1" is still "/login"
function getPath(req: IncomingMessage) {
  return new URL(req.url ?? "/", "http://localhost").pathname;
}

function registeredRoutes(req: IncomingMessage, res: ServerResponse) {
  const path = getPath(req);
  if (req.method === "POST" && path === "/login")
    return authController.login(req, res);
  if (req.method === "POST" && path === "/signup")
    return authController.signup(req, res);
  if (req.method === "POST" && path === "/logout")
    return authController.logout(req, res);
  if (req.method === "GET" && path === "/users/me")
    return usersController.getCurrentUser(req, res);

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not found" }));
}

const PUBLIC_ROUTES = ["POST /login", "POST /signup"];

type Next = () => Promise<void>;

async function userAuthorized(
  req: IncomingMessage,
  res: ServerResponse,
  next: Next,
) {
  if (PUBLIC_ROUTES.includes(`${req.method} ${getPath(req)}`)) return next();
  const sessionId = req.headers.authorization?.replace("Bearer ", "");

  const isAuthorized = await authService.isSessionActive(sessionId);

  if (!isAuthorized) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Not authenticated" }));
    return res;
  } else {
    return next();
  }
}

const steps = [userAuthorized, registeredRoutes];

function run(req: IncomingMessage, res: ServerResponse) {
  let i = 0;
  const next: Next = async () => {
    const step = steps[i++];
    if (step) await step(req, res, next);
  };
  next().catch((error) => {
    console.log(error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Something went wrong" }));
    }
  });
}
http.createServer(run).listen(8080, () => console.log("http://localhost:8080"));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
