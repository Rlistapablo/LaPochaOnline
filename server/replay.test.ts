import {beforeEach,expect,it,vi} from 'vitest';

const {query,connect,release}=vi.hoisted(()=>({query:vi.fn(),connect:vi.fn(),release:vi.fn()}));
vi.mock('./db.js',()=>({pool:{connect}}));
import {deleteReplay} from './replay';

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
