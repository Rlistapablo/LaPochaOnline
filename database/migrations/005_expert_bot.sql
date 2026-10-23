ALTER TABLE bot_profiles DROP CONSTRAINT IF EXISTS bot_profiles_difficulty_check;
ALTER TABLE bot_profiles ADD CONSTRAINT bot_profiles_difficulty_check CHECK(difficulty IN ('easy','normal','hard','expert'));
