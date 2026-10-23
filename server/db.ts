import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Game } from '../shared/game.js';

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export async function migrate() {
  const client=await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(7412042)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    for(const file of (await readdir(resolve('database/migrations'))).filter(x=>/^\d+.*\.sql$/.test(x)).sort()){
      if((await client.query('SELECT 1 FROM schema_migrations WHERE version=$1',[file])).rowCount)continue;
      await client.query('BEGIN');
      try{await client.query(await readFile(resolve('database/migrations',file),'utf8'));await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[file]);await client.query('COMMIT');console.log(`Migración aplicada: ${file}`);}
      catch(e){await client.query('ROLLBACK');throw e;}
    }
  }finally{await client.query('SELECT pg_advisory_unlock(7412042)');client.release();}
}
export async function saveRoom(g:Game){
  const client=await pool.connect();
  try{await client.query('BEGIN');
    g.updatedAt=new Date().toISOString();
    const state=JSON.stringify({...g,pendingEvents:[],pendingOperations:[]});
    await client.query(`INSERT INTO rooms(code,host_id,private,status,settings,state,version,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT(code) DO UPDATE SET host_id=EXCLUDED.host_id,private=EXCLUDED.private,status=EXCLUDED.status,settings=EXCLUDED.settings,state=EXCLUDED.state,version=EXCLUDED.version,updated_at=now()`,[g.code,g.hostId,g.settings.private,g.phase,JSON.stringify(g.settings),state,g.version]);
    await client.query(`INSERT INTO room_settings(room_code,settings,joker_count) VALUES($1,$2,$3) ON CONFLICT(room_code) DO UPDATE SET settings=EXCLUDED.settings,joker_count=EXCLUDED.joker_count,updated_at=now()`,[g.code,JSON.stringify(g.settings),g.settings.jokerCount??2]);
    await client.query('DELETE FROM room_players WHERE room_code=$1',[g.code]);
    for(const [seat,p] of g.players.entries()){const user=(await client.query('SELECT id FROM users WHERE id=$1',[p.id])).rows[0]?.id??null;await client.query('INSERT INTO room_players(room_code,player_id,user_id,name,avatar,seat,is_bot,connected,ready,eliminated) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[g.code,p.id,user,p.name,p.avatar,seat,!!p.bot,p.connected,p.ready,p.eliminated]);}
    await client.query('DELETE FROM bot_profiles WHERE room_code=$1',[g.code]);
    for(const p of g.players.filter(p=>p.bot))await client.query('INSERT INTO bot_profiles(room_code,player_id,name,avatar,difficulty) VALUES($1,$2,$3,$4,$5)',[g.code,p.id,p.name,p.avatar,p.bot]);
    for(const event of g.pendingEvents??[]){
      await client.query('INSERT INTO game_events(room_code,match_cycle,sequence,type,player_id,data,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[g.code,g.cycle,event.sequence,event.type,event.playerId??null,JSON.stringify(event.data),event.at]);
      if(event.type==='room_created'||event.type==='settings_changed')await client.query('INSERT INTO room_audit_log(room_code,actor_id,action,data,occurred_at) VALUES($1,$2,$3,$4,$5)',[g.code,event.playerId??null,event.type,JSON.stringify(event.data),event.at]);
    }
    for(const operationId of g.pendingOperations??[])await client.query('INSERT INTO room_operations(room_code,match_cycle,operation_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[g.code,g.cycle,operationId]);
    if((g.pendingEvents?.length??0)>0&&Math.floor((g.eventSeq??0)/25)>Math.floor(((g.eventSeq??0)-(g.pendingEvents?.length??0))/25))await client.query('INSERT INTO game_snapshots(room_code,match_cycle,sequence,state) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[g.code,g.cycle,g.eventSeq,state]);
    await client.query('COMMIT');
    g.pendingEvents=[];
    g.pendingOperations=[];
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function deleteRoom(code:string){await pool.query('DELETE FROM rooms WHERE code=$1',[code]);}
export async function purgeRoomCycle(code:string,cycle:number,actorId:string){
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('DELETE FROM game_events WHERE room_code=$1 AND match_cycle=$2',[code,cycle]);
    await client.query('DELETE FROM game_snapshots WHERE room_code=$1 AND match_cycle=$2',[code,cycle]);
    const removed=await client.query('DELETE FROM rooms WHERE code=$1 RETURNING code',[code]);
    if(!removed.rowCount)throw Error('Sala no encontrada');
    await client.query('INSERT INTO room_audit_log(room_code,actor_id,action,data) VALUES($1,$2,$3,$4)',[code,actorId,'deleted_active',JSON.stringify({cycle})]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function loadRooms():Promise<Game[]>{await pool.query("DELETE FROM rooms WHERE updated_at < now()-interval '24 hours'");return (await pool.query('SELECT state FROM rooms')).rows.map(r=>r.state as Game);}
