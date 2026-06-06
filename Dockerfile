# node:20-slim (Debian) pour compiler better-sqlite3 sans friction (vs Alpine).
FROM node:20-slim

WORKDIR /app

# Outils de build natif pour better-sqlite3, retirés ensuite pour garder l'image légère.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY server ./server
COPY public ./public

ENV PORT=8080
ENV DB_PATH=/app/data/tasks.db
EXPOSE 8080

CMD ["node", "server/index.js"]
