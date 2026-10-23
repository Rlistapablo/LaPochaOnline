CREATE TABLE IF NOT EXISTS game_events (
  room_code text NOT NULL,
  match_cycle integer NOT NULL,
  sequence bigint NOT NULL,
  type text NOT NULL,
  player_id uuid,
  data jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY(room_code,match_cycle,sequence)
);
CREATE INDEX IF NOT EXISTS idx_game_events_replay ON game_events(room_code,match_cycle,sequence);

CREATE TABLE IF NOT EXISTS game_snapshots (
  room_code text NOT NULL,
  match_cycle integer NOT NULL,
  sequence bigint NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_code,match_cycle,sequence)
);
CREATE TABLE IF NOT EXISTS game_replays (
  game_id uuid PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  available boolean NOT NULL DEFAULT true,
  event_count bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS room_settings (
  room_code text PRIMARY KEY REFERENCES rooms(code) ON DELETE CASCADE,
  settings jsonb NOT NULL,
  joker_count integer NOT NULL DEFAULT 2 CHECK(joker_count BETWEEN 0 AND 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bot_profiles (
  room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  name text NOT NULL,
  avatar text NOT NULL,
  difficulty text NOT NULL CHECK(difficulty IN ('easy','normal','hard')),
  PRIMARY KEY(room_code,player_id)
);
CREATE TABLE IF NOT EXISTS room_audit_log (
  id bigserial PRIMARY KEY,
  room_code text NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_room_audit_code ON room_audit_log(room_code,occurred_at DESC);
CREATE TABLE IF NOT EXISTS round_turn_orders (
  round_id bigint NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL,
  position integer NOT NULL CHECK(position>0),
  PRIMARY KEY(round_id,player_id),
  UNIQUE(round_id,position)
);
ALTER TABLE games ADD COLUMN IF NOT EXISTS room_name text;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE game_players ADD COLUMN IF NOT EXISTS bot_difficulty text;
ALTER TABLE rounds ADD COLUMN IF NOT EXISTS wave integer NOT NULL DEFAULT 0;
ALTER TABLE round_players ADD COLUMN IF NOT EXISTS lives_before integer;
ALTER TABLE tricks ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE tricks ADD COLUMN IF NOT EXISTS finished_at timestamptz;
ALTER TABLE trick_plays ADD COLUMN IF NOT EXISTS played_at timestamptz;
