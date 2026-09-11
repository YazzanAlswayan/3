"use client";

import type { PlayerIdentity } from "@/lib/types";

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface ResultScreenProps {
  winner: PlayerIdentity;
  you: PlayerIdentity;
  completionTimeMs: number | null;
  onPlayAgain: () => void;
  onHome: () => void;
  rematchStatus: "idle" | "waiting" | "starting";
}

export default function ResultScreen({
  winner,
  you,
  completionTimeMs,
  onPlayAgain,
  onHome,
  rematchStatus,
}: ResultScreenProps) {
  const youWon = winner === you;
  const isSun = winner === "sun";

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-sm flex-col items-center justify-center px-6 text-center">
      <div className={`text-6xl ${isSun ? "text-glow-sun" : "text-glow-moon"}`}>
        {isSun ? "☀️" : "🌙"}
      </div>

      <h2 className="mt-5 font-display text-2xl font-semibold tracking-wide text-white sm:text-3xl">
        {isSun ? "THE SUN WINS" : "THE MOON WINS"}
      </h2>

      {completionTimeMs !== null && (
        <p className="mt-2 font-mono text-lg text-white/70">{formatTime(completionTimeMs)}</p>
      )}

      <p className="mt-4 text-sm text-white/50">
        {isSun ? "The Sun has risen. Solved it first." : "The Moon has taken the night. Solved it first."}
      </p>

      <p className="mt-1 text-sm text-white/30">
        {youWon ? "" : "Better luck next round."}
      </p>

      <div className="mt-10 flex w-full flex-col gap-3">
        <button onClick={onPlayAgain} className="btn-primary w-full" disabled={rematchStatus === "waiting"}>
          {rematchStatus === "waiting" ? "Waiting for opponent…" : "Play Again"}
        </button>
        <button onClick={onHome} className="btn-secondary w-full">
          Back to Home
        </button>
      </div>
    </div>
  );
}
