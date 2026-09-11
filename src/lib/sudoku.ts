// Sudoku engine: generation, solving, uniqueness checking, and validation.
// All puzzle/solution generation must happen server-side only —
// never ship the solution to a client before the match ends.

export type Board = number[]; // length-81 array, 0 = empty
export type Difficulty = "easy" | "medium" | "hard";

const SIZE = 9;
const BOX = 3;

function indexOf(row: number, col: number) {
  return row * SIZE + col;
}

function rowOf(idx: number) {
  return Math.floor(idx / SIZE);
}
function colOf(idx: number) {
  return idx % SIZE;
}
function boxOf(idx: number) {
  const r = rowOf(idx);
  const c = colOf(idx);
  return Math.floor(r / BOX) * BOX + Math.floor(c / BOX);
}

function isSafe(board: Board, idx: number, val: number): boolean {
  const r = rowOf(idx);
  const c = colOf(idx);
  const boxRowStart = Math.floor(r / BOX) * BOX;
  const boxColStart = Math.floor(c / BOX) * BOX;

  for (let i = 0; i < SIZE; i++) {
    if (board[indexOf(r, i)] === val) return false;
    if (board[indexOf(i, c)] === val) return false;
  }
  for (let br = 0; br < BOX; br++) {
    for (let bc = 0; bc < BOX; bc++) {
      if (board[indexOf(boxRowStart + br, boxColStart + bc)] === val) return false;
    }
  }
  return true;
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Fills a board completely using randomized backtracking. Produces a full valid solution. */
function generateFullSolution(): Board {
  const board: Board = new Array(81).fill(0);

  function fill(pos: number): boolean {
    if (pos === 81) return true;
    if (board[pos] !== 0) return fill(pos + 1);

    for (const val of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isSafe(board, pos, val)) {
        board[pos] = val;
        if (fill(pos + 1)) return true;
        board[pos] = 0;
      }
    }
    return false;
  }

  fill(0);
  return board;
}

/** Counts solutions up to a cap (2) to check uniqueness efficiently. */
function countSolutions(board: Board, cap = 2): number {
  const b = [...board];
  let count = 0;

  function solve(pos: number): boolean {
    if (pos === 81) {
      count++;
      return count >= cap; // stop early once cap reached
    }
    if (b[pos] !== 0) return solve(pos + 1);

    for (let val = 1; val <= 9; val++) {
      if (isSafe(b, pos, val)) {
        b[pos] = val;
        if (solve(pos + 1)) return true;
        b[pos] = 0;
      }
    }
    return false;
  }

  solve(0);
  return count;
}

const DIFFICULTY_CLUES: Record<Difficulty, [number, number]> = {
  easy: [40, 45],
  medium: [32, 38],
  hard: [24, 30],
};

/** Generates a puzzle (with holes) and its full solution. Puzzle has a unique solution. */
export function generatePuzzle(difficulty: Difficulty = "medium"): {
  puzzle: Board;
  solution: Board;
} {
  const solution = generateFullSolution();
  const puzzle = [...solution];

  const [minClues, maxClues] = DIFFICULTY_CLUES[difficulty];
  const targetClues = Math.floor(minClues + Math.random() * (maxClues - minClues + 1));
  const cellsToRemove = 81 - targetClues;

  const positions = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let removed = 0;

  for (const pos of positions) {
    if (removed >= cellsToRemove) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;

    // Only keep the removal if the puzzle still has a unique solution.
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[pos] = backup; // revert, not safe to remove
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

/** Validates that a completed board is fully filled and matches Sudoku rules (not against a solution). */
export function isBoardStructurallyValid(board: Board): boolean {
  if (board.length !== 81) return false;
  if (board.some((v) => v < 1 || v > 9)) return false; // must be fully filled, 0 = incomplete

  for (let i = 0; i < 81; i++) {
    const val = board[i];
    const test = [...board];
    test[i] = 0;
    if (!isSafe(test, i, val)) return false;
  }
  return true;
}

/** Server-side authoritative check: does the submitted board exactly equal the stored solution? */
export function boardMatchesSolution(board: Board, solution: Board): boolean {
  if (board.length !== 81 || solution.length !== 81) return false;
  return board.every((v, i) => v === solution[i]);
}

/** Computes percentage progress: fraction of empty (given) cells the player has filled in, regardless of correctness. */
export function computeProgress(puzzle: Board, currentBoard: Board): number {
  let toFill = 0;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] === 0) {
      toFill++;
      if (currentBoard[i] !== 0) filled++;
    }
  }
  if (toFill === 0) return 100;
  return Math.round((filled / toFill) * 100);
}

/**
 * Client-safe conflict check: does this cell's value duplicate another value
 * in its row, column, or box? The client never has the solution, so
 * "incorrect" highlighting is based on Sudoku rule conflicts only, not
 * correctness against the true solution.
 */
export function hasConflict(board: Board, idx: number): boolean {
  const value = board[idx];
  if (value === 0) return false;
  const test = [...board];
  test[idx] = 0;
  return !isSafe(test, idx, value);
}
