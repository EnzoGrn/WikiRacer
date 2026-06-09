export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  id: string;
  name: string;
  ready: boolean;
  path: string[];
  clicks: number;
  finishedAt: number | null;
  rank: number | null;
}

export interface Rules {
  noCtrlF: boolean;
  noBack: boolean;
  noRightClick: boolean;
  noCategories: boolean;
  timeLimit: number | null; // seconds
}

export interface Lobby {
  code: string;
  hostId: string;
  status: GameStatus;
  source: string | null;
  target: string | null;
  rules: Rules;
  players: Player[];
  startedAt: number | null;
}