import {expect,it} from 'vitest';
import {issueToken,readToken} from './session.js';

const secret='a'.repeat(32);

it('mantiene pequeño el token registrado aunque el avatar sea una imagen grande',()=>{
  const token=issueToken({id:'player-1',guest:false,name:'Jugador',avatar:'data:image/png;base64,'+'A'.repeat(180000)},secret);
  expect(token.length).toBeLessThan(500);
  expect(readToken('Bearer '+token,secret)).toEqual({id:'player-1',guest:false,name:'',avatar:'🃏'});
});

it('conserva el nombre e icono de los invitados en su token',()=>{
  const token=issueToken({id:'guest-1',guest:true,name:'Invitado',avatar:'🃏'},secret);
  expect(readToken(token,secret)).toEqual({id:'guest-1',guest:true,name:'Invitado',avatar:'🃏'});
});
