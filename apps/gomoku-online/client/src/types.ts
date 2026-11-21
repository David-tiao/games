export type Stone = 0 | 1 | 2;
export type GameStatus = "waiting" | "playing" | "finished";

export interface Player {
  userId: string;
  username: string;
  color: 1 | 2;
  connected: boolean;
}

export interface RoomState {
  code: string;
  ownerId: string;
  players: Player[];
  board: Stone[];
  currentTurn: 1 | 2;
  status: GameStatus;
  winner: 1 | 2 | null;
  result: "five" | "draw" | "resign" | null;
  lastMove: number | null;
  rematchVotes: string[];
}

export interface User { id: string; username: string; }
export interface Ack<T = unknown> { ok: boolean; data?: T; error?: string; }
