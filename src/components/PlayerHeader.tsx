"use client";

import type { PlayerIdentity } from "@/lib/types";

interface PlayerHeaderProps {
  you: { identity: PlayerIdentity; progress: number };
  opponent: { identity: PlayerIdentity; progress: number; connected: boolean } | null;
  elapsedLabel: string;
}

function IdentityBadge({
  identity,
  label,
  progress,
}: {
  identity: PlayerIdentity;
  label: string;
  progress: number;
}) {
  const isSun = identity === "sun";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5">
        <span className={isSun ? "text-glow-sun" : "text-glow-moon"}>{isSun ? "☀️" : "🌙"}</span>
        <span className="text-xs font-medium text-white/70 sm:text-sm">{label}</span>
      </div>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-white/10 sm:w-28">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isSun ? "bg-sun" : "bg-moon"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] text-white/40">{progress}%</span>
    </div>
  );
}

export default function PlayerHeader({ you, opponent, elapsedLabel }: PlayerHeaderProps) {
  return (
    <div className="mx-auto flex w-full max-w-[min(92vw,420px)] items-center justify-between px-1">
      <IdentityBadge identity={you.identity} label="You" progress={you.progress} />
      <div className="flex flex-col items-center">
        <span className="font-mono text-lg font-semibold text-white/90 sm:text-xl">{elapsedLabel}</span>
        {opponent && !opponent.connected && (
          <span className="mt-0.5 text-[10px] text-red-400/80">Opponent reconnecting…</span>
        )}
      </div>
      {opponent ? (
        <IdentityBadge identity={opponent.identity} label="Opponent" progress={opponent.progress} />
      ) : (
        <div className="w-16 text-center text-[10px] text-white/30">Waiting…</div>
      )}
    </div>
  );
}
