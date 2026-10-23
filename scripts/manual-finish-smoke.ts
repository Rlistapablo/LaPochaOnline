import 'dotenv/config';
import {io,Socket} from 'socket.io-client';
import {pool} from '../server/db.js';

const root=process.env.SMOKE_URL||'http://localhost:3001';
async function guest(name:string){const response=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!response.ok)throw Error('No se pudo crear invitado');return response.json();}
async function connect(token:string):Promise<Socket>{return new Promise((resolve,reject)=>{const socket=io(root,{auth:{token},transports:['websocket']});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);});}
const emit=(socket:Socket,event:string,...args:unknown[])=>new Promise<any>(resolve=>socket.emit(event,...args,resolve));
const host=await guest('Anfitrión'),other=await guest('Participante'),a=await connect(host.token),b=await connect(other.token);
let stateA:any,stateB:any;a.on('state',state=>stateA=state);b.on('state',state=>stateB=state);
try{
  const created=await emit(a,'create',{name:'Cierre manual',private:false,maxPlayers:2,maxCards:3,lives:3});const code=created.code;if(!code)throw Error('Sala no creada');
  await emit(b,'join',code);
  await emit(a,'action',{code,type:'ready',version:stateA.version});
  await emit(b,'action',{code,type:'ready',version:stateB.version});
  await emit(a,'action',{code,type:'start',version:stateA.version});
  const rejected=await emit(b,'action',{code,type:'finish',version:stateB.version});if(!rejected.error)throw Error('Un participante terminó la partida');
  const closedA=new Promise<any>(resolve=>a.once('room_closed',resolve)),closedB=new Promise<any>(resolve=>b.once('room_closed',resolve));
  const finished=await emit(a,'action',{code,type:'finish',version:stateA.version});for(let i=0;i<20&&stateB.phase!=='finished';i++)await new Promise(resolve=>setTimeout(resolve,50));if(!finished.ok||stateA.phase!=='finished'||stateB.phase!=='finished'||stateA.endReason!=='manual'||stateA.autoRestartAt)throw Error(`El cierre manual no llegó a ambos jugadores: ${JSON.stringify({finished,phaseA:stateA.phase,phaseB:stateB.phase,reason:stateA.endReason,autoRestartAt:stateA.autoRestartAt})}`);
  if(!(await closedA).finished||!(await closedB).finished||(await pool.query('SELECT 1 FROM rooms WHERE code=$1',[code])).rowCount)throw Error('La sala terminada no se eliminó');
  const match=(await pool.query('SELECT competitive,result FROM matches WHERE room_code=$1 ORDER BY created_at DESC LIMIT 1',[code])).rows[0];
  if(!match||match.competitive||match.result.endReason!=='manual'||match.result.history.length!==0)throw Error('Resultado manual mal guardado');
  const botsRoom=(await emit(a,'create',{name:'Cierre con bots',private:true,maxPlayers:3,maxCards:5,lives:3})).code;
  await emit(a,'action',{code:botsRoom,type:'bot',value:'hard',version:stateA.version});
  await emit(a,'action',{code:botsRoom,type:'bot',value:'normal',version:stateA.version});
  await emit(a,'action',{code:botsRoom,type:'ready',version:stateA.version});
  await emit(a,'action',{code:botsRoom,type:'start',version:stateA.version});
  const beforeBidVersion=stateA.version;
  const previousBotBids=stateA.players.filter((p:any)=>p.bot).map((p:any)=>p.bid);
  const pendingBid=emit(a,'action',{code:botsRoom,type:'bid',value:0,version:beforeBidVersion});
  await new Promise(resolve=>setTimeout(resolve,100));
  const closedBots=new Promise<any>(resolve=>a.once('room_closed',resolve));
  const pendingFinish=emit(a,'action',{code:botsRoom,type:'finish',version:beforeBidVersion+1});
  const [bidResult,finishResult]=await Promise.all([pendingBid,pendingFinish]);
  if(!bidResult.ok||!finishResult.ok||stateA.phase!=='finished'||JSON.stringify(stateA.players.filter((p:any)=>p.bot).map((p:any)=>p.bid))!==JSON.stringify(previousBotBids))throw Error('El cierre no interrumpió los turnos pendientes de bots');
  if(!(await closedBots).finished||(await pool.query('SELECT 1 FROM rooms WHERE code=$1',[botsRoom])).rowCount)throw Error('La sala con bots no se eliminó');
  console.log('Cierre manual: solo anfitrión, resultado y repetición guardados, salas eliminadas e interrupción de bots correctos.');
}finally{a.disconnect();b.disconnect();await pool.end();}
