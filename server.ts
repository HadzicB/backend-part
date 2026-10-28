import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { initDb } from "./db.js";
import { authController } from "./modules/auth/auth.controller.js";
import { authService } from "./modules/auth/auth.service.js";
import { usersController } from "./modules/users/users.controller.js";

await initDb();

const app = express();
const port = 8080;

const PUBLIC_ROUTES = ["POST /login", "POST /signup"];

// Guard: default deny. req.path is the path without the query string.
async function userAuthorized(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_ROUTES.includes(`${req.method} ${req.path}`)) return next();
  const sessionId = req.headers.authorization?.replace("Bearer ", "");

  const isAuthorized = await authService.isSessionActive(sessionId);

  if (!isAuthorized) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

// Reads the JSON body into req.body. Malformed JSON (and strict mode rejects
// "null" and "5") is passed to the error middleware below.
app.use(express.json());
app.use(userAuthorized);

app.post("/login", authController.login);
app.post("/signup", authController.signup);
app.post("/logout", authController.logout);
app.get("/users/me", usersController.getCurrentUser);

// Reached only when no route above matched
app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Error middleware (4 arguments). Express 5 also sends rejected promises from
// async handlers and middleware here.
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid JSON" });
  }
  console.log(error);
  if (!res.headersSent) {
    res.status(500).json({ message: "Something went wrong" });
  }
};
app.use(errorHandler);

app.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
