-- Sun & Moon Sudoku — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

-- ============================================================
-- ROOMS
-- ============================================================
create table if not exists rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  status text not null default 'waiting'
    check (status in ('waiting','ready','countdown','active','finished')),
  puzzle jsonb not null,          -- length-81 array, safe to expose
  solution jsonb not null,        -- length-81 array, NEVER exposed via RLS to clients
  difficulty text not null default 'medium'
    check (difficulty in ('easy','medium','hard')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  winner text check (winner in ('sun','moon')),
  countdown_start_at timestamptz
);

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists players (
  player_id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(room_id) on delete cascade,
  player_number int not null check (player_number in (1,2)),
  player_identity text not null check (player_identity in ('sun','moon')),
  connected boolean not null default true,
  progress int not null default 0 check (progress between 0 and 100),
  completion_time_ms int,
  wants_rematch boolean not null default false,
  last_seen_at timestamptz not null default now(),
  unique (room_id, player_number)
);

create index if not exists idx_players_room on players(room_id);
create index if not exists idx_rooms_code on rooms(room_code);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table rooms enable row level security;
alter table players enable row level security;

-- Public/anon clients may SELECT rooms, but a view without `solution` is what
-- the app actually queries against (see `rooms_public` below). We still lock
-- direct table access down: clients can read rows, but the API routes are
-- the only place that ever request the `solution` column, using the
-- service-role key which bypasses RLS entirely. To make this airtight even
-- if a client queried `rooms` directly with select('*'), we revoke column
-- access to `solution` from the anon/authenticated roles.

create or replace view rooms_public as
  select room_id, room_code, status, puzzle, difficulty,
         created_at, started_at, finished_at, winner, countdown_start_at
  from rooms;

grant select on rooms_public to anon, authenticated;

-- Anon/authenticated can read rooms (minus solution) and players freely —
-- this is a casual game with no sensitive personal data, so room state is
-- effectively public to anyone holding the room code. Writes to rooms/players
-- go exclusively through server API routes using the service role key, so
-- no INSERT/UPDATE/DELETE policies are granted to anon/authenticated here.

create policy "rooms readable (no solution)" on rooms
  for select
  using (true);

-- Explicitly revoke the solution column from the row-level grant so that
-- even ad-hoc `select *` queries from the anon key cannot read it.
revoke select on rooms from anon, authenticated;
grant select (room_id, room_code, status, puzzle, difficulty, created_at,
              started_at, finished_at, winner, countdown_start_at)
  on rooms to anon, authenticated;

create policy "players readable" on players
  for select
  using (true);

grant select on players to anon, authenticated;

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
