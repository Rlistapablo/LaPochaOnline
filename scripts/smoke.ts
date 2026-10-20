import { io, Socket } from 'socket.io-client';
import {randomUUID} from 'node:crypto';
const root='http://localhost:3001';
async function post(path:string,body:object,token?:string){const r=await fetch(root+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});const x=await r.json();if(!r.ok)throw Error(JSON.stringify(x));return x;}
async function connect(token:string){return new Promise<Socket>((resolve,reject)=>{const s=io(root,{auth:{token},transports:['websocket']});s.once('connect',()=>resolve(s));s.once('connect_error',reject);});}
async function emit(s:Socket,event:string,...args:any[]):Promise<any>{return new Promise((resolve,reject)=>s.emit(event,...args,(r:any)=>r?.error?reject(Error(r.error)):resolve(r)));}
async function state(s:Socket):Promise<any>{return new Promise(resolve=>s.once('state',resolve));}
const suffix=randomUUID().slice(0,8);const a=await post('/register',{email:`smoke-a-${suffix}@example.test`,password:'password123',name:'A'}),b=await post('/register',{email:`smoke-b-${suffix}@example.test`,password:'password123',name:'B'});
const login=await post('/login',{email:`smoke-a-${suffix}@example.test`,password:'password123'});if(login.user.id!==a.user.id)throw Error('Inicio de sesión inválido');
const avatar=JSON.stringify({icon:'🦊',color:'#123456',frame:'silver'});const avatarResponse=await fetch(root+'/api/me',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${a.token}`},body:JSON.stringify({name:'A',avatar})});const avatarResult=await avatarResponse.json();if(!avatarResponse.ok||avatarResult.user?.avatar!==avatar)throw Error(`Avatar no guardado: ${JSON.stringify(avatarResult)}`);
const sa=await connect(a.token),sb=await connect(b.token);
try{
 const created=await emit(sa,'create',{name:'Smoke',private:true,maxPlayers:2,maxCards:1,lives:3,oneCard:'hidden',turnSeconds:30});const code=created.code;await emit(sb,'join',code);
 const act=async(s:Socket,type:string,version:number,value?:any)=>{const wa=state(sa),wb=state(sb);await emit(s,'action',{code,type,version,value});return Promise.all([wa,wb]);};
 let [va,vb]=await act(sa,'ready',0);[va,vb]=await act(sb,'ready',0);[va,vb]=await act(sa,'start',0);
 if(va.phase!=='bid'||vb.phase!=='bid'||va.players.find((p:any)=>p.id===a.user.id).hand[0]!==null||vb.players.find((p:any)=>p.id===b.user.id).hand[0]!==null)throw Error('Carta propia filtrada');
 if(va.players.find((p:any)=>p.id===b.user.id).hand[0]===undefined)throw Error('Carta rival no visible');
 for(let i=0;i<2;i++){const v=va.turnId===a.user.id?va:vb,s=v.turnId===a.user.id?sa:sb;[va,vb]=await act(s,'bid',v.version,v.allowedBids[0]);}
 for(let i=0;i<2;i++){const v=va.turnId===a.user.id?va:vb,s=v.turnId===a.user.id?sa:sb;const card=v.players.find((p:any)=>p.id===v.turnId).hand[0];[va,vb]=await act(s,'play',v.version,{cardId:card.id,...(card.id.startsWith('joker')?{declaredValue:'As'}:{})});}
 if(!['roundEnd','finished'].includes(va.phase)||va.players.some((p:any)=>p.lives<0))throw Error('Resultado inválido');
 if(va.phase==='roundEnd')[va,vb]=await act(sa,'advance',va.version);
 if(va.phase!=='finished'||!va.winners.length)throw Error('Partida sin ganador');
 [va,vb]=await act(sa,'rematch',va.version);
 if(va.phase!=='lobby'||va.cycle!==1)throw Error('Revancha no iniciada');
 await new Promise(resolve=>setTimeout(resolve,150));
 const profile=await fetch(root+'/api/me',{headers:{Authorization:`Bearer ${a.token}`}}).then(r=>r.json());
 if(!profile.history?.some((h:any)=>h.room_code===code))throw Error('Historial no guardado');
 console.log('Registro, dos sockets, sala privada, información oculta, partida completa, historial y revancha: correctos.');
}finally{sa.disconnect();sb.disconnect();}
