import http from "node:http";
import { pool, initDb } from "./db.js";

await initDb();

http
  .createServer(async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, username, login_count FROM users",
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  })
  .listen(3000, () => console.log("http://localhost:3000"));
