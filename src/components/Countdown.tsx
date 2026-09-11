"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  startedAt: string; // server ISO timestamp — the moment the match becomes active
  onComplete: () => void;
}

// Derives "3, 2, 1, GO" purely from the difference between server time
// (startedAt) and the client's current clock — never from a local timer
// that starts independently on each device. Both clients converge on the
// same displayed number because they're both counting down to the same
// absolute instant.
export default function Countdown({ startedAt, onComplete }: CountdownProps) {
  const [label, setLabel] = useState("3");

  useEffect(() => {
    const target = new Date(startedAt).getTime();
    let completed = false;

    const tick = () => {
      const msLeft = target - Date.now();
      if (msLeft <= 0) {
        if (!completed) {
          completed = true;
          setLabel("GO");
          setTimeout(onComplete, 400);
        }
        return;
      }
      setLabel(String(Math.ceil(msLeft / 1000)));
    };

    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [startedAt, onComplete]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="animate-pulseGlow font-display text-7xl font-semibold text-white sm:text-8xl">
        {label}
      </div>
      <p className="mt-4 text-sm text-white/40">Get ready…</p>
    </div>
  );
}
