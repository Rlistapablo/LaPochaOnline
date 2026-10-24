import {pool} from './db.js';
import type {Game,Settings} from '../shared/game.js';

export async function getRematchSettings(code:string,cycle:number,playerId:string):Promise<Settings>{
  if(!/^[A-Z0-9]{4,12}$/.test(code)||!Number.isSafeInteger(cycle)||cycle<0)throw Error('Partida inválida');
  const found=await pool.query<{settings:Settings;participant:boolean}>('SELECT g.settings,EXISTS(SELECT 1 FROM game_players gp WHERE gp.game_id=g.id AND (gp.player_id=$3 OR gp.user_id=$3)) participant FROM games g WHERE g.room_code=$1 AND g.cycle=$2 AND g.finished_at IS NOT NULL',[code,cycle,playerId]);
  const source=found.rows[0];
  if(!source||source.settings.private&&!source.participant)throw Error('Revancha no disponible');
  return source.settings;
}

export function orderReplayPlayers<T extends {player_id:string}>(players:T[],events:Array<{type:string;player_id?:string|null;data?:Record<string,unknown>}>):T[]{
  const started=events.find(event=>event.type==='game_started');
  const recorded=started?.data?.seatOrder;
  let ids=Array.isArray(recorded)?recorded.filter((id):id is string=>typeof id==='string'):[];
  if(!ids.length){
    const firstRound=events.find(event=>event.type==='round_started')?.data?.order;
    ids=Array.isArray(firstRound)?firstRound.filter((id):id is string=>typeof id==='string'):[];
    const host=events.find(event=>event.type==='room_created')?.player_id;
    const hostIndex=host?ids.indexOf(host):-1;
    if(hostIndex>0)ids=[...ids.slice(hostIndex),...ids.slice(0,hostIndex)];
  }
  const position=new Map(ids.map((id,index)=>[id,index]));
  return [...players].sort((a,b)=>(position.get(a.player_id)??Number.MAX_SAFE_INTEGER)-(position.get(b.player_id)??Number.MAX_SAFE_INTEGER)||a.player_id.localeCompare(b.player_id));
}

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
  const result=await pool.query('SELECT g.id,g.room_code,g.room_name,g.started_at,g.finished_at,g.winners,g.settings,g.cycle,gp.won FROM games g JOIN game_players gp ON gp.game_id=g.id LEFT JOIN game_replays gr ON gr.game_id=g.id WHERE gp.player_id=$1 AND gr.available IS DISTINCT FROM false ORDER BY g.finished_at DESC LIMIT 20 OFFSET $2',[playerId,offset]);
  return result.rows;
}

export async function getReplay(gameId:string,playerId:string,isAdmin=false){
  const found=await pool.query('SELECT g.*,EXISTS(SELECT 1 FROM game_players gp WHERE gp.game_id=g.id AND gp.player_id=$2) participant FROM games g LEFT JOIN game_replays gr ON gr.game_id=g.id WHERE g.id=$1 AND gr.available IS DISTINCT FROM false',[gameId,playerId]);
  const game=found.rows[0];
  if(!game||(!isAdmin&&!game.participant&&game.settings?.private!==false))throw Error('Repetición no disponible');
  const players=(await pool.query('SELECT player_id,name,avatar,is_bot,bot_difficulty,lives_start,lives_end,eliminated,won FROM game_players WHERE game_id=$1',[gameId])).rows;
  const events=(await pool.query('SELECT sequence,type,player_id,data,occurred_at FROM game_events WHERE room_code=$1 AND match_cycle=$2 ORDER BY sequence',[game.room_code,game.cycle])).rows;
  return {game,players:orderReplayPlayers(players,events),events};
}

export async function getReplayByRoom(code:string,cycle:number,playerId:string,isAdmin=false){
  if(!/^[A-Z0-9]{4,12}$/.test(code)||!Number.isSafeInteger(cycle)||cycle<0)throw Error('Partida inválida');
  const found=await pool.query<{id:string}>('SELECT g.id FROM games g LEFT JOIN game_replays gr ON gr.game_id=g.id WHERE g.room_code=$1 AND g.cycle=$2 AND g.finished_at IS NOT NULL AND gr.available IS DISTINCT FROM false',[code,cycle]);
  if(!found.rows[0])throw Error('Repetición no disponible');
  return getReplay(found.rows[0].id,playerId,isAdmin);
}

export async function deleteReplay(gameId:string,playerId:string,isAdmin=false){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const found=await client.query<{room_code:string;cycle:number;participant:boolean}>('SELECT g.room_code,g.cycle,EXISTS(SELECT 1 FROM game_players gp WHERE gp.game_id=g.id AND gp.player_id=$2) participant FROM games g LEFT JOIN game_replays gr ON gr.game_id=g.id WHERE g.id=$1 AND gr.available IS DISTINCT FROM false FOR UPDATE OF g',[gameId,playerId]);
    const game=found.rows[0];
    if(!game)throw Error('Repetición no disponible');
    if(!game.participant&&!isAdmin)throw Error('No puedes borrar esta repetición');
    await client.query('DELETE FROM game_events WHERE room_code=$1 AND match_cycle=$2',[game.room_code,game.cycle]);
    await client.query('DELETE FROM game_snapshots WHERE room_code=$1 AND match_cycle=$2',[game.room_code,game.cycle]);
    await client.query('INSERT INTO game_replays(game_id,available,event_count) VALUES($1,false,0) ON CONFLICT(game_id) DO UPDATE SET available=false,event_count=0',[gameId]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}

export async function deleteReplays(gameIds:string[],playerId:string,isAdmin=false){
  if(!Array.isArray(gameIds))throw Error('Selección de repeticiones inválida');
  const ids=[...new Set(gameIds)];
  if(!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)))throw Error('Selección de repeticiones inválida');
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const found=await client.query<{id:string;room_code:string;cycle:number;participant:boolean}>('SELECT g.id,g.room_code,g.cycle,EXISTS(SELECT 1 FROM game_players gp WHERE gp.game_id=g.id AND gp.player_id=$2) participant FROM games g LEFT JOIN game_replays gr ON gr.game_id=g.id WHERE g.id=ANY($1::uuid[]) AND gr.available IS DISTINCT FROM false ORDER BY g.id FOR UPDATE OF g',[ids,playerId]);
    if(found.rows.length!==ids.length)throw Error('Repetición no disponible');
    if(!isAdmin&&found.rows.some(game=>!game.participant))throw Error('No puedes borrar esta repetición');
    for(const game of found.rows){
      await client.query('DELETE FROM game_events WHERE room_code=$1 AND match_cycle=$2',[game.room_code,game.cycle]);
      await client.query('DELETE FROM game_snapshots WHERE room_code=$1 AND match_cycle=$2',[game.room_code,game.cycle]);
      await client.query('INSERT INTO game_replays(game_id,available,event_count) VALUES($1,false,0) ON CONFLICT(game_id) DO UPDATE SET available=false,event_count=0',[game.id]);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
