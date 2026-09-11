import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { boardMatchesSolution, isBoardStructurallyValid, type Board } from "@/lib/sudoku";

// This is the single most important route in the game: it is the ONLY place
// that decides who won. The client is never trusted for correctness or timing.
export async function POST(req: NextRequest) {
  try {
    const { roomId, playerId, board } = (await req.json()) as {
      roomId: string;
      playerId: string;
      board: Board;
    };

    if (!roomId || !playerId || !Array.isArray(board) || board.length !== 81) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    const supabase = supabaseServer();

    const { data: room } = await supabase
      .from("rooms")
      .select("room_id, status, solution, started_at, winner")
      .eq("room_id", roomId)
      .single();

    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }
    if (room.status === "finished" || room.winner) {
      // A winner already exists — this submission is simply too late.
      return NextResponse.json({ correct: false, alreadyFinished: true, winner: room.winner });
    }
    if (!room.started_at || new Date(room.started_at).getTime() > Date.now()) {
      return NextResponse.json({ error: "Match has not started yet." }, { status: 409 });
    }

    const { data: player } = await supabase
      .from("players")
      .select("player_id, player_identity, room_id")
      .eq("player_id", playerId)
      .eq("room_id", roomId)
      .single();

    if (!player) {
      return NextResponse.json({ error: "Player not recognized for this room." }, { status: 403 });
    }

    const structurallyValid = isBoardStructurallyValid(board);
    const correct = structurallyValid && boardMatchesSolution(board, room.solution as Board);

    if (!correct) {
      // Not a win — but still record their progress as fully filled+incorrect
      // so the opponent doesn't see 100% when it isn't actually solved.
      return NextResponse.json({ correct: false });
    }

    // Server-authoritative completion time, measured from the server's own
    // started_at, never from anything the client reports.
    const completionTimeMs = Date.now() - new Date(room.started_at).getTime();

    // Atomically claim the win: only succeeds if `winner` is still null.
    // This uses the update's WHERE clause as the mutex — if two players
    // submit correct boards within milliseconds of each other, only one
    // UPDATE can match `winner.is(null)` because Postgres serializes row
    // writes, so there can never be two winners.
    const { data: wonRoom, error: winError } = await supabase
      .from("rooms")
      .update({
        status: "finished",
        winner: player.player_identity,
        finished_at: new Date().toISOString(),
      })
      .eq("room_id", roomId)
      .is("winner", null)
      .select("room_id, winner, finished_at")
      .single();

    if (winError || !wonRoom) {
      // Someone else won first between our checks above and now.
      const { data: finalRoom } = await supabase
        .from("rooms")
        .select("winner")
        .eq("room_id", roomId)
        .single();
      return NextResponse.json({ correct: true, wonRace: false, winner: finalRoom?.winner ?? null });
    }

    await supabase
      .from("players")
      .update({ progress: 100, completion_time_ms: completionTimeMs })
      .eq("player_id", playerId);

    return NextResponse.json({
      correct: true,
      wonRace: true,
      winner: player.player_identity,
      completionTimeMs,
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
