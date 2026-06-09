import { Server, Socket } from 'socket.io';
import { registerLobbyHandlers } from './lobbyHandlers';
import { registerGameHandlers } from './gameHandlers';

export function registerHandlers(io: Server, socket: Socket) {
  registerLobbyHandlers(io, socket);
  registerGameHandlers(io, socket);
}