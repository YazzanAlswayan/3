import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const COUNTDOWN_SECONDS = 3;

// Called by the Sun (host) once both players are connected. Sets a server
// timestamp that both clients derive the "3, 2, 1, GO" countdown from —
// this is what keeps the countdown synchronized regardless of each client's
// local clock or network latency.
export async function POST(req: NextRequest) {
  try {
    const { roomId } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required." }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: players } = await supabase.from("players").select("*").eq("room_id", roomId);
    if (!players || players.length < 2) {
      return NextResponse.json({ error: "Both players must be connected to start." }, { status: 409 });
    }

    const { data: room } = await supabase.from("rooms").select("status").eq("room_id", roomId).single();
    if (!room || room.status !== "ready") {
      return NextResponse.json({ error: "Room is not ready to start." }, { status: 409 });
    }

    const countdownStartAt = new Date().toISOString();
    const startedAt = new Date(Date.now() + COUNTDOWN_SECONDS * 1000).toISOString();

    const { data: updatedRoom, error } = await supabase
      .from("rooms")
      .update({
        status: "countdown",
        countdown_start_at: countdownStartAt,
        started_at: startedAt,
      })
      .eq("room_id", roomId)
      .eq("status", "ready") // guard against double-start races
      .select("room_id, room_code, status, puzzle, difficulty, created_at, started_at, countdown_start_at")
      .single();

    if (error || !updatedRoom) {
      return NextResponse.json({ error: "Could not start match (already starting?)." }, { status: 409 });
    }

    return NextResponse.json({ room: updatedRoom, countdownSeconds: COUNTDOWN_SECONDS });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
