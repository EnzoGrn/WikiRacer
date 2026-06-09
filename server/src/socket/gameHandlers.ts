import { Server, Socket } from 'socket.io';
import { getLobby, startGame } from '../services/lobbyService';
import { sleep } from '../utils/sleep';

export function registerGameHandlers(io: Server, socket: Socket) {

  socket.on('game:start', async ({ code }: { code: string }) => {
    try {
      const lobby = await getLobby(code);
      if (!lobby) return;
      if (lobby.hostId !== socket.id) return;
      if (!lobby.source || !lobby.target) return;
      if (lobby.status !== 'waiting') return;

      for (const count of [3, 2, 1]) {
        io.to(code).emit('game:countdown', { count });
        await sleep(1000);
      }

      const updatedLobby = await startGame(code);

      io.to(code).emit('game:started', {
        source: updatedLobby.source,
        target: updatedLobby.target,
        rules: updatedLobby.rules,
        startedAt: updatedLobby.startedAt,
      });

      if (updatedLobby.rules.timeLimit) {
        setTimeout(async () => {
          const current = await getLobby(code);
          if (current?.status !== 'playing') return;
          io.to(code).emit('game:timeUp');
        }, updatedLobby.rules.timeLimit * 1000);
      }

    } catch (err) {
      console.error('game:start error:', err);
    }
  });

}