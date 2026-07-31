/**
 * OJJO.STROY — Universal backend (Node.js + Express + SQLite)
 * Firebase'ga bog'liq emas — istalgan platformada ishlaydi:
 * Fly.io, Render, Railway, Google Cloud Run, VPS va h.k.
 *
 * Ishga tushirish:  node server.js
 * Port:              process.env.PORT (platforma o'zi beradi) yoki 3000
 */

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_SECRET_KEY";

app.use(cors());
app.use(express.json({ limit: "8mb" })); // rasm base64 uchun
app.use(express.static(path.join(__dirname, "public")));

// ---------- YORDAMCHI FUNKSIYALAR ----------
function getAdminHash() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'admin_password_hash'").get();
  return row ? row.value : null;
}

function signToken() {
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token yo'q" });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token noto'g'ri yoki muddati tugagan" });
  }
}

const api = express.Router();

// ---------- AUTH ----------
api.post("/auth/login", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Parol kerak" });

    const hash = getAdminHash();
    if (!hash) {
      return res
        .status(500)
        .json({ error: "Admin paroli hali o'rnatilmagan. 'npm run seed' ni ishga tushiring." });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: "Parol noto'g'ri" });

    res.json({ token: signToken() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

api.post("/auth/change-password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    }

    const hash = getAdminHash();
    if (!hash) return res.status(500).json({ error: "Admin paroli o'rnatilmagan" });

    const ok = await bcrypt.compare(currentPassword, hash);
    if (!ok) return res.status(401).json({ error: "Joriy parol noto'g'ri" });

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare(
      "INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(newHash);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server xatosi" });
  }
});

// ---------- KATALOGLAR ----------
api.get("/categories", (req, res) => {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name").all();
  res.json(rows);
});

api.post("/categories", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Nomi kerak" });
  const id = uuidv4();
  db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)").run(id, name.trim());
  res.status(201).json({ id, name: name.trim() });
});

api.put("/categories/:id", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Nomi kerak" });
  const result = db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name.trim(), req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Topilmadi" });
  res.json({ id: req.params.id, name: name.trim() });
});

api.delete("/categories/:id", requireAdmin, (req, res) => {
  const used = db.prepare("SELECT id FROM products WHERE catId = ? LIMIT 1").get(req.params.id);
  if (used) return res.status(400).json({ error: "Katalogda mahsulot bor, avval ularni o'chiring" });
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------- MAHSULOTLAR ----------
api.get("/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY name").all();
  res.json(rows);
});

api.post("/products", requireAdmin, (req, res) => {
  const { name, catId, price, stock, image } = req.body;
  if (!name || !catId || price == null || stock == null) {
    return res.status(400).json({ error: "Maydonlarni to'ldiring" });
  }
  if (price <= 0 || stock < 0) return res.status(400).json({ error: "Narx va son to'g'ri bo'lishi kerak" });
  const id = uuidv4();
  db.prepare(
    "INSERT INTO products (id, name, catId, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name.trim(), catId, Number(price), Number(stock), image || "");
  res.status(201).json({ id });
});

api.put("/products/:id", requireAdmin, (req, res) => {
  const { name, catId, price, stock, image } = req.body;
  if (!name || !catId || price == null || stock == null) {
    return res.status(400).json({ error: "Maydonlarni to'ldiring" });
  }
  if (price <= 0 || stock < 0) return res.status(400).json({ error: "Narx va son to'g'ri bo'lishi kerak" });

  const existing = db.prepare("SELECT image FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Topilmadi" });

  db.prepare(
    "UPDATE products SET name=?, catId=?, price=?, stock=?, image=? WHERE id=?"
  ).run(name.trim(), catId, Number(price), Number(stock), image || existing.image, req.params.id);
  res.json({ success: true });
});

api.delete("/products/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------- QARZLAR ----------
api.get("/debts", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM debts ORDER BY name").all();
  res.json(rows.map((d) => ({ ...d, paid: !!d.paid })));
});

api.get("/debts/today", requireAdmin, (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const rows = db.prepare("SELECT * FROM debts WHERE endDate = ? AND paid = 0").all(today);
  res.json(rows);
});

