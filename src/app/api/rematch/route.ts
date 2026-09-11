import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { generatePuzzle, type Difficulty } from "@/lib/sudoku";

const COUNTDOWN_SECONDS = 3;

export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId } = await req.json();
    if (!roomId || !playerId) {
      return NextResponse.json({ error: "roomId and playerId are required." }, { status: 400 });
    }

    const supabase = supabaseServer();

    await supabase.from("players").update({ wants_rematch: true }).eq("player_id", playerId);

    const { data: players } = await supabase.from("players").select("*").eq("room_id", roomId);

    if (!players || players.length < 2) {
      return NextResponse.json({ waiting: true });
    }

    const bothReady = players.every((p) => p.wants_rematch);
    if (!bothReady) {
      return NextResponse.json({ waiting: true });
    }

    const { data: currentRoom } = await supabase
      .from("rooms")
      .select("difficulty")
      .eq("room_id", roomId)
      .single();

    const { puzzle, solution } = generatePuzzle((currentRoom?.difficulty as Difficulty) ?? "medium");

    const countdownStartAt = new Date().toISOString();
    const startedAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000).toISOString();

    const { data: room, error } = await supabase
      .from("rooms")
      .update({
        status: "countdown",
        puzzle,
        solution,
        winner: null,
        finished_at: null,
        countdown_start_at: countdownStartAt,
        started_at: startedAt,
      })
      .eq("room_id", roomId)
      .select("room_id, room_code, status, puzzle, difficulty, created_at, started_at, countdown_start_at")
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Could not start rematch." }, { status: 500 });
    }

    // Reset both players' in-match state, keeping their identities.
    await supabase
      .from("players")
      .update({ progress: 0, completion_time_ms: null, wants_rematch: false })
      .eq("room_id", roomId);

    return NextResponse.json({ waiting: false, room, countdownSeconds: COUNTDOWN_SECONDS });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
