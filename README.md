# OJJO.STROY — Universal versiya (Firebase'siz)

Bu versiya hech qanday maxsus bulut xizmatiga (Firebase, AWS va h.k.) bog'liq
emas. Oddiy **Node.js + Express + SQLite** dasturi, shuning uchun quyidagi
platformalarning **hammasida ishlaydi**:

- Fly.io
- Render.com
- Railway.app
- Google Cloud Run
- Har qanday VPS (Docker o'rnatilgan bo'lsa)

Chunki loyihada **Dockerfile** bor — platforma "runtime detect qila olmadim"
deb xato bermaydi, u avtomatik Docker orqali qurib, ishga tushiradi.

## Papka tuzilishi
```
ojjo-standalone/
├── server.js         <- asosiy server (frontend + API bitta joyda)
├── db.js              <- SQLite bazasi sozlamalari
├── seed.js             <- boshlang'ich ma'lumot + admin parolini o'rnatish
├── package.json
├── Dockerfile          <- platformalar shu orqali avtomatik quradi
├── .dockerignore
├── .env.example
└── public/
    └── index.html      <- frontend
```

## Muhim: parol qayerda saqlanadi?
Parol **hech qachon** frontendda yoki kodning ochiq matnida saqlanmaydi.
`seed.js` ishga tushirilganda parol **bcrypt hash** shaklida SQLite bazasiga
yoziladi. Login so'ralganda backend faqat hash bilan solishtiradi.

---

## A) Kompyuteringizda sinab ko'rish (tavsiya qilinadi)
```bash
cd ojjo-standalone
npm install
node seed.js "MeningKuchliParolim2026!"
npm start
```
Brauzerda oching: `http://localhost:3000`

---

## B) Fly.io'ga joylash

1. https://fly.io da ro'yxatdan o'ting, `flyctl` ni o'rnating:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```
2. Loyiha papkasida:
   ```bash
   cd ojjo-standalone
   fly launch
   ```
   Savollarga javob bering (Dockerfile avtomatik topiladi — endi xatolik
   chiqmaydi). Baza fayli saqlanib qolishi uchun **volume** yaratishni so'rasa
   "ha" deng (masalan `/app` ga volume ulang) — aks holda har safar qayta
   joylaganingizda ma'lumotlar boshlang'ich holatga qaytadi.
3. Muhit o'zgaruvchisini o'rnating:
   ```bash
   fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
   ```
4. Serverga kirib parolni o'rnating (bir martalik):
   ```bash
   fly ssh console -C "node seed.js MeningKuchliParolim2026!"
   ```
5. Deploy:
   ```bash
   fly deploy
   ```

---

## C) Render.com'ga joylash (eng oson, bepul tarifi bor)

1. Loyihani GitHub'ga yuklang (repo yarating, push qiling).
2. https://render.com → **New → Web Service** → GitHub repo'ni tanlang.
3. Sozlamalar:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - (Yoki hech narsa yozmang — Render Dockerfile'ni avtomatik topadi)
4. **Environment** bo'limida qo'shing:
   - `JWT_SECRET` = tasodifiy uzun matn
5. Deploy tugagach, Render **Shell** bo'limidan (yoki "One-off Job"):
   ```bash
   node seed.js MeningKuchliParolim2026!
   ```
6. **Diqqat**: Render bepul tarifida disk vaqtinchalik — har deploy'da baza
   tozalanadi. Doimiy saqlash uchun Render'ning "Persistent Disk" (pullik)
   xizmatini yoqing yoki quyidagi D-bandini o'qing.

---

## D) Railway.app'ga joylash

1. https://railway.app → **New Project → Deploy from GitHub repo**
2. Railway Dockerfile'ni avtomatik topadi va quradi.
3. **Variables** bo'limida `JWT_SECRET` qo'shing.
4. Deploy tugagach, Railway konsolidan (yoki lokal `railway run`):
   ```bash
   node seed.js MeningKuchliParolim2026!
   ```
5. Railway'da **Volume** qo'shsangiz (Settings → Volumes), ma'lumotlar
   deploy'lar orasida saqlanib qoladi.

---

## Ma'lumotlar bazasi haqida eslatma
SQLite — fayl asosidagi baza (`ojjo-stroy.db`). Agar platformangiz **konteynerni
har safar "toza holatda" qayta yaratsa** (masalan Render bepul tarifi), fayl
o'chib ketadi. Buning yechimi — platformangizning **"persistent volume/disk"**
xizmatini yoqish va `DATA_DIR` muhit o'zgaruvchisini shu volume yo'liga
ko'rsatish (masalan `DATA_DIR=/data`).

## Admin panelga kirish
Sayt ochilgach, pastdagi kichik **"© Admin"** tugmasini bosing va
`seed.js`da bergan parolni kiriting.

## Parolni admin panel ichidan o'zgartirish
Admin panelga kirgach, yuqori o'ng burchakdagi **kalit belgisi** (🔑) tugmasini
bosing. Joriy parolingizni va yangi parolni kiritib saqlang — endi terminal
yoki `seed.js`ga qayta murojaat qilish shart emas.
