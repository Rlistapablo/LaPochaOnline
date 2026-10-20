import 'dotenv/config';
import {io,Socket} from 'socket.io-client';
import {pool} from '../server/db.js';

const root=process.env.SMOKE_URL||'http://localhost:3001';
async function guest(name:string){const response=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});if(!response.ok)throw Error('No se pudo crear invitado');return (await response.json()).token as string;}
async function connect(token:string):Promise<Socket>{return new Promise((resolve,reject)=>{const socket=io(root,{auth:{token},transports:['websocket']});socket.once('connect',()=>resolve(socket));socket.once('connect_error',reject);});}
function emit(s:Socket,event:string,...args:unknown[]):Promise<any>{return new Promise(resolve=>s.emit(event,...args,resolve));}
const sockets:Socket[]=[];
try{
  for(const name of ['Anfitrión','Jugador 1','Jugador 2'])sockets.push(await connect(await guest(name)));
  const [host,first,second]=sockets;
  const listingPromise=new Promise<any[]>(resolve=>host.once('rooms',resolve));
  const created=await emit(host,'create',{name:'Prueba pública',private:false,maxPlayers:2,maxCards:1,lives:5,penalty:'progressive',turnSeconds:30});if(!created.code)throw Error(`Creación: ${JSON.stringify(created)}`);
  const code=created.code as string;
  const listing=await listingPromise;
  if(!listing.some(r=>r.code===code&&r.lives===5&&r.penalty==='progressive'&&r.seats===1))throw Error('Sala pública ausente o incompleta');
  const attempts=await Promise.all([emit(first,'join',code),emit(second,'join',code)]);
  if(attempts.filter(x=>x.code===code).length!==1||attempts.filter(x=>x.error).length!==1)throw Error(`Última plaza ocupada dos veces: ${JSON.stringify(attempts)}`);
  const row=(await pool.query('SELECT state,version FROM rooms WHERE code=$1',[code])).rows[0];
  if(!row||row.state.players.length!==2||row.state.settings.penalty!=='progressive')throw Error('Sala no persistida en PostgreSQL');
  const seats=(await pool.query('SELECT count(*)::int AS count FROM room_players WHERE room_code=$1',[code])).rows[0].count;
  if(seats!==2)throw Error('Asientos no persistidos');
  const joined=attempts[0].code===code?first:second;
  const joinedId=(row.state.players as {id:string}[]).find(p=>p.id!==row.state.hostId)?.id;
  const kicked=await emit(host,'action',{code,type:'kick',value:joinedId,version:row.version});
  if(!kicked.ok)throw Error(`Expulsión: ${JSON.stringify(kicked)}`);
  const rejoin=await emit(joined,'join',code);
  if(!rejoin.error)throw Error('El expulsado pudo volver a entrar');
  const newestPromise=new Promise<any[]>(resolve=>second.once('rooms',resolve));
  const privateRoom=await emit(second,'create',{name:'Secreta',private:true,maxPlayers:2,maxCards:1,lives:3});
  const newest=await newestPromise;
  if(newest.some(r=>r.code===privateRoom.code))throw Error('Sala privada visible en búsqueda');
  console.log('Salas pública y privada, listado, última plaza concurrente, expulsión y persistencia: correctos.');
  host.emit('leave',code);first.emit('leave',code);second.emit('leave',code);second.emit('leave',privateRoom.code);
}finally{for(const socket of sockets)socket.disconnect();await pool.end();}
