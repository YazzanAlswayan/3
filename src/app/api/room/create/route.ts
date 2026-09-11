import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generatePuzzle } from "@/lib/sudoku";
import type { Difficulty } from "@/lib/sudoku";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

function generateRoomCode(length = 5): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const difficulty: Difficulty = ["easy", "medium", "hard"].includes(body?.difficulty)
      ? body.difficulty
      : "medium";

    const supabase = supabaseServer();
    const { puzzle, solution } = generatePuzzle(difficulty);

    // Retry on the rare room_code collision.
    let roomCode = generateRoomCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: existing } = await supabase
        .from("rooms")
        .select("room_id")
        .eq("room_code", roomCode)
        .maybeSingle();
      if (!existing) break;
      roomCode = generateRoomCode();
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        room_code: roomCode,
        status: "waiting",
        puzzle,
        solution,
        difficulty,
      })
      .select("room_id, room_code, status, puzzle, difficulty, created_at")
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Could not create room." }, { status: 500 });
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.room_id,
        player_number: 1,
        player_identity: "sun",
      })
      .select("*")
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Could not create player." }, { status: 500 });
    }

    return NextResponse.json({ room, player });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
