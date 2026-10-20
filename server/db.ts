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
    await client.query(`INSERT INTO rooms(code,host_id,private,status,settings,state,version,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()) ON CONFLICT(code) DO UPDATE SET host_id=EXCLUDED.host_id,private=EXCLUDED.private,status=EXCLUDED.status,settings=EXCLUDED.settings,state=EXCLUDED.state,version=EXCLUDED.version,updated_at=now()`,[g.code,g.hostId,g.settings.private,g.phase,JSON.stringify(g.settings),JSON.stringify(g),g.version]);
    await client.query('DELETE FROM room_players WHERE room_code=$1',[g.code]);
    for(const [seat,p] of g.players.entries()){const user=(await client.query('SELECT id FROM users WHERE id=$1',[p.id])).rows[0]?.id??null;await client.query('INSERT INTO room_players(room_code,player_id,user_id,name,avatar,seat,is_bot,connected,ready,eliminated) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[g.code,p.id,user,p.name,p.avatar,seat,!!p.bot,p.connected,p.ready,p.eliminated]);}
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
export async function deleteRoom(code:string){await pool.query('DELETE FROM rooms WHERE code=$1',[code]);}
export async function loadRooms():Promise<Game[]>{await pool.query("DELETE FROM rooms WHERE updated_at < now()-interval '24 hours'");return (await pool.query('SELECT state FROM rooms')).rows.map(r=>r.state as Game);}
