"use client";

interface NumberPadProps {
  onNumber: (n: number) => void;
  onErase: () => void;
  accent: "sun" | "moon";
}

export default function NumberPad({ onNumber, onErase, accent }: NumberPadProps) {
  const activeBg = accent === "sun" ? "active:bg-sun/20" : "active:bg-moon/20";

  return (
    <div className="mx-auto mt-4 w-full max-w-[min(92vw,420px)]">
      <div className="grid grid-cols-9 gap-1.5">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onNumber(n)}
            className={`card ${activeBg} flex h-11 items-center justify-center text-base font-medium text-white/90 sm:h-12 sm:text-lg`}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={onErase}
        className="btn-secondary mt-2 w-full py-2.5 text-sm"
      >
        Erase
      </button>
    </div>
  );
}
