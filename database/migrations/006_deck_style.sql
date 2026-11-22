ALTER TABLE users ADD COLUMN IF NOT EXISTS deck_style text NOT NULL DEFAULT 'original';
ALTER TABLE users ADD CONSTRAINT users_deck_style_check CHECK (deck_style IN ('original','clasica'));
