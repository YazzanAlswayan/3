# ☀️ Sun & Moon Sudoku 🌙

A calm, elegant 1v1 real-time Sudoku duel. Two players race to solve the exact
same puzzle — first correct, server-verified completion wins.

This repo is a complete, working codebase. It was **not** built or deployed
from within this chat (no network/Supabase access here), so before it runs
you need to wire it up to a real Supabase project and install dependencies
locally. That takes about 10 minutes — steps below.

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project.
2. Once it's provisioned, open **SQL Editor** → paste the contents of
   `supabase/schema.sql` → run it. This creates the `rooms` and `players`
   tables, sets up Row Level Security so the client can never read the
   puzzle's `solution` column, and enables Realtime on both tables.
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in the three values from step 2. **Never commit `.env.local`** — the
service role key must stay server-side only (it's already excluded via
`.gitignore` conventions for Next.js).

## 4. Run locally

```bash
npm run dev
```

Open two browser windows (or one normal + one incognito) at
`http://localhost:3000` to simulate two players — this is exactly how to
run the two-session test checklist below.

## 5. Deploy to Vercel

```bash
npx vercel
```

Add the same three environment variables in the Vercel project's
**Settings → Environment Variables**, then redeploy. Supabase Realtime
works over WebSockets and needs no extra Vercel configuration.

## How the architecture enforces "no cheating"

- **The solution never reaches the browser.** `solution` is a Postgres
  column excluded from `rooms_public` (the view/select the client actually
  reads) and further locked down with an explicit column-level `REVOKE` in
  `supabase/schema.sql`. Only `src/lib/supabase/server.ts`, used exclusively
  inside `src/app/api/*` route handlers with the service-role key, can read it.
- **The server decides who won.** `src/app/api/submit/route.ts` compares
  the submitted board to the stored solution and claims the win with an
  `UPDATE ... WHERE winner IS NULL`. Postgres serializes concurrent writes to
  the same row, so even near-simultaneous submissions can only let one of
  them succeed — there is no possible race that produces two winners.
- **The clock is the server's.** `started_at` is set server-side in
  `api/room/start` and `api/rematch`; the countdown (`Countdown.tsx`) and
  the completion time (`completionTimeMs` in `api/submit`) are both derived
  from that timestamp, never from a client-reported value.
- **Progress is recomputed server-side**, not trusted from the client
  (`api/progress/route.ts`), and the opponent's actual entered numbers are
  never broadcast — only the percentage.

## Project structure

```
src/
  app/
    page.tsx              Landing page
    create/page.tsx        Create Game flow
    join/page.tsx           Join Game flow
    solo/page.tsx           Solo mode (fully local, no server needed)
    room/[code]/page.tsx    Lobby → countdown → gameplay → result (realtime)
    api/
      room/create/          Creates room + puzzle, assigns Sun
      room/join/             Assigns Moon, validates room state
      room/start/            Server-timed countdown kickoff
      submit/                 Authoritative win/lose check
      progress/               Server-recomputed progress %
      heartbeat/              Presence ping for disconnect detection
      rematch/                 Mutual-agreement rematch with fresh puzzle
  components/               Board, NumberPad, PlayerHeader, Countdown, ResultScreen, Stars
  lib/
    sudoku.ts               Generator, uniqueness check, validator
    types.ts                 Shared types
    supabase/client.ts       Browser client (anon key)
    supabase/server.ts       Server-only client (service role key)
supabase/schema.sql          Tables, RLS policies, Realtime setup
```

## Testing checklist (two browser sessions)

Open the app in two separate sessions (e.g. normal window + incognito) and
walk through:

1. Session A creates a room → becomes The Sun, sees the room code.
2. Session B joins with that code → becomes The Moon.
3. Both sessions show "VS" and a Start button on the host's screen.
4. Host clicks Start → both sessions show the same synchronized countdown.
5. Both boards show the identical puzzle.
6. Filling cells updates each side's own progress bar; the *other* side's
   progress bar (not their numbers) updates a second or two later.
7. Finish the puzzle correctly on one side — that side's `submit` call wins;
   both sessions transition to the result screen showing the same winner.
8. Click Play Again on both sessions — a fresh puzzle starts with a new
   countdown, same identities retained.
9. Close one session's tab — the other should show a "reconnecting" /
   "left" indicator within ~12 seconds (the heartbeat staleness window in
   `room/[code]/page.tsx`).
10. Try joining a full or already-started room — confirm the clear error
    messages from `api/room/join`.

## Known simplifications (first version)

- No accounts/auth yet — a room is joinable by anyone who has the code, by
  design (see section 27 of the original spec). Add Supabase Auth + RLS
  ownership checks later if you want private rooms or match history.
- Disconnection handling shows a "reconnecting" indicator based on a
  heartbeat staleness window; it doesn't yet auto-forfeit a match after a
  long absence — add that in `api/heartbeat` if you want it.
- Sound effects and Mute button (section 22) are stubbed out as a
  straightforward addition — drop audio files in `public/sounds/` and wire
  them into `NumberPad`/`Board`/`ResultScreen` click handlers.
