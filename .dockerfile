# OJJO.STROY — universal Docker image
# Fly.io, Render, Railway, Google Cloud Run va boshqa istalgan Docker
# platformasida shu faylni avtomatik topib, ishlatadi.

FROM node:20-slim

WORKDIR /app

# better-sqlite3 kompilyatsiya qilish uchun kerakli vositalar
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
