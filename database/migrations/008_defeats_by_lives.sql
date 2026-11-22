UPDATE player_statistics stats
SET lost = (
  SELECT count(*)::integer
  FROM match_players mp
  JOIN matches m ON m.id = mp.match_id
  WHERE mp.user_id = stats.user_id
    AND m.competitive = stats.competitive
    AND mp.against_bots = stats.against_bots
    AND EXISTS (
      SELECT 1
      FROM game_players gp
      WHERE gp.game_id = mp.match_id
        AND gp.user_id = mp.user_id
        AND gp.lives_end = 0
    )
);
