"use client";

import { hasConflict, type Board as BoardType } from "@/lib/sudoku";

interface BoardProps {
  puzzle: BoardType; // 0 = editable cell
  board: BoardType; // current entered values
  selected: number | null;
  onSelect: (idx: number) => void;
  accent: "sun" | "moon";
}

function rowOf(i: number) {
  return Math.floor(i / 9);
}
function colOf(i: number) {
  return i % 9;
}
function boxOf(i: number) {
  return Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
}

export default function Board({ puzzle, board, selected, onSelect, accent }: BoardProps) {
  const selRow = selected !== null ? rowOf(selected) : null;
  const selCol = selected !== null ? colOf(selected) : null;
  const selBox = selected !== null ? boxOf(selected) : null;
  const selValue = selected !== null ? board[selected] : 0;

  const accentRing = accent === "sun" ? "ring-sun/70" : "ring-moon/70";
  const accentText = accent === "sun" ? "text-sun" : "text-moon";

  return (
    <div
      className="mx-auto grid aspect-square w-full max-w-[min(92vw,420px)] grid-cols-9 grid-rows-9 overflow-hidden rounded-xl border border-white/15 bg-midnight-800 shadow-soft"
      role="grid"
      aria-label="Sudoku board"
    >
      {puzzle.map((given, i) => {
        const value = board[i];
        const isGiven = given !== 0;
        const isSelected = selected === i;
        const isPeer =
          selected !== null && (rowOf(i) === selRow || colOf(i) === selCol || boxOf(i) === selBox);
        const isSameValue = selValue !== 0 && value === selValue;
        const conflict = !isGiven && hasConflict(board, i);

        const r = rowOf(i);
        const c = colOf(i);

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            aria-label={`Row ${r + 1}, column ${c + 1}${value ? `, value ${value}` : ", empty"}`}
            className={[
              "relative flex items-center justify-center text-[clamp(0.85rem,3.2vw,1.15rem)] transition-colors duration-100",
              "border-white/5",
              c % 3 === 2 && c !== 8 ? "border-r-2 border-r-white/20" : "border-r",
              r % 3 === 2 && r !== 8 ? "border-b-2 border-b-white/20" : "border-b",
              isSelected
                ? `ring-2 ${accentRing} ring-inset bg-white/10`
                : isPeer
                ? "bg-white/[0.045]"
                : "bg-transparent",
              isSameValue && !isSelected ? "bg-white/[0.07]" : "",
              isGiven ? "font-semibold text-white/85" : conflict ? "text-red-400/90" : accentText,
            ].join(" ")}
          >
            {value !== 0 ? value : ""}
          </button>
        );
      })}
    </div>
  );
}
