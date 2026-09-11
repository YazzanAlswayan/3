"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { PlayerRow, PublicRoomRow } from "@/lib/types";
import type { Board as BoardType } from "@/lib/sudoku";
import Stars from "@/components/Stars";
import Board from "@/components/Board";
import NumberPad from "@/components/NumberPad";
import PlayerHeader from "@/components/PlayerHeader";
import Countdown from "@/components/Countdown";
import ResultScreen from "@/components/ResultScreen";

const HEARTBEAT_MS = 4000;
const STALE_MS = 12000; // if a player hasn't pinged in this long, show "reconnecting"

function emptyBoardFrom(puzzle: BoardType): BoardType {
  return [...puzzle];
}

function formatElapsed(startedAt: string | null): string {
  if (!startedAt) return "00:00";
  const ms = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params.code || "").toString().toUpperCase();

  const [room, setRoom] = useState<PublicRoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [me, setMe] = useState<PlayerRow | null>(null);
  const [board, setBoard] = useState<BoardType>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState("00:00");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rematchStatus, setRematchStatus] = useState<"idle" | "waiting" | "starting">("idle");
  const [winResult, setWinResult] = useState<{ winner: string; completionTimeMs: number | null } | null>(
    null
  );

  const boardRef = useRef<BoardType>([]);
  const submittedRef = useRef(false);

  // --- Load stored player identity + initial room state ---
  useEffect(() => {
    const stored = sessionStorage.getItem(`player:${roomCode}`);
    if (!stored) {
      setLoadError("No player found for this room in this browser session.");
      return;
    }
    const storedPlayer: PlayerRow = JSON.parse(stored);
    setMe(storedPlayer);

    (async () => {
      const { data: roomRow } = await supabaseBrowser
        .from("rooms_public")
        .select("*")
        .eq("room_code", roomCode)
        .maybeSingle();
      if (!roomRow) {
        setLoadError("Room not found.");
        return;
      }
      setRoom(roomRow as PublicRoomRow);
      setBoard(emptyBoardFrom((roomRow as PublicRoomRow).puzzle));
      boardRef.current = emptyBoardFrom((roomRow as PublicRoomRow).puzzle);

      const { data: playerRows } = await supabaseBrowser
        .from("players")
        .select("*")
        .eq("room_id", roomRow.room_id);
      setPlayers(playerRows || []);
    })();
  }, [roomCode]);

  // --- Realtime subscriptions ---
  useEffect(() => {
    if (!room) return;

    const channel = supabaseBrowser
      .channel(`room:${room.room_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `room_id=eq.${room.room_id}` },
        (payload) => {
          const updated = payload.new as any;
          setRoom((prev) => (prev ? { ...prev, ...updated } : prev));

          // A brand-new puzzle means a rematch just kicked off.
          if (updated.puzzle) {
            const fresh = emptyBoardFrom(updated.puzzle);
            setBoard(fresh);
            boardRef.current = fresh;
            submittedRef.current = false;
            setSelected(null);
            setWinResult(null);
            setRematchStatus("idle");
          }

          if (updated.winner) {
            setWinResult({ winner: updated.winner, completionTimeMs: null });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.room_id}` },
        (payload) => {
          setPlayers((prev) => {
            const incoming = payload.new as PlayerRow;
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.player_id !== (payload.old as any).player_id);
            }
            const exists = prev.some((p) => p.player_id === incoming.player_id);
            return exists
              ? prev.map((p) => (p.player_id === incoming.player_id ? incoming : p))
              : [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [room?.room_id]);

  // --- Heartbeat / presence ---
  useEffect(() => {
    if (!me) return;
    const ping = () =>
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: me.player_id, connected: true }),
      }).catch(() => {});
    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [me?.player_id]);

  // --- Elapsed timer while active ---
  useEffect(() => {
    if (room?.status !== "active" || !room.started_at) return;
    const interval = setInterval(() => setElapsedLabel(formatElapsed(room.started_at)), 500);
    return () => clearInterval(interval);
  }, [room?.status, room?.started_at]);

  const opponent = players.find((p) => p.player_id !== me?.player_id) || null;
  const isOpponentStale = opponent
    ? Date.now() - new Date(opponent.last_seen_at).getTime() > STALE_MS
    : false;

  const handleSelect = useCallback((idx: number) => {
    if (!room) return;
    if (room.puzzle[idx] !== 0) return; // given cells aren't editable
    setSelected(idx);
  }, [room]);

  const sendProgress = useCallback(
    (nextBoard: BoardType) => {
      if (!room || !me) return;
      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.room_id, playerId: me.player_id, board: nextBoard }),
      }).catch(() => {});
    },
    [room?.room_id, me?.player_id]
  );

  const trySubmit = useCallback(
    async (nextBoard: BoardType) => {
      if (!room || !me || submittedRef.current) return;
      if (nextBoard.some((v) => v === 0)) return; // only submit a fully filled board
      submittedRef.current = true;

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.room_id, playerId: me.player_id, board: nextBoard }),
      });
      const data = await res.json();

      if (data.correct && data.wonRace) {
        setWinResult({ winner: data.winner, completionTimeMs: data.completionTimeMs });
      } else if (data.winner) {
        setWinResult({ winner: data.winner, completionTimeMs: null });
      } else {
        // Board was full but incorrect — allow further edits and resubmission.
        submittedRef.current = false;
      }
    },
    [room?.room_id, me?.player_id]
  );

  const applyValue = useCallback(
    (value: number) => {
      if (selected === null || !room) return;
      if (room.puzzle[selected] !== 0) return;
      const next = [...boardRef.current];
      next[selected] = value;
      boardRef.current = next;
      setBoard(next);
      sendProgress(next);
      trySubmit(next);
    },
    [selected, room, sendProgress, trySubmit]
  );

  const handleStart = useCallback(async () => {
    if (!room) return;
    await fetch("/api/room/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.room_id }),
    });
  }, [room?.room_id]);

  const handleRematch = useCallback(async () => {
    if (!room || !me) return;
    setRematchStatus("waiting");
    const res = await fetch("/api/rematch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.room_id, playerId: me.player_id }),
    });
    const data = await res.json();
    if (!data.waiting) setRematchStatus("starting");
  }, [room?.room_id, me?.player_id]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  };

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <p className="text-white/70">{loadError}</p>
        <button className="btn-secondary mt-6" onClick={() => router.push("/")}>
          Back to Home
        </button>
      </main>
    );
  }

  if (!room || !me) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-white/40">Loading room…</p>
      </main>
    );
  }

  // --- Lobby: waiting for opponent ---
  if (room.status === "waiting" || (room.status === "ready" && players.length < 2)) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <Stars count={50} />
        <div className="card w-full max-w-sm p-6 text-center">
          <p className="text-glow-sun text-3xl">☀️</p>
          <h1 className="mt-2 text-lg font-semibold text-white">The Sun</h1>
          <p className="mt-1 text-sm text-white/40">Waiting for The Moon…</p>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <span className="font-mono text-xl tracking-[0.3em] text-white">{roomCode}</span>
            <button onClick={copyCode} className="text-xs text-white/50 underline">
              Copy
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Lobby: both connected, ready to start ---
  if (room.status === "ready") {
    const isHost = me.player_number === 1;
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <Stars count={50} />
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="flex items-center justify-center gap-4 text-3xl">
            <span className="text-glow-sun">☀️</span>
            <span className="text-sm text-white/30">VS</span>
            <span className="text-glow-moon">🌙</span>
          </div>
          <p className="mt-4 text-sm text-white/50">Both players connected</p>
          {isHost ? (
            <button onClick={handleStart} className="btn-primary mt-6 w-full">
              Start Game
            </button>
          ) : (
            <p className="mt-6 text-sm text-white/40">Waiting for The Sun to start…</p>
          )}
        </div>
      </main>
    );
  }

  // --- Countdown ---
  if (room.status === "countdown" && room.started_at) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <Stars count={50} />
        <Countdown startedAt={room.started_at} onComplete={() => {}} />
      </main>
    );
  }

  // --- Finished: result screen ---
  if (room.status === "finished" && room.winner) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <Stars count={50} />
        <ResultScreen
          winner={room.winner as any}
          you={me.player_identity as any}
          completionTimeMs={winResult?.completionTimeMs ?? null}
          onPlayAgain={handleRematch}
          onHome={() => router.push("/")}
          rematchStatus={rematchStatus}
        />
      </main>
    );
  }

  // --- Active gameplay ---
  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-6">
      <Stars count={40} />

      <PlayerHeader
        you={{ identity: me.player_identity as any, progress: me.progress }}
        opponent={
          opponent
            ? {
                identity: opponent.player_identity as any,
                progress: opponent.progress,
                connected: opponent.connected && !isOpponentStale,
              }
            : null
        }
        elapsedLabel={elapsedLabel}
      />

      <div className="mt-6 w-full">
        <Board
          puzzle={room.puzzle}
          board={board}
          selected={selected}
          onSelect={handleSelect}
          accent={me.player_identity === "moon" ? "moon" : "sun"}
        />
        <NumberPad
          onNumber={applyValue}
          onErase={() => applyValue(0)}
          accent={me.player_identity === "moon" ? "moon" : "sun"}
        />
      </div>
    </main>
  );
}
