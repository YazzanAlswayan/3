import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { roomCode } = await req.json();
    if (!roomCode || typeof roomCode !== "string") {
      return NextResponse.json({ error: "Room code is required." }, { status: 400 });
    }

    const supabase = supabaseServer();
    const normalizedCode = roomCode.trim().toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("room_id, room_code, status, puzzle, difficulty, created_at")
      .eq("room_code", normalizedCode)
      .maybeSingle();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found. Check the code and try again." }, { status: 404 });
    }

    if (room.status !== "waiting") {
      return NextResponse.json(
        { error: "This room is full or the match has already started." },
        { status: 409 }
      );
    }

    const { data: existingPlayers } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", room.room_id);

    if (!existingPlayers || existingPlayers.length === 0) {
      return NextResponse.json({ error: "Room has no host. It may have expired." }, { status: 409 });
    }
    if (existingPlayers.length >= 2) {
      return NextResponse.json({ error: "This room is already full." }, { status: 409 });
    }

    // Atomically claim slot 2: rely on the unique (room_id, player_number)
    // constraint to prevent a race where two joiners both grab "Moon".
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.room_id,
        player_number: 2,
        player_identity: "moon",
      })
      .select("*")
      .single();

    if (playerError) {
      // Most likely the unique constraint fired because someone else joined first.
      return NextResponse.json({ error: "This room is already full." }, { status: 409 });
    }

    const { data: updatedRoom } = await supabase
      .from("rooms")
      .update({ status: "ready" })
      .eq("room_id", room.room_id)
      .select("room_id, room_code, status, puzzle, difficulty, created_at")
      .single();

    return NextResponse.json({ room: updatedRoom ?? room, player });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
