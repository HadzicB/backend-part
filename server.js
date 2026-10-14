import http from "node:http";
import { initDb, pool } from "./db.js";
import { authService } from "./modules/auth/auth.service.js";

await initDb();

http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/login")
      return authService.login(req, res);
    if (req.method === "POST" && req.url === "/signup")
      return authService.signup(req, res);
    if (req.method === "POST" && req.url === "/logout")
      return authService.logout(req, res);

    const { rows } = await pool.query(
      "SELECT id, username, login_count FROM users",
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  })
  .listen(8080, () => console.log("http://localhost:8080"));
