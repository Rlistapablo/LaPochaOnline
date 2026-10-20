import {pool} from './db.js';
import type {Game} from '../shared/game.js';

export async function finalizeReplay(g:Game){
  const found=await pool.query<{id:string}>('SELECT id FROM games WHERE room_code=$1 AND cycle=$2',[g.code,g.cycle]);
  const id=found.rows[0]?.id;
  if(!id)return;
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('UPDATE games SET room_name=$2 WHERE id=$1',[id,g.settings.name]);
    for(const p of g.players)await client.query('UPDATE game_players SET avatar=$3,bot_difficulty=$4 WHERE game_id=$1 AND player_id=$2',[id,p.id,p.avatar,p.bot??null]);
    for(const round of g.history){
      const result=await client.query<{id:number}>('UPDATE rounds SET wave=$3 WHERE game_id=$1 AND round_index=$2 RETURNING id',[id,round.roundIndex,round.wave??0]);
      const roundId=result.rows[0]?.id;
      if(!roundId)continue;
      for(const [index,playerId] of (round.order??[]).entries())await client.query('INSERT INTO round_turn_orders(round_id,player_id,position) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[roundId,playerId,index+1]);
      for(const player of round.result)await client.query('UPDATE round_players SET lives_before=$3 WHERE round_id=$1 AND player_id=$2',[roundId,player.id,player.livesBefore??null]);
      for(const [index,trick] of round.tricks.entries()){
        const foundTrick=await client.query<{id:number}>('UPDATE tricks SET reason=$3,finished_at=$4 WHERE round_id=$1 AND trick_index=$2 RETURNING id',[roundId,index,trick.reason??null,trick.finishedAt??null]);
        const trickId=foundTrick.rows[0]?.id;
        if(!trickId)continue;
        for(const [order,played] of trick.plays.entries())await client.query('UPDATE trick_plays SET played_at=$3 WHERE trick_id=$1 AND play_index=$2',[trickId,order,played.playedAt??null]);
      }
    }
    await client.query('INSERT INTO game_replays(game_id,event_count) VALUES($1,$2) ON CONFLICT(game_id) DO UPDATE SET event_count=EXCLUDED.event_count',[id,g.eventSeq??0]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function listReplays(playerId:string,page:number){
  const offset=Math.max(0,Math.min(10000,page))*20;
  const result=await pool.query('SELECT g.id,g.room_code,g.room_name,g.started_at,g.finished_at,g.winners,g.settings,g.cycle,gp.won FROM games g JOIN game_players gp ON gp.game_id=g.id WHERE gp.player_id=$1 ORDER BY g.finished_at DESC LIMIT 20 OFFSET $2',[playerId,offset]);
  return result.rows;
}

export async function getReplay(gameId:string,playerId:string,isAdmin=false){
  const found=await pool.query('SELECT g.*,EXISTS(SELECT 1 FROM game_players gp WHERE gp.game_id=g.id AND gp.player_id=$2) participant FROM games g WHERE g.id=$1',[gameId,playerId]);
  const game=found.rows[0];
  if(!game||(!isAdmin&&!game.participant&&game.settings?.private!==false))throw Error('Repetición no disponible');
  const players=(await pool.query('SELECT player_id,name,avatar,is_bot,bot_difficulty,lives_start,lives_end,eliminated,won FROM game_players WHERE game_id=$1',[gameId])).rows;
  const events=(await pool.query('SELECT sequence,type,player_id,data,occurred_at FROM game_events WHERE room_code=$1 AND match_cycle=$2 ORDER BY sequence',[game.room_code,game.cycle])).rows;
  return {game,players,events};
}
