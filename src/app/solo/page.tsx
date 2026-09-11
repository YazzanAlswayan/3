"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Stars from "@/components/Stars";
import Board from "@/components/Board";
import NumberPad from "@/components/NumberPad";
import { generatePuzzle, boardMatchesSolution, type Board as BoardType, type Difficulty } from "@/lib/sudoku";

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SoloPage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [puzzle, setPuzzle] = useState<BoardType>([]);
  const [solution, setSolution] = useState<BoardType>([]);
  const [board, setBoard] = useState<BoardType>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);

  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);

  function start(diff: Difficulty) {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    setDifficulty(diff);
    setPuzzle(p);
    setSolution(s);
    setBoard([...p]);
    setStartTime(Date.now());
    setElapsedMs(0);
    setWon(false);
    pausedAccumRef.current = 0;
  }

  useEffect(() => {
    if (!startTime || paused || won) return;
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime - pausedAccumRef.current);
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, paused, won]);

  function togglePause() {
    if (paused) {
      if (pauseStartRef.current) {
        pausedAccumRef.current += Date.now() - pauseStartRef.current;
      }
      setPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setPaused(true);
    }
  }

  function applyValue(value: number) {
    if (selected === null || paused || won) return;
    if (puzzle[selected] !== 0) return;
    const next = [...board];
    next[selected] = value;
    setBoard(next);

    if (!next.includes(0) && boardMatchesSolution(next, solution)) {
      setWon(true);
    }
  }

  if (!difficulty) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
        <Stars count={50} />
        <div className="card w-full max-w-sm p-6 text-center">
          <h1 className="text-lg font-semibold text-white">Play Solo</h1>
          <p className="mt-1 text-sm text-white/40">Choose a difficulty</p>
          <div className="mt-6 flex flex-col gap-3">
            {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
              <button key={d} onClick={() => start(d)} className="btn-secondary w-full capitalize">
                {d}
              </button>
            ))}
          </div>
          <button onClick={() => router.push("/")} className="mt-6 text-xs text-white/40 underline">
            Back to Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center px-4 py-6">
      <Stars count={40} />

      <div className="flex w-full max-w-[min(92vw,420px)] items-center justify-between">
        <span className="text-xs capitalize text-white/40">{difficulty}</span>
        <span className="font-mono text-lg text-white/90">{formatTime(elapsedMs)}</span>
        <button onClick={togglePause} className="text-xs text-white/50 underline">
          {paused ? "Resume" : "Pause"}
        </button>
      </div>

      {won ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-4xl">🌟</p>
          <h2 className="mt-4 text-xl font-semibold text-white">Solved!</h2>
          <p className="mt-1 font-mono text-white/60">{formatTime(elapsedMs)}</p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <button onClick={() => setDifficulty(null)} className="btn-primary w-full">
              Play Again
            </button>
            <button onClick={() => router.push("/")} className="btn-secondary w-full">
              Back to Home
            </button>
          </div>
        </div>
      ) : paused ? (
        <div className="mt-16 text-center text-white/40">Paused</div>
      ) : (
        <div className="mt-6 w-full">
          <Board puzzle={puzzle} board={board} selected={selected} onSelect={setSelected} accent="sun" />
          <NumberPad onNumber={applyValue} onErase={() => applyValue(0)} accent="sun" />
        </div>
      )}
    </main>
  );
}
