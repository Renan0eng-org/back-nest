# Etapa 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Etapa 2 — Produção
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN npx prisma generate

EXPOSE 4000
CMD ["node", "dist/src/main.js"]