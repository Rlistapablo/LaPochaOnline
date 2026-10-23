import {io} from 'socket.io-client';

const root=process.env.SMOKE_URL||'http://localhost:3001';
const guest=await fetch(root+'/api/guest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Ritmo'})}).then(r=>r.json());
const socket=io(root,{auth:{token:guest.token},transports:['websocket']});
const states:{state:any;at:number}[]=[];
socket.on('state',state=>states.push({state,at:Date.now()}));
const connected=new Promise<void>((resolve,reject)=>{socket.once('connect',()=>resolve());socket.once('connect_error',reject);});
const emit=(event:string,...args:unknown[])=>new Promise<any>((resolve,reject)=>socket.emit(event,...args,(result:any)=>result?.error?reject(Error(result.error)):resolve(result)));
async function waitFor(predicate:(state:any)=>boolean,from=0){for(let i=0;i<100;i++){const match=states.slice(from).find(x=>predicate(x.state));if(match)return match;await new Promise(r=>setTimeout(r,50));}throw Error('No llegó el estado esperado');}
try{
  await connected;
  const {code}=await emit('create',{name:'Ritmo de cartas',private:true,maxPlayers:2,maxCards:1,lives:5,oneCard:'visible',turnSeconds:30});
  await emit('action',{code,type:'bot',value:'easy',version:0});
  await emit('action',{code,type:'ready',version:0});
  await emit('action',{code,type:'start',version:0});
  const started=await waitFor(s=>s.phase==='bid'&&s.turnId===guest.user.id);
  const bidIndex=states.length;
  await emit('action',{code,type:'bid',value:started.state.allowedBids[0],version:started.state.version});
  const playing=await waitFor(s=>s.phase==='play'&&s.turnId===guest.user.id,bidIndex);
  const card=playing.state.players.find((p:any)=>p.id===guest.user.id).hand[0];
  const botLed=playing.state.table.length===1;
  const botLeadStart=states.slice(bidIndex).find(x=>x.state.phase==='play'&&x.state.table.length===0);
  const botFirst=botLed?states.slice(bidIndex).find(x=>x.state.phase==='play'&&x.state.table.length===1):undefined;
  const playIndex=states.length;
  await emit('action',{code,type:'play',value:{cardId:card.id,...(card.id.startsWith('joker')?{declaredValue:'As'}:{})},version:playing.state.version});
  const first=botLed?botFirst:await waitFor(s=>s.table.length===1,playIndex);
  const completed=await waitFor(s=>s.lastTrick&&s.tricks.length===1,playIndex);
  if(!first||(botLed?(!botLeadStart||first.at-botLeadStart.at<900):completed.at-first.at<900))throw Error('La carta del bot apareció demasiado rápido');
  if(completed.state.revealUntil-completed.at<2400)throw Error('La baza no permanece visible');
  const expectedFirst=botLed?completed.state.players.find((p:any)=>p.bot)?.id:guest.user.id;
  if(completed.state.tricks[0].plays.length!==2||completed.state.tricks[0].plays[0].playerId!==expectedFirst)throw Error('Orden de cartas incorrecto');
  console.log('Cartas de bots espaciadas, baza visible y orden de jugadas correctos.');
  socket.emit('leave',code);
}finally{socket.disconnect();}
