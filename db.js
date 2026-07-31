const Database = require("better-sqlite3");
const path = require("path");

// Baza fayli DATA_DIR ichida saqlanadi (Fly.io/Render'da persistent volume
// ulasangiz, DATA_DIR shu volume'ga ishora qilishi kerak — aks holda har
// safar qayta joylashda (deploy) ma'lumotlar boshlang'ich holatga qaytadi).
const DATA_DIR = process.env.DATA_DIR || __dirname;
const dbPath = path.join(DATA_DIR, "ojjo-stroy.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    catId TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    image TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    desc TEXT DEFAULT '',
    amount INTEGER NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    paid INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items TEXT NOT NULL,
    total INTEGER NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

module.exports = db;
