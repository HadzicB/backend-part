import http from "node:http";
import { initDb } from "./db.js";
import { authService } from "./modules/auth/auth.service.js";
import { usersService } from "./modules/users/users.service.js";

await initDb();

function registeredRoutes(req, res) {
  if (req.method === "POST" && req.url === "/login")
    return authService.login(req, res);
  if (req.method === "POST" && req.url === "/signup")
    return authService.signup(req, res);
  if (req.method === "POST" && req.url === "/logout")
    return authService.logout(req, res);
  if (req.method === "GET" && req.url === "/me")
    return usersService.getCurrentUser(req, res);

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
}

const PUBLIC_ROUTES = ["POST /login", "POST /signup"];

async function userAuthorized(req, res, next) {
  if (PUBLIC_ROUTES.includes(`${req.method} ${req.url}`)) return next();
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

function run(req, res) {
  let i = 0;
  const next = async () => {
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
