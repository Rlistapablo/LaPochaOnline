import {useEffect,useState} from 'react';
import {apiPath} from './paths';

type Room={code:string;name:string;host:string;players:number;status:string};
const headers=()=>({Authorization:`Bearer ${localStorage.getItem('pocha_token')||''}`});

export function AdminPanel(){
  const [rooms,setRooms]=useState<Room[]>([]),[error,setError]=useState('');
  const refresh=async()=>{try{const response=await fetch(apiPath('/admin/rooms'),{headers:headers()});const data=await response.json();if(!response.ok)throw Error(data.error);setRooms(data);setError('');}catch(e){setError(String(e));}};
  useEffect(()=>{void refresh();},[]);
  const remove=async(room:Room)=>{if(!window.confirm(`¿Cerrar la mesa pública ${room.name}? ${room.status==='lobby'?'Se expulsará a sus participantes.':'La partida se cancelará y conservará el historial.'}`))return;try{const response=await fetch(apiPath(`/admin/rooms/${room.code}`),{method:'DELETE',headers:headers()});const data=await response.json();if(!response.ok)throw Error(data.error);await refresh();}catch(e){setError(String(e));}};
  return <section className="shell narrow"><div className="panel"><span className="eyebrow">MODERACIÓN</span><h1>Mesas públicas</h1>{error&&<p className="replayError">{error}</p>}{rooms.map(room=><div className="roomRow" key={room.code}><span><b>{room.name}</b><small>{room.code} · {room.host} · {room.players} jugadores · {room.status}</small></span><button className="finishButton" onClick={()=>remove(room)}>Eliminar mesa</button></div>)}{!rooms.length&&!error&&<p>No hay mesas públicas.</p>}</div></section>;
}
