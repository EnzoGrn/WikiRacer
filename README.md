# WikiRacer

Race through Wikipedia pages faster than your friends — or take on the daily challenge alone.

![Demo](./demo.gif)

## What is it?

WikiRacer is a multiplayer game where players navigate from one Wikipedia page to another using only the links on each page. Create a private lobby, invite your friends with a code, and race to the finish.

A daily route is also available — one new challenge every day.

## Features

### Multiplayer
- Private lobbies with a shareable code or invite link
- Real-time player tracking — see where your opponents are
- Two game modes: **Speed** (first to arrive wins) or **Fewest clicks** (least clicks wins)
- Configurable rules: disable Ctrl+F, back button, right click, category links, hide opponents
- Optional time limit
- Results screen with rankings, paths, and stats

### Daily route
- A new Wikipedia route every day
- Resume your game if you close the tab — progress is saved for 6 months
- Personal history stored locally
- Browse and play past routes in the archive
- Difficulty rating based on average player performance

### Wikipedia
- Full Wikipedia page rendering with official styles
- Autocomplete search when choosing source and target pages
- Random page generation
- Page validation before saving

## Stack

- **Frontend** — Next.js 16.2.7, React 19, TypeScript 5, Tailwind CSS 4, Socket.io client 4.8
- **Backend** — Node.js 20, Express 5.2, Socket.io 4.8, Prisma 6.19, TypeScript 6
- **Databases** — Redis 7 via ioredis 5.11 (lobbies & game state), PostgreSQL 16 via pg 8.21 (daily routes & stats)
- **Infrastructure** — Docker, Nginx Proxy Manager, VPS OVH

## Getting started

### Prerequisites

- Node.js 20+
- Docker

### Run locally

```bash
# Clone
git clone https://github.com/EnzoGrn/WikiRacer.git
cd WikiRacer

# Create the Docker network
docker network create proxy

# Start databases
docker compose up -d redis postgres

# Server
cd server
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Client (in another terminal)
cd client
cp .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

**`server/.env`**
```
PORT=3001
CLIENT_URL=http://localhost:3000
REDIS_URL=redis://redis:6379
DATABASE_URL=postgresql://wikiracer:wikiracer@postgres:5432/wikiracer
ADMIN_PASSWORD=changeme
NODE_ENV=development
```

**`client/.env`**
```
NEXT_PUBLIC_SERVER_URL=http://localhost:3001
```

## Run tests

```bash
# Server
cd server && npm test

# Client
cd client && npm test
```

### Production (Docker)

```bash
docker compose build
docker compose up -d
```

## Live demo

[wikiracer.enzogarnier.fr](https://wikiracer.enzogarnier.fr)