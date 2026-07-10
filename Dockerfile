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

# Compila o seed (prisma/seed.ts) para JS, já que ts-node não existe em produção
RUN npx tsc prisma/seed.ts --rootDir prisma --outDir dist/prisma --module commonjs --target ES2023 --esModuleInterop --skipLibCheck

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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main.js"]