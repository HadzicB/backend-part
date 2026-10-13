import http from "node:http";
import { initDb, pool } from "./db.js";
import { login, signup } from "./modules/auth/auth.service.js";

await initDb();

http
  .createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/login") return login(req, res);
    if (req.method === "POST" && req.url === "/signup") return signup(req, res);

    const { rows } = await pool.query(
      "SELECT id, username, login_count FROM users",
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  })
  .listen(8080, () => console.log("http://localhost:8080"));
