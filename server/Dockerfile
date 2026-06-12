FROM node:20-alpine AS builder

WORKDIR /app

COPY server/package*.json ./server/
COPY shared/ ./shared/

WORKDIR /app/server
RUN npm ci

COPY server/src/ ./src/
COPY server/tsconfig.json ./
COPY server/prisma/ ./prisma/

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/shared ../shared
COPY --from=builder /app/server/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server/src/index.js"]