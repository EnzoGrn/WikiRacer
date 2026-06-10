FROM node:20-alpine AS builder

WORKDIR /app

COPY client/package*.json ./client/
COPY shared/ ./shared/

WORKDIR /app/client
RUN npm ci

COPY client/ .

ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/client/.next/standalone ./
COPY --from=builder /app/client/.next/static ./.next/static
COPY --from=builder /app/client/public ./public

EXPOSE 3000

CMD ["node", "server.js"]