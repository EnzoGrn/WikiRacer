import { Server, Socket } from 'socket.io';
import { addPlayer, createLobby, getLobby, removePlayer, updateLobbyConfig } from '../services/lobbyService';
import { redis } from '../services/redis';
import { Rules } from '../../../shared/types';

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

  socket.on('lobby:join', async ({ code, playerName }: { code: string; playerName: string }, callback) => {
    try {
      const lobby = await addPlayer(code.toUpperCase(), {
        id: socket.id,
        name: playerName,
      });

      await redis.set(`player:${socket.id}`, lobby.code);

      socket.join(lobby.code);

      socket.to(lobby.code).emit('lobby:playerJoined', {
        player: { id: socket.id, name: playerName },
        players: lobby.players,
      });

      callback({ ok: true, lobby });
    } catch (err) {
      callback({ ok: false, error: (err as Error).message });
    }
  });

  socket.on('lobby:get', async ({ code }: { code: string }, callback) => {
    try {
      const lobby = await getLobby(code.toUpperCase());
      if (!lobby) return callback({ ok: false, error: 'Lobby not found' });
      callback({ ok: true, lobby });
    } catch (err) {
      callback({ ok: false, error: (err as Error).message });
    }
  });

  socket.on('disconnect', async () => {
    const lobbyCode = await redis.get(`player:${socket.id}`);
    if (!lobbyCode) return;

    await redis.del(`player:${socket.id}`);

    const lobby = await removePlayer(lobbyCode, socket.id);

    if (!lobby) return;

    io.to(lobbyCode).emit('lobby:playerLeft', {
      playerId: socket.id,
      players: lobby.players,
      newHostId: lobby.hostId,
    });
  });

  socket.on('lobby:configure', async (
    { code, source, target, rules }: { code: string; source: string; target: string; rules: Rules },
    callback
  ) => {
    try {
      const lobby = await getLobby(code);
      if (!lobby) return callback({ ok: false, error: 'Lobby not found' });
      if (lobby.hostId !== socket.id) return callback({ ok: false, error: 'Only the host can configure the lobby' });

      await updateLobbyConfig(code, { source, target, rules });

      io.to(code).emit('lobby:configured', { source, target, rules });
      callback({ ok: true });
    } catch (err) {
      callback({ ok: false, error: (err as Error).message });
    }
  });

  socket.on('game:start', async ({ code }: { code: string }, callback) => {
  try {
    const lobby = await getLobby(code);
    if (!lobby) return callback({ ok: false, error: 'Lobby not found' });
    if (lobby.hostId !== socket.id) return callback({ ok: false, error: 'Only the host can start the game' });
    if (!lobby.source || !lobby.target) return callback({ ok: false, error: 'Source and target are required' });
    if (lobby.status !== 'waiting') return callback({ ok: false, error: 'Game already started' });

    callback({ ok: true });
  } catch (err) {
    callback({ ok: false, error: (err as Error).message });
  }
});
}
