import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerHandlers } from './socket/index';
import { generateCandidates, getTodayDate } from './services/dailyService';
import dailyRouter from './routes/daily';
import adminRouter from './routes/admin';
import { prisma } from './services/prisma';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/daily', dailyRouter);
app.use('/api/admin', adminRouter);

// Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
  }
});

io.on('connection', (socket) => {
  console.log(`✅ connected: ${socket.id}`);
  registerHandlers(io, socket);
  socket.on('disconnect', () => {
    console.log(`❌ disconnected: ${socket.id}`);
  });
});

function scheduleMidnightCron() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(async () => {
    await generateUpcomingCandidates().catch(console.error);
    scheduleMidnightCron();
  }, msUntilMidnight);

  console.log(`⏰ Next candidates generation in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
}

async function generateUpcomingCandidates() {
  const today = await getTodayDate();

  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const existing = await prisma.dailyCandidate.count({ where: { date } });
    if (existing >= 5) continue;

    await prisma.dailyCandidate.deleteMany({ where: { date } });
    await generateCandidates(date, 5);
    console.log(`✅ Generated 5 candidates for ${date.toISOString().split('T')[0]}`);
  }
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await generateUpcomingCandidates().catch(console.error);
  scheduleMidnightCron();
});