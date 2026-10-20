CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,name text NOT NULL,avatar text NOT NULL DEFAULT '🃏',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS avatars(id bigserial PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,image text,icon text,color text,frame text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS matches(id uuid PRIMARY KEY,room_code text NOT NULL,competitive boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),result jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS match_players(match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,won boolean NOT NULL,exact_predictions integer NOT NULL,tricks_won integer NOT NULL,against_bots boolean NOT NULL,PRIMARY KEY(match_id,user_id));
CREATE TABLE IF NOT EXISTS password_resets(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rooms(code text PRIMARY KEY,host_id uuid NOT NULL,private boolean NOT NULL,status text NOT NULL CHECK(status IN ('lobby','bid','play','roundEnd','finished')),settings jsonb NOT NULL,state jsonb NOT NULL,version integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS room_players(room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,player_id uuid NOT NULL,user_id uuid REFERENCES users(id) ON DELETE SET NULL,name text NOT NULL,avatar text NOT NULL,seat integer NOT NULL CHECK(seat>=0),is_bot boolean NOT NULL,connected boolean NOT NULL,ready boolean NOT NULL,eliminated boolean NOT NULL,PRIMARY KEY(room_code,player_id),UNIQUE(room_code,seat));
CREATE TABLE IF NOT EXISTS games(id uuid PRIMARY KEY,room_code text NOT NULL,cycle integer NOT NULL CHECK(cycle>=0),settings jsonb NOT NULL,started_at timestamptz,finished_at timestamptz,winners jsonb NOT NULL DEFAULT '[]',UNIQUE(room_code,cycle));
CREATE TABLE IF NOT EXISTS game_players(game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,player_id uuid NOT NULL,user_id uuid REFERENCES users(id) ON DELETE SET NULL,name text NOT NULL,is_bot boolean NOT NULL,lives_start integer NOT NULL CHECK(lives_start>0),lives_end integer NOT NULL CHECK(lives_end>=0),eliminated boolean NOT NULL,won boolean NOT NULL,PRIMARY KEY(game_id,player_id));
CREATE TABLE IF NOT EXISTS rounds(id bigserial PRIMARY KEY,game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,round_index integer NOT NULL CHECK(round_index>=0),cards_per_player integer NOT NULL CHECK(cards_per_player>0),status text NOT NULL DEFAULT 'finished',UNIQUE(game_id,round_index));
CREATE TABLE IF NOT EXISTS round_players(round_id bigint NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,player_id uuid NOT NULL,bid integer NOT NULL CHECK(bid>=0),tricks_won integer NOT NULL CHECK(tricks_won>=0),difference integer NOT NULL CHECK(difference>=0),miss_streak integer NOT NULL CHECK(miss_streak>=0),multiplier integer NOT NULL CHECK(multiplier>=1),lives_lost integer NOT NULL CHECK(lives_lost>=0),lives_remaining integer NOT NULL CHECK(lives_remaining>=0),PRIMARY KEY(round_id,player_id));
CREATE TABLE IF NOT EXISTS tricks(id bigserial PRIMARY KEY,round_id bigint NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,trick_index integer NOT NULL CHECK(trick_index>=0),winner_id uuid NOT NULL,UNIQUE(round_id,trick_index));
CREATE TABLE IF NOT EXISTS trick_plays(trick_id bigint NOT NULL REFERENCES tricks(id) ON DELETE CASCADE,round_id bigint NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,play_index integer NOT NULL CHECK(play_index>=0),player_id uuid NOT NULL,card_id text NOT NULL,declared_value text,PRIMARY KEY(trick_id,play_index),UNIQUE(round_id,card_id));
CREATE TABLE IF NOT EXISTS defeat_history(game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,round_id bigint NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,player_id uuid NOT NULL,user_id uuid REFERENCES users(id) ON DELETE CASCADE,difference integer NOT NULL CHECK(difference>0),miss_streak integer NOT NULL CHECK(miss_streak>0),multiplier integer NOT NULL CHECK(multiplier>=1),lives_lost integer NOT NULL CHECK(lives_lost>=0),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(game_id,round_id,player_id));
CREATE TABLE IF NOT EXISTS player_statistics(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,competitive boolean NOT NULL,against_bots boolean NOT NULL,played integer NOT NULL DEFAULT 0,won integer NOT NULL DEFAULT 0,lost integer NOT NULL DEFAULT 0,eliminations integer NOT NULL DEFAULT 0,exact_predictions integer NOT NULL DEFAULT 0,tricks_won integer NOT NULL DEFAULT 0,best_streak integer NOT NULL DEFAULT 0,PRIMARY KEY(user_id,competitive,against_bots));
CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(updated_at DESC) WHERE private=false AND status='lobby';
CREATE INDEX IF NOT EXISTS idx_room_players_user ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_players_user ON match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_defeat_user ON defeat_history(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_room ON games(room_code,cycle);

-- Extensiones de historial, repetición y operaciones idempotentes
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

CREATE TABLE IF NOT EXISTS room_operations (
  room_code text NOT NULL,
  match_cycle integer NOT NULL,
  operation_id uuid NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_code,match_cycle,operation_id)
);
