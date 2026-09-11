import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { computeProgress, type Board } from "@/lib/sudoku";

// Recomputes progress server-side from the puzzle + current board, rather
// than trusting a client-reported percentage. Also opportunistically flips
// room status from "countdown" to "active" once the server-timed start
// moment has passed.
export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, board } = (await req.json()) as {
      roomId: string;
      playerId: string;
      board: Board;
    };

    if (!roomId || !playerId || !Array.isArray(board) || board.length !== 81) {
      return NextResponse.json({ error: "Invalid progress update." }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: room } = await supabase
      .from("rooms")
      .select("puzzle, status, started_at, winner")
      .eq("room_id", roomId)
      .single();

    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    if (room.winner) return NextResponse.json({ ok: true, ignored: true });

    if (
      room.status === "countdown" &&
      room.started_at &&
      new Date(room.started_at).getTime() <= Date.now()
    ) {
      await supabase.from("rooms").update({ status: "active" }).eq("room_id", roomId).eq("status", "countdown");
    }

    const progress = computeProgress(room.puzzle as Board, board);

    await supabase.from("players").update({ progress, last_seen_at: new Date().toISOString() }).eq("player_id", playerId);

    return NextResponse.json({ ok: true, progress });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
