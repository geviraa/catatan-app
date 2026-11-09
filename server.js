const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
app.use(express.urlencoded({ extended: false }));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "database",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function initDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS notes (
           id INT AUTO_INCREMENT PRIMARY KEY,
           isi VARCHAR(255) NOT NULL,
           dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`
      );
      console.log("Database siap.");
      return;
    } catch (err) {
      console.log(`Menunggu database (${i}/30): ${err.code || err.message}`);
      await sleep(2000);
    }
  }
  throw new Error("Database tidak dapat dihubungi.");
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

app.get("/", async (req, res) => {
  const [rows] = await pool.query("SELECT id, isi, dibuat FROM notes ORDER BY id DESC");
  const daftar = rows.length
    ? rows
        .map(
          (r) => `<li><span>${esc(r.isi)}</span>
            <form method="POST" action="/hapus/${r.id}"><button class="del">Hapus</button></form></li>`
        )
        .join("")
    : "<li class='kosong'>Belum ada catatan.</li>";

  res.send(`<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Catatan Praktikum Docker</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f4f6fb;margin:0;padding:24px;color:#1b2430}
  .box{max-width:560px;margin:auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 12px #0001}
  h1{margin-top:0;font-size:22px} small{color:#667}
  form.tambah{display:flex;gap:8px;margin:16px 0}
  input{flex:1;padding:10px;border:1px solid #ccd;border-radius:8px}
  button{padding:10px 14px;border:0;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer}
  button.del{background:#dc2626;padding:6px 10px}
  ul{list-style:none;padding:0} li{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee}
  li form{margin:0} .kosong{color:#889}
</style></head><body><div class="box">
<h1>Catatan Praktikum Docker</h1>
<small>Node.js + MySQL, berjalan di Docker Compose (Azure VM) | Total: ${rows.length} catatan</small>
<form class="tambah" method="POST" action="/tambah">
  <input name="isi" maxlength="255" placeholder="Tulis catatan..." required>
  <button>Tambah</button>
</form>
<ul>${daftar}</ul>
</div></body></html>`);
});

app.post("/tambah", async (req, res) => {
  const isi = (req.body.isi || "").trim().slice(0, 255);
  if (isi) await pool.query("INSERT INTO notes (isi) VALUES (?)", [isi]);
  res.redirect("/");
});

app.post("/hapus/:id", async (req, res) => {
  await pool.query("DELETE FROM notes WHERE id = ?", [Number(req.params.id)]);
  res.redirect("/");
});

app.get("/health", (req, res) => res.send("ok"));

initDb()
  .then(() => app.listen(3000, () => console.log("Aplikasi berjalan di port 3000")))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });