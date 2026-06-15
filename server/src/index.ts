import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { registerHandlers } from './socket/index';
import { generateDailyRoute, getDailyRoute } from './services/dailyService';
import dailyRouter from './routes/daily';

const app = express();
const httpServer = createServer(app);

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

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

getDailyRoute().catch(console.error);

function scheduleMidnightCron() {
  const now = new Date();
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    generateDailyRoute().catch(console.error);
    scheduleMidnightCron();
  }, msUntilMidnight);

  console.log(`⏰ Next daily route in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
}

scheduleMidnightCron();

app.use(express.json());
app.use('/api/daily', dailyRouter);