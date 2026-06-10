import { Server, Socket } from 'socket.io';
import { endGame, getLobby, startGame, updatePlayerPath } from '../services/lobbyService';
import { sleep } from '../utils/sleep';
import { normalizeTitle } from '../utils/normalizeTitle';

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

  socket.on('game:navigate', async ({ code, page }: { code: string; page: string }) => {
    try {
      const lobby = await getLobby(code);
      if (!lobby || lobby.status !== 'playing') return;

      const player = lobby.players.find(p => p.id === socket.id);
      if (!player || player.finishedAt) return;

      player.path.push(page);
      player.clicks += 1;

      const hasWon = normalizeTitle(page) === normalizeTitle(lobby.target!);

      if (hasWon) {
        const rank = lobby.players.filter(p => p.finishedAt !== null && p.finishedAt > 0).length + 1;
        player.finishedAt = Date.now();
        player.rank = rank;

        await updatePlayerPath(code, lobby.players);

        io.to(code).emit('game:playerFinished', {
          playerId: socket.id,
          playerName: player.name,
          rank,
          clicks: player.clicks,
          time: player.finishedAt - lobby.startedAt!,
          path: player.path,
        });

        const allDone = lobby.players.every(p => p.finishedAt !== null);
        if (allDone) await endGame(code, lobby.players, lobby.startedAt!);

      } else {
        await updatePlayerPath(code, lobby.players);

        io.to(code).emit('game:playerMoved', {
          playerId: socket.id,
          currentPage: page,
          clicks: player.clicks,
        });
      }
    } catch (err) {
      console.error('game:navigate error:', err);
    }
  });
}