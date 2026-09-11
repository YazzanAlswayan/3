"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/Stars";

export default function JoinGamePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not join room.");

      sessionStorage.setItem(`player:${data.room.room_code}`, JSON.stringify(data.player));
      router.push(`/room/${data.room.room_code}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <Stars count={50} />
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-center text-xl font-semibold text-white">Join Game</h1>
        <p className="mt-1 text-center text-sm text-white/40">You'll play as 🌙 The Moon</p>

        <div className="mt-6">
          <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-white/40">
            Room Code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="A7K92"
            maxLength={6}
            className="w-full rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-center text-lg tracking-[0.3em] text-white outline-none focus:border-moon/60"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button onClick={handleJoin} disabled={loading || !code.trim()} className="btn-moon mt-6 w-full">
          {loading ? "Joining…" : "Join Room"}
        </button>
      </div>
    </main>
  );
}
