# =========================
# Etapa 1 — Build
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Gera Prisma Client
RUN npx prisma generate

# Build Nest
RUN npm run build

# =========================
# Etapa 2 — Produção
# =========================
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

# Copia prisma
COPY prisma ./prisma

# Copia dist
COPY --from=builder /app/dist ./dist

# Copia Prisma Client gerado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copia @prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Gera novamente por segurança
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main.js"]