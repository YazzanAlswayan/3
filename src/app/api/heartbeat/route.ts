import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Called periodically by each client while in a room. If a player's
// last_seen_at goes stale (see the client polling in RoomContext), the UI
// treats them as disconnected. This endpoint also lets a reconnecting client
// flip `connected` back to true.
export async function POST(req: NextRequest) {
  try {
    const { playerId, connected = true } = await req.json();
    if (!playerId) return NextResponse.json({ error: "playerId is required." }, { status: 400 });

    const supabase = supabaseServer();
    await supabase
      .from("players")
      .update({ connected, last_seen_at: new Date().toISOString() })
      .eq("player_id", playerId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
