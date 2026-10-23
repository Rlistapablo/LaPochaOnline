import {afterEach,expect,it,vi} from 'vitest';
import {pool,purgeRoomCycle} from './db.js';

afterEach(()=>vi.restoreAllMocks());

it('borra solo los eventos y snapshots del ciclo activo antes de quitar la sala',async()=>{
  const query=vi.fn().mockResolvedValue({rowCount:1});
  const release=vi.fn();
  vi.spyOn(pool,'connect').mockResolvedValue({query,release} as never);

  await purgeRoomCycle('ABC123',2,'admin-id');

  expect(query.mock.calls.map(([sql])=>sql)).toEqual([
    'BEGIN',
    'DELETE FROM game_events WHERE room_code=$1 AND match_cycle=$2',
    'DELETE FROM game_snapshots WHERE room_code=$1 AND match_cycle=$2',
    'DELETE FROM rooms WHERE code=$1 RETURNING code',
    'INSERT INTO room_audit_log(room_code,actor_id,action,data) VALUES($1,$2,$3,$4)',
    'COMMIT',
  ]);
  expect(query.mock.calls[1][1]).toEqual(['ABC123',2]);
  expect(query.mock.calls[2][1]).toEqual(['ABC123',2]);
  expect(release).toHaveBeenCalledOnce();
});

it('revierte el borrado si no existe la sala',async()=>{
  const query=vi.fn().mockImplementation(async(sql:string)=>({rowCount:sql.startsWith('DELETE FROM rooms')?0:1}));
  const release=vi.fn();
  vi.spyOn(pool,'connect').mockResolvedValue({query,release} as never);

  await expect(purgeRoomCycle('ABC123',2,'admin-id')).rejects.toThrow('Sala no encontrada');
  expect(query.mock.calls.map(([sql])=>sql).at(-1)).toBe('ROLLBACK');
  expect(release).toHaveBeenCalledOnce();
});