api.post("/debts", requireAdmin, (req, res) => {
  const { name, phone, desc, amount, startDate, endDate } = req.body;
  if (!name || !phone || !amount || !startDate || !endDate) {
    return res.status(400).json({ error: "Maydonlarni to'ldiring" });
  }
  if (amount <= 0) return res.status(400).json({ error: "Summani to'g'ri kiriting" });
  if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ error: "Muddat noto'g'ri" });

  const id = uuidv4();
  db.prepare(
    "INSERT INTO debts (id, name, phone, desc, amount, startDate, endDate, paid) VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
  ).run(id, name.trim(), phone.trim(), (desc || "").trim(), Number(amount), startDate, endDate);
  res.status(201).json({ id });
});

api.put("/debts/:id", requireAdmin, (req, res) => {
  const { name, phone, desc, amount, startDate, endDate } = req.body;
  if (!name || !phone || !amount || !startDate || !endDate) {
    return res.status(400).json({ error: "Maydonlarni to'ldiring" });
  }
  if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ error: "Muddat noto'g'ri" });

  const result = db
    .prepare("UPDATE debts SET name=?, phone=?, desc=?, amount=?, startDate=?, endDate=? WHERE id=?")
    .run(name.trim(), phone.trim(), (desc || "").trim(), Number(amount), startDate, endDate, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Topilmadi" });
  res.json({ success: true });
});

api.patch("/debts/:id/paid", requireAdmin, (req, res) => {
  db.prepare("UPDATE debts SET paid = 1 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

api.delete("/debts/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM debts WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ---------- BUYURTMALAR / CHECKOUT ----------
api.post("/orders", (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Savat bo'sh" });
  }

  const runCheckout = db.transaction((items) => {
    let total = 0;
    const lineItems = [];

    for (const it of items) {
      const p = db.prepare("SELECT * FROM products WHERE id = ?").get(it.id);
      if (!p) throw new Error("Mahsulot topilmadi");
      const qty = Number(it.qty);
      if (qty <= 0) throw new Error("Noto'g'ri son");
      if (p.stock < qty) throw new Error(`Omborda "${p.name}" yetarli emas`);
      total += p.price * qty;
      lineItems.push({ id: p.id, name: p.name, price: p.price, qty });
    }

    for (const it of items) {
      db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(Number(it.qty), it.id);
    }

    const orderId = uuidv4();
    db.prepare("INSERT INTO orders (id, items, total) VALUES (?, ?, ?)").run(
      orderId,
      JSON.stringify(lineItems),
      total
    );

    return { orderId, total };
  });

  try {
    const result = runCheckout(items);
    res.status(201).json({
      success: true,
      orderId: result.orderId,
      total: result.total,
      receiptNo: Math.floor(Math.random() * 9000) + 1000,
    });
  } catch (e) {
    res.status(400).json({ error: e.message || "Xatolik yuz berdi" });
  }
});

api.get("/orders", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC LIMIT 50").all();
  res.json(rows.map((o) => ({ ...o, items: JSON.parse(o.items) })));
});

// ---------- DASHBOARD ----------
api.get("/dashboard", requireAdmin, (req, res) => {
  const products = db.prepare("SELECT * FROM products").all();
  const debts = db.prepare("SELECT * FROM debts").all();

  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const unpaidDebts = debts.filter((d) => !d.paid);
  const totalDebt = unpaidDebts.reduce((s, d) => s + d.amount, 0);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  const salesByDay = Object.fromEntries(days.map((d) => [d, 0]));
  const orders = db
    .prepare("SELECT total, createdAt FROM orders WHERE createdAt >= ?")
    .all(days[0]);
  orders.forEach((o) => {
    const day = o.createdAt.split(" ")[0];
    if (day in salesByDay) salesByDay[day] += o.total;
  });

  res.json({
    totalDebt,
    productCount: products.length,
    totalStock,
    debtorCount: unpaidDebts.length,
    weeklySales: days.map((d) => salesByDay[d]),
    weeklyLabels: days,
  });
});

app.use("/api", api);

// SPA fallback — frontend'dagi barcha boshqa yo'llar index.html'ga tushadi
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`OJJO.STROY server ishga tushdi: http://localhost:${PORT}`);
});
