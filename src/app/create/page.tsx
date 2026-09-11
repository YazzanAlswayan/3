"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/Stars";
import type { Difficulty } from "@/lib/sudoku";

export default function CreateGamePage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create room.");

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
        <h1 className="text-center text-xl font-semibold text-white">Create Game</h1>
        <p className="mt-1 text-center text-sm text-white/40">You'll play as ☀️ The Sun</p>

        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/40">Difficulty</p>
          <div className="grid grid-cols-3 gap-2">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`rounded-lg border py-2 text-sm capitalize transition-colors ${
                  difficulty === d
                    ? "border-sun/60 bg-sun/10 text-sun"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button onClick={handleCreate} disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "Creating…" : "Create Room"}
        </button>
      </div>
    </main>
  );
}
