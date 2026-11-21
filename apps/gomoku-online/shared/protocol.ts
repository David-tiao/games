export type Stone = 0 | 1 | 2;

export interface PlayerSummary {
  userId: string;
  username: string;
  color: 1 | 2;
  connected: boolean;
}

export interface RoomState {
  code: string;
  ownerId: string;
  players: PlayerSummary[];
  board: Stone[];
  currentTurn: 1 | 2;
  status: "waiting" | "playing" | "finished";
  winner: 1 | 2 | null;
  result: "five" | "draw" | "resign" | null;
  lastMove: number | null;
  rematchVotes: string[];
}

export interface Ack<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ClientToServerEvents {
  "room:create": (payload: Record<string, never>, ack: (result: Ack<RoomState>) => void) => void;
  "room:join": (payload: { code: string }, ack: (result: Ack<RoomState>) => void) => void;
  "room:rejoin": (payload: { code: string }, ack: (result: Ack<RoomState>) => void) => void;
  "room:leave": (payload: Record<string, never>, ack: (result: Ack<RoomState | null>) => void) => void;
  "game:move": (payload: { index: number }, ack: (result: Ack<RoomState>) => void) => void;
  "game:resign": (payload: Record<string, never>, ack: (result: Ack<RoomState>) => void) => void;
  "game:rematch": (payload: Record<string, never>, ack: (result: Ack<RoomState>) => void) => void;
}

export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:closed": () => void;
}
