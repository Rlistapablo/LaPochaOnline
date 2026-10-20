import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {io,type Socket} from 'socket.io-client';
import {pool} from '../server/db.js';

const root=process.env.SMOKE_URL||'http://localhost:3001';
async function guest(name:string){const response=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!response.ok)throw Error('No se pudo crear invitado');return response.json();}
async function connect(token:string):Promise<Socket>{return new Promise((resolve,reject)=>{const socket=io(root,{auth:{token},transports:['websocket']});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);});}
function emit(socket:Socket,event:string,...args:unknown[]):Promise<any>{return new Promise(resolve=>socket.emit(event,...args,resolve));}
async function api(token:string,path:string){const response=await fetch(root+'/api'+path,{headers:{Authorization:`Bearer ${token}`}});const result=await response.json();if(!response.ok)throw Error(result.error);return result;}
async function waitUntil(check:()=>boolean){for(let i=0;i<120;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Estado no sincronizado');}

const host=await guest('Prueba avanzada A'),other=await guest('Prueba avanzada B');
const a=await connect(host.token),b=await connect(other.token);
let va:any,vb:any;a.on('state',state=>va=state);b.on('state',state=>vb=state);
async function action(socket:Socket,code:string,type:string,value?:unknown,operationId=randomUUID()){
  const before=va.version;
  const result=await emit(socket,'action',{code,type,value,version:before,operationId});
  if(result.error)throw Error(`${type}: ${result.error}`);
  await waitUntil(()=>va.version>before&&vb.version>before);
  return operationId;
}

try{
  const publicRoom=(await emit(a,'create',{name:'Mesa pública de prueba',private:false,maxPlayers:3,maxCards:2,jokerCount:4,lives:5})).code;
  await emit(b,'join',publicRoom);await waitUntil(()=>va?.code===publicRoom&&vb?.code===publicRoom);
  await action(a,publicRoom,'bot','normal');
  const bot=va.players.find((player:any)=>player.bot);
  await action(a,publicRoom,'bot_profile',{id:bot.id,name:'El Maestro',avatar:'👑',difficulty:'hard'});
  const savedBot=await pool.query('SELECT name,avatar,difficulty FROM bot_profiles WHERE room_code=$1 AND player_id=$2',[publicRoom,bot.id]);
  if(savedBot.rows[0]?.name!=='El Maestro'||savedBot.rows[0]?.avatar!=='👑'||savedBot.rows[0]?.difficulty!=='hard')throw Error('Perfil del bot no persistido');
  const forbidden=await emit(b,'delete_room',publicRoom);
  if(!forbidden.error)throw Error('Un invitado eliminó una mesa ajena');
  const closedA=new Promise(resolve=>a.once('room_closed',resolve)),closedB=new Promise(resolve=>b.once('room_closed',resolve));
  const removed=await emit(a,'delete_room',publicRoom);
  if(!removed.ok)throw Error('No se eliminó la mesa pública');await Promise.all([closedA,closedB]);
  if((await pool.query('SELECT 1 FROM rooms WHERE code=$1',[publicRoom])).rowCount)throw Error('La mesa eliminada sigue en PostgreSQL');
  if(!(await pool.query("SELECT 1 FROM room_audit_log WHERE room_code=$1 AND action='deleted'",[publicRoom])).rowCount)throw Error('Falta auditoría del cierre');

  const code=(await emit(a,'create',{name:'Repetición avanzada',private:true,maxPlayers:2,maxCards:1,jokerCount:4,lives:3,oneCard:'visible'})).code;
  await emit(b,'join',code);await waitUntil(()=>va?.code===code&&vb?.code===code);
  const readyId=await action(a,code,'ready');
  const repeated=await emit(a,'action',{code,type:'ready',version:va.version,operationId:readyId});
  if(!repeated.ok||!va.players.find((player:any)=>player.id===host.user.id)?.ready)throw Error('Operación duplicada alteró el estado');
  await action(b,code,'ready');await action(a,code,'start');
  if(va.settings.jokerCount!==4||va.schedule[0]!==1)throw Error('Configuración de comodines perdida');
  for(let i=0;i<2;i++){const actor=va.turnId===host.user.id?a:b,state=actor===a?va:vb;await action(actor,code,'bid',state.allowedBids[0]);}
  for(let i=0;i<2;i++){const actor=va.turnId===host.user.id?a:b,state=actor===a?va:vb,id=actor===a?host.user.id:other.user.id,card=state.players.find((player:any)=>player.id===id).hand[0];await action(actor,code,'play',{cardId:card.id,...(card.id.startsWith('joker')?{declaredValue:'As'}:{})});}
  if(va.phase!=='roundEnd'||va.tricks[0].plays.length!==2)throw Error('Baza no terminada');
  await action(a,code,'finish');
  const gameRow=(await pool.query('SELECT id FROM games WHERE room_code=$1 AND cycle=0',[code])).rows[0];
  if(!gameRow)throw Error('Partida no guardada');
  const replay=await api(host.token,`/replays/${gameRow.id}`);
  if(replay.events.filter((event:any)=>event.type==='card_played').length!==2||!replay.events.find((event:any)=>event.type==='round_started')?.data.hands)throw Error('La repetición no reconstruye el reparto y las jugadas');
  const intruder=await guest('Intruso');
  const forbiddenReplay=await fetch(root+`/api/replays/${gameRow.id}`,{headers:{Authorization:`Bearer ${intruder.token}`}});
  if(forbiddenReplay.ok)throw Error('Se reveló una partida privada ajena');
  if(!(await pool.query('SELECT 1 FROM game_replays WHERE game_id=$1',[gameRow.id])).rowCount)throw Error('Metadatos de repetición no guardados');
  if(!(await api(host.token,'/replays')).some((entry:any)=>entry.id===gameRow.id))throw Error('La partida no aparece en el archivo');

  const cancelCode=(await emit(a,'create',{name:'Cierre en curso',private:false,maxPlayers:2,maxCards:1,lives:3})).code;
  await emit(b,'join',cancelCode);await waitUntil(()=>va?.code===cancelCode&&vb?.code===cancelCode);
  await action(a,cancelCode,'ready');await action(b,cancelCode,'ready');await action(a,cancelCode,'start');
  const cancelled=await emit(a,'delete_room',cancelCode);
  if(!cancelled.ok)throw Error('No se cerró la partida pública en curso');
  const cancelRow=(await pool.query('SELECT result FROM matches WHERE room_code=$1',[cancelCode])).rows[0];
  if(cancelRow?.result?.endReason!=='cancelled')throw Error('No se conservó la cancelación en el historial');
  console.log('Mesas, permisos, bot personalizado, comodines, idempotencia, repetición y cancelación: correctos.');
}finally{a.disconnect();b.disconnect();await pool.end();}
