/**
 * Boshlang'ich ma'lumotlarni bazaga yozadi va admin parolini o'rnatadi.
 *
 * ISHLATISH:
 *   node seed.js "MeningParolim2026!"
 *
 * Parol berilmasa, standart "admin123" ishlatiladi (albatta o'zgartiring!).
 */

const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const ADMIN_PASSWORD = process.argv[2] || "admin123";

async function run() {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('admin_password_hash', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(hash);
  console.log("Admin paroli o'rnatildi:", ADMIN_PASSWORD);

  const catCount = db.prepare("SELECT COUNT(*) as c FROM categories").get().c;
  if (catCount > 0) {
    console.log("Kataloglar/mahsulotlar allaqachon mavjud — namuna ma'lumot qo'shilmadi.");
    process.exit(0);
  }

  const categories = [
    { name: "Devor" },
    { name: "Qurilish" },
    { name: "Profil" },
    { name: "Elektr" },
  ];

  const catIds = {};
  const insertCat = db.prepare("INSERT INTO categories (id, name) VALUES (?, ?)");
  categories.forEach((c) => {
    const id = uuidv4();
    insertCat.run(id, c.name);
    catIds[c.name] = id;
    console.log("  + katalog:", c.name);
  });

  const products = [
    { name: "Gipsokarton 12mm Knauf", price: 65000, stock: 45, cat: "Devor", image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80" },
    { name: "Sement 50kg (Bekabad)", price: 75000, stock: 120, cat: "Qurilish", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=600&q=80" },
    { name: "Qum tozalangan 1 kub", price: 180000, stock: 15, cat: "Qurilish", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80" },
    { name: "Profil UD 3m", price: 28000, stock: 300, cat: "Profil", image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80" },
    { name: "Elektr kabel 2.5mm", price: 4500, stock: 800, cat: "Elektr", image: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=600&q=80" },
  ];

  const insertProd = db.prepare(
    "INSERT INTO products (id, name, catId, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)"
  );
  products.forEach((p) => {
    insertProd.run(uuidv4(), p.name, catIds[p.cat], p.price, p.stock, p.image);
    console.log("  + mahsulot:", p.name);
  });

  console.log("\nTayyor! Endi 'npm start' bilan serverni ishga tushirishingiz mumkin.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
