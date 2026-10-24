import {beforeEach,expect,it,vi} from 'vitest';

const {query,connect,release}=vi.hoisted(()=>({query:vi.fn(),connect:vi.fn(),release:vi.fn()}));
vi.mock('./db.js',()=>({pool:{connect,query}}));
import {deleteReplay,deleteReplays,getRematchSettings,getReplayByRoom,orderReplayPlayers} from './replay';

beforeEach(()=>{
  query.mockReset();connect.mockReset();release.mockReset();
  connect.mockResolvedValue({query,release});
  query.mockImplementation(async(sql:string)=>sql.startsWith('SELECT g.room_code')?{rows:[{room_code:'ABC123',cycle:2,participant:true}]}:{rows:[]});
});

it('borra los datos de la repetición y la oculta sin afectar al historial de resultados',async()=>{
  await deleteReplay('game-id','player-id');
  const statements=query.mock.calls.map(([sql])=>sql as string);
  expect(statements).toEqual(['BEGIN',expect.stringContaining('SELECT g.room_code'),'DELETE FROM game_events WHERE room_code=$1 AND match_cycle=$2','DELETE FROM game_snapshots WHERE room_code=$1 AND match_cycle=$2','INSERT INTO game_replays(game_id,available,event_count) VALUES($1,false,0) ON CONFLICT(game_id) DO UPDATE SET available=false,event_count=0','COMMIT']);
  expect(query.mock.calls[2][1]).toEqual(['ABC123',2]);
  expect(release).toHaveBeenCalledOnce();
});

it('impide borrar una repetición ajena',async()=>{
  query.mockImplementation(async(sql:string)=>sql.startsWith('SELECT g.room_code')?{rows:[{room_code:'ABC123',cycle:2,participant:false}]}:{rows:[]});
  await expect(deleteReplay('game-id','other-player')).rejects.toThrow('No puedes borrar esta repetición');
  expect(query.mock.calls.map(([sql])=>sql)).toEqual(['BEGIN',expect.stringContaining('SELECT g.room_code'),'ROLLBACK']);
  expect(release).toHaveBeenCalledOnce();
});

it('abre la repetición exacta de una sala y un ciclo',async()=>{
  query.mockImplementation(async(sql:string)=>{
    if(sql.startsWith('SELECT g.id FROM games'))return {rows:[{id:'game-id'}]};
    if(sql.startsWith('SELECT g.*,EXISTS'))return {rows:[{id:'game-id',room_code:'ABC123',cycle:2,participant:true,settings:{private:true}}]};
    return {rows:[]};
  });
  const result=await getReplayByRoom('ABC123',2,'player-id');
  expect(result.game.id).toBe('game-id');
  expect(query.mock.calls[0][1]).toEqual(['ABC123',2]);
  expect(query.mock.calls[1][1]).toEqual(['game-id','player-id']);
});

it('borra varias repeticiones en una sola transacción',async()=>{
  const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'];
  query.mockImplementation(async(sql:string)=>sql.startsWith('SELECT g.id,g.room_code')?{rows:[
    {id:ids[0],room_code:'ABC123',cycle:1,participant:true},
    {id:ids[1],room_code:'DEF456',cycle:2,participant:true},
  ]}:{rows:[]});
  await deleteReplays(ids,'player-id');
  expect(query.mock.calls.filter(([sql])=>String(sql).startsWith('DELETE FROM game_events'))).toHaveLength(2);
  expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
  expect(query.mock.calls[1][1]).toEqual([ids,'player-id']);
});

it('revierte el borrado conjunto si alguna repetición es ajena',async()=>{
  const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002'];
  query.mockImplementation(async(sql:string)=>sql.startsWith('SELECT g.id,g.room_code')?{rows:[
    {id:ids[0],room_code:'ABC123',cycle:1,participant:true},
    {id:ids[1],room_code:'DEF456',cycle:2,participant:false},
  ]}:{rows:[]});
  await expect(deleteReplays(ids,'player-id')).rejects.toThrow();
  expect(query.mock.calls.map(([sql])=>sql)).toEqual(['BEGIN',expect.stringContaining('SELECT g.id,g.room_code'),'ROLLBACK']);
});

it('recupera las mismas reglas para un participante de una sala privada terminada',async()=>{
  const settings={name:'Mesa',private:true,modes:{trump:true,exchangeUses:2},maxCards:5};
  query.mockResolvedValue({rows:[{settings,participant:true}]});
  await expect(getRematchSettings('ABC123',2,'player-id')).resolves.toEqual(settings);
  expect(query.mock.calls[0][1]).toEqual(['ABC123',2,'player-id']);
});

it('impide usar una sala privada ajena como origen de revancha',async()=>{
  query.mockResolvedValue({rows:[{settings:{private:true},participant:false}]});
  await expect(getRematchSettings('ABC123',2,'other-player')).rejects.toThrow('Revancha no disponible');
});

it('mantiene el orden original de los asientos en una repetición',()=>{
  const players=[{player_id:'b'},{player_id:'c'},{player_id:'a'}];
  const events=[{type:'game_started',data:{seatOrder:['a','b','c']}}];
  expect(orderReplayPlayers(players,events).map(player=>player.player_id)).toEqual(['a','b','c']);
});

it('recupera el orden de partidas antiguas a partir de la primera ronda',()=>{
  const players=[{player_id:'b'},{player_id:'c'},{player_id:'a'}];
  const events=[{type:'room_created',player_id:'a'},{type:'round_started',data:{order:['c','a','b']}}];
  expect(orderReplayPlayers(players,events).map(player=>player.player_id)).toEqual(['a','b','c']);
});
