import {io,Socket} from 'socket.io-client';
import 'dotenv/config';
import {pool} from '../server/db.js';

const root=process.env.SMOKE_URL||'http://localhost:3001';
async function guest(name:string){const response=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!response.ok)throw Error('No se pudo crear el invitado');return response.json();}
async function connect(token:string):Promise<Socket>{return new Promise((resolve,reject)=>{const socket=io(root,{auth:{token},transports:['websocket']});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);});}
function emit(socket:Socket,event:string,...args:unknown[]):Promise<any>{return new Promise((resolve,reject)=>socket.emit(event,...args,(result:any)=>result?.error?reject(Error(result.error)):resolve(result)));}
const ua=await guest('Reinicio A'),ub=await guest('Reinicio B');
const a=await connect(ua.token),b=await connect(ub.token);
let va:any,vb:any;a.on('state',state=>va=state);b.on('state',state=>vb=state);
async function action(socket:Socket,code:string,type:string,value?:unknown){
  const before=va.version;
  await emit(socket,'action',{code,type,value,version:before});
  for(let i=0;i<100&&(va.version<=before||vb.version<=before);i++)await new Promise(resolve=>setTimeout(resolve,20));
  if(va.version<=before||vb.version<=before)throw Error(`Estados no sincronizados tras ${type}`);
}
try{
  const {code}=await emit(a,'create',{name:'Reinicio al agotar vidas',private:true,maxPlayers:2,maxCards:3,lives:3,oneCard:'visible',turnSeconds:30});
  await emit(b,'join',code);
  await emit(a,'action',{code,type:'ready',version:va.version});
  await emit(b,'action',{code,type:'ready',version:vb.version});
  await emit(a,'action',{code,type:'start',version:va.version});
  const calendar=[3,2,1,2,3];
  if(JSON.stringify(va.schedule)!==JSON.stringify(calendar))throw Error('Calendario incorrecto');
  for(const [index,cards] of calendar.entries()){
    if(va.cardsPerPlayer!==cards)throw Error(`Reparto incorrecto en la ronda ${index+1}`);
    for(let i=0;i<2;i++){const actor=va.turnId===ua.user.id?a:b;await action(actor,code,'bid',0);}
    for(let i=0;i<cards*2;i++){
      const actor=va.turnId===ua.user.id?a:b,state=actor===a?va:vb,id=actor===a?ua.user.id:ub.user.id;
      const card=state.players.find((p:any)=>p.id===id).hand[0];
      await action(actor,code,'play',{cardId:card.id,...(card.id.startsWith('joker')?{declaredValue:'2'}:{})});
    }
    if(va.phase==='finished')break;
    if(va.phase!=='roundEnd'||va.players.some((p:any)=>p.lives===0))throw Error('No se terminó la partida al agotar las vidas');
    if(index===1)throw Error('La partida siguió pese a las vidas agotadas');
    await action(a,code,'advance');
  }
  if(va.phase!=='finished'||va.autoRestartAt||!va.players.some((p:any)=>p.eliminated)||va.history.length>=calendar.length)throw Error('La partida debe terminar al agotarse las vidas');
  const saved=await pool.query('SELECT id FROM games WHERE room_code=$1 AND cycle=0',[code]);
  if(saved.rowCount!==1)throw Error('El ciclo terminado no se guardó antes de borrar la sala');
  if((await pool.query('SELECT 1 FROM rooms WHERE code=$1',[code])).rowCount)throw Error('La sala terminada sigue guardada');
  await emit(a,'action',{code,type:'rematch',version:va.version}).then(()=>{throw Error('Se permitió una revancha en una sala borrada');},error=>{if(!String(error).includes('Sala no encontrada'))throw error;});
  console.log('Dos navegadores: al agotarse las vidas, se guarda el resultado y se borra la sala.');
}finally{a.disconnect();b.disconnect();await pool.end();}
