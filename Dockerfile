# Etapa 1 — Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2 — Produção
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

# Gera o cliente Prisma na imagem final
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/main.js"]
