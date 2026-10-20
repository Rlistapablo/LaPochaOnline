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
try{
  const {code}=await emit(a,'create',{name:'Reinicio al eliminar',private:true,maxPlayers:2,maxCards:5,lives:3,oneCard:'visible',turnSeconds:30});
  await emit(b,'join',code);
  await emit(a,'action',{code,type:'ready',version:va.version});
  await emit(b,'action',{code,type:'ready',version:vb.version});
  await emit(a,'action',{code,type:'start',version:va.version});
  for(let i=0;i<2;i++){const actor=va.turnId===ua.user.id?a:b;await emit(actor,'action',{code,type:'bid',value:0,version:va.version});}
  for(let i=0;i<10;i++){
    const actor=va.turnId===ua.user.id?a:b,view=actor===a?va:vb,id=actor===a?ua.user.id:ub.user.id;
    const card=view.players.find((p:any)=>p.id===id).hand[0];
    await emit(actor,'action',{code,type:'play',value:{cardId:card.id,...(card.id.startsWith('joker')?{declaredValue:'2'}:{})},version:view.version});
  }
  if(va.phase!=='finished'||!va.autoRestartAt||!va.players.some((p:any)=>p.eliminated))throw Error('La eliminación no programó el reinicio');
  const saved=await pool.query('SELECT id FROM games WHERE room_code=$1 AND cycle=0',[code]);
  if(saved.rowCount!==1)throw Error('El ciclo terminado no se guardó antes del reinicio');
  for(let i=0;i<120&&va.cycle===0;i++)await new Promise(resolve=>setTimeout(resolve,100));
  if(va.cycle!==1||va.phase!=='bid'||!va.players.every((p:any)=>p.lives===3&&!p.eliminated))throw Error('La partida no se reinició con las vidas restauradas');
  console.log('Eliminación con dos navegadores: resultado visible y nuevo ciclo automático con vidas restauradas.');
  a.emit('leave',code);b.emit('leave',code);
}finally{a.disconnect();b.disconnect();await pool.end();}
