CREATE TABLE IF NOT EXISTS room_operations (
  room_code text NOT NULL,
  match_cycle integer NOT NULL,
  operation_id uuid NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(room_code,match_cycle,operation_id)
);
