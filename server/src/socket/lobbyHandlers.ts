import { Server, Socket } from 'socket.io';
import { createLobby } from '../services/lobbyService';
import { redis } from '../services/redis';

export function registerLobbyHandlers(io: Server, socket: Socket) {

  socket.on('lobby:create', async ({ playerName }: { playerName: string }, callback) => {
    try {
      const lobby = await createLobby(socket.id, playerName);

      await redis.set(`player:${socket.id}`, lobby.code);

      socket.join(lobby.code);
      callback({ ok: true, lobby });
    } catch (err) {
      callback({ ok: false, error: (err as Error).message });
    }
  });

}