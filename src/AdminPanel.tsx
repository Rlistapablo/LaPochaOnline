import {useEffect,useState} from 'react';
import {apiPath} from './paths';
import './admin.css';

type Room={code:string;name:string;host:string;players:number;status:string};
type ActiveGame={code:string;name:string;private:boolean;phase:'bid'|'play'|'roundEnd';round:number;cards:number;completedTricks:number;host:string;turn:string|null;startedAt?:string;players:Array<{name:string;bot:boolean;lives:number;bid?:number;wins:number}>};
const headers=()=>({Authorization:`Bearer ${localStorage.getItem('pocha_token')||''}`});
async function request(path:string,method='GET'){
  const response=await fetch(apiPath(path),{method,headers:headers()});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Error al cargar moderación');
  return data;
}

export function AdminPanel(){
  const [rooms,setRooms]=useState<Room[]>([]),[games,setGames]=useState<ActiveGame[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
  const refresh=async()=>{try{const [nextGames,nextRooms]=await Promise.all([request('/admin/games'),request('/admin/rooms')]);setGames(nextGames);setRooms(nextRooms);setError('');}catch(e){setError(String(e));}};
  useEffect(()=>{void refresh();const timer=setInterval(()=>{void refresh();},5000);return()=>clearInterval(timer);},[]);
  const finish=async(game:ActiveGame)=>{
    if(!window.confirm(`¿Terminar la partida ${game.name} para todos? La ronda incompleta no contará. Se guardarán el resultado y la repetición.`))return;
    setBusy(game.code);setError('');
    try{await request(`/admin/games/${game.code}/finish`,'POST');await refresh();}catch(e){setError(String(e));}finally{setBusy('');}
  };
  const remove=async(room:Room)=>{
    if(!window.confirm(`¿Cerrar la mesa pública ${room.name}? ${room.status==='lobby'?'Se expulsará a sus participantes.':'La partida se cancelará y conservará el historial.'}`))return;
    setBusy(room.code);setError('');
    try{await request(`/admin/rooms/${room.code}`,'DELETE');await refresh();}catch(e){setError(String(e));}finally{setBusy('');}
  };
  return <section className="shell adminPage"><div className="adminHeading"><div><span className="eyebrow">MODERACIÓN</span><h1>Partidas en curso</h1><p>Consulta las mesas activas y termina una partida cuando sea necesario.</p></div><button className="secondary" onClick={()=>void refresh()}>Actualizar ↻</button></div>{error&&<p className="replayError" role="alert">{error}</p>}
    <div className="adminGameGrid">{games.map(game=><article className="panel adminGame" key={game.code}><div className="adminGameTop"><span className="eyebrow">SALA {game.code} · {game.private?'PRIVADA':'PÚBLICA'}</span><span className={'adminPhase '+game.phase}>{game.phase==='bid'?'Predicciones':game.phase==='play'?'Jugando':'Fin de ronda'}</span></div><h2>{game.name}</h2><p>Anfitrión: <strong>{game.host}</strong>{game.startedAt?' · Empezó '+new Date(game.startedAt).toLocaleString('es-ES'):''}</p><div className="adminGameFacts"><span>Ronda <b>{game.round}</b></span><span>Cartas <b>{game.cards}</b></span><span>Bazas <b>{game.completedTricks}/{game.cards}</b></span><span>Jugadores <b>{game.players.length}</b></span></div><p className="adminTurn">{game.turn?'Turno de '+game.turn:'Esperando la siguiente ronda'}</p><div className="adminPlayers">{game.players.map((player,index)=><div key={index}><span>{player.name}{player.bot?' · Bot':''}</span><small>❤️ {player.lives} · 🏆 {player.wins}/{player.bid??'—'}</small></div>)}</div><button className="finishButton" disabled={!!busy} onClick={()=>void finish(game)}>{busy===game.code?'Terminando…':'Terminar partida'}</button></article>)}{!games.length&&!error&&<div className="panel adminEmpty">No hay partidas en curso.</div>}</div>
    <div className="panel adminPublic"><div className="adminSectionHead"><div><span className="eyebrow">GESTIÓN DE MESAS</span><h2>Mesas públicas</h2></div><span className="count">{rooms.length}</span></div>{rooms.map(room=><div className="roomRow" key={room.code}><span><b>{room.name}</b><small>{room.code} · {room.host} · {room.players} jugadores · {room.status}</small></span><button className="finishButton" disabled={!!busy} onClick={()=>void remove(room)}>Eliminar mesa</button></div>)}{!rooms.length&&!error&&<p>No hay mesas públicas.</p>}</div>
  </section>;
}
