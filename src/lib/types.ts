import type { Board, Difficulty } from "./sudoku";

export type PlayerIdentity = "sun" | "moon";

export type RoomStatus =
  | "waiting" // only Player 1 (Sun) present
  | "ready" // both players present, not yet started
  | "countdown" // synchronized countdown in progress
  | "active" // match in progress
  | "finished"; // a winner has been recorded

export interface RoomRow {
  room_id: string;
  room_code: string;
  status: RoomStatus;
  puzzle: Board; // safe to expose to clients
  solution: Board | null; // NEVER selected/exposed to the client; server-only column
  difficulty: Difficulty;
  created_at: string;
  started_at: string | null; // authoritative match-start timestamp (server clock)
  finished_at: string | null;
  winner: PlayerIdentity | null;
  countdown_start_at: string | null;
}

export interface PlayerRow {
  player_id: string;
  room_id: string;
  player_number: 1 | 2;
  player_identity: PlayerIdentity;
  connected: boolean;
  progress: number; // 0-100, server-recomputed on each progress update
  completion_time_ms: number | null;
  wants_rematch: boolean;
  last_seen_at: string;
}

// Public room/player shape sent to clients — solution is stripped server-side.
export type PublicRoomRow = Omit<RoomRow, "solution">;

export interface RoomWithPlayers {
  room: PublicRoomRow;
  players: PlayerRow[];
}
