import 'dotenv/config';
import {spawn,ChildProcess} from 'node:child_process';
import {io,Socket} from 'socket.io-client';

const port=39002,root=`http://127.0.0.1:${port}`;
let child:ChildProcess|undefined,socket:Socket|undefined;
async function boot(){child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:process.cwd(),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),CLIENT_ORIGIN:root,PUBLIC_APP_URL:root},stdio:'ignore'});for(let i=0;i<50;i++){if(child.exitCode!==null)throw Error('Servidor terminado');try{if((await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"Probe"}'})).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('No arrancó el servidor');}
async function stop(){if(!child)return;const ended=new Promise<void>(resolve=>child!.once('exit',()=>resolve()));child.kill();await ended;child=undefined;}
async function connect(token:string):Promise<Socket>{return new Promise((resolve,reject)=>{const s=io(root,{auth:{token},transports:['websocket']});s.once('connect',()=>resolve(s));s.once('connect_error',reject);});}
function emit(s:Socket,event:string,...args:unknown[]):Promise<any>{return new Promise(resolve=>s.emit(event,...args,resolve));}
try{
  await boot();
  const response=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"name":"Reinicio"}'});const {token,user}=await response.json();
  socket=await connect(token);
  const {code}=await emit(socket,'create',{name:'Recuperación',private:true,maxPlayers:2,maxCards:2,lives:5,penalty:'progressive',turnSeconds:120});if(!code)throw Error('Sala no creada');
  await emit(socket,'action',{code,type:'bot',value:'easy',version:0});
  await emit(socket,'action',{code,type:'ready',version:0});
  const beforeState=new Promise<any>(resolve=>socket!.once('state',resolve));
  await emit(socket,'action',{code,type:'start',version:0});
  const before=await beforeState;
  if(before.phase!=='bid'||before.players.find((p:any)=>p.id===user.id)?.hand?.length!==2)throw Error('Ronda no iniciada');
  socket.disconnect();await stop();await boot();
  socket=await connect(token);
  const afterState=new Promise<any>(resolve=>socket!.once('state',resolve));
  const joined=await emit(socket,'join',code);if(joined.error)throw Error(joined.error);
  const after=await afterState;
  if(after.phase!==before.phase||after.version!==before.version||after.turnId!==before.turnId||JSON.stringify(after.players.find((p:any)=>p.id===user.id)?.hand)!==JSON.stringify(before.players.find((p:any)=>p.id===user.id)?.hand))throw Error('Estado de partida distinto tras reinicio');
  console.log('Reinicio de Node: sala, mano, fase y turno recuperados desde PostgreSQL.');
  socket.emit('leave',code);
}finally{socket?.disconnect();await stop();}
