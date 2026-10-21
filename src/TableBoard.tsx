import type {CSSProperties} from 'react';
import type {View} from '../shared/game';
import {CardView,SuitArt} from './CardView';
import {TableCards} from './TrickHistory';
import './table-board.css';

const avatarOf=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:data.icon||'🃏';}catch{return raw||'🃏';}};

export function TableBoard({game,userId}:{game:View;userId:string}){
  const order=game.order.filter(id=>game.players.some(player=>player.id===id));
  const count=order.length;
  const vertices=order.map((id,index)=>{
    const angle=Math.PI/2-index*2*Math.PI/count;
    return {id,x:50+46*Math.cos(angle),y:50+44*Math.sin(angle),seatX:50+38*Math.cos(angle),seatY:50+35*Math.sin(angle)};
  });
  const points=vertices.map(vertex=>`${vertex.x},${vertex.y}`).join(' ');
  const lens=count===2;
  const arrows=vertices.map((vertex,index)=>{
    const next=vertices[(index+1)%count];
    const startX=50+(vertex.x-50)*.88,startY=50+(vertex.y-50)*.88;
    const endX=50+(next.x-50)*.88,endY=50+(next.y-50)*.88;
    return {x1:startX+(endX-startX)*.24,y1:startY+(endY-startY)*.24,x2:startX+(endX-startX)*.72,y2:startY+(endY-startY)*.72};
  });
  return <div className={`table gameFelt polygonTable players-${count} ${game.trumpSuit?`trump-${game.trumpSuit.toLowerCase()}`:''}`} aria-label={`Tapete de ${count} jugadores. Sentido antihorario.${game.trumpSuit?` Triunfo: ${game.trumpSuit}.`:''}`}>
    <svg className="tableOutline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {lens?<path className="tableRim" d="M50 6 Q100 50 50 94 Q0 50 50 6 Z"/>:<polygon className="tableRim" points={points}/>}
      {lens?<><path className="rotationArrow" d="M60 76 Q85 50 60 24" markerEnd="url(#pocha-turn-arrow)"/><path className="rotationArrow" d="M40 24 Q15 50 40 76" markerEnd="url(#pocha-turn-arrow)"/></>:arrows.map((arrow,index)=><line className="rotationArrow" key={index} {...arrow} markerEnd="url(#pocha-turn-arrow)"/>)}
      <defs><marker id="pocha-turn-arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 Z" fill="currentColor"/></marker></defs>
    </svg>
    <div className="tableCenter"><span className="tableDirection">↶ SENTIDO ANTIHORARIO</span>{game.trumpSuit&&<div className="tableTrump" aria-label={`Triunfo de la ronda: ${game.trumpSuit}`}><SuitArt suit={game.trumpSuit}/><span><small>TRIUNFO · GANA ESTE PALO</small><strong>{game.trumpSuit}</strong></span></div>}<div className="feltInner"><span className="feltTitle">LA POCHA</span><TableCards game={game}/></div></div>
    {vertices.map((vertex,index)=>{
      const player=game.players.find(item=>item.id===vertex.id)!;
      const active=game.turnId===player.id&&['bid','play'].includes(game.phase);
      const style={'--seat-x':`${vertex.seatX}%`,'--seat-y':`${vertex.seatY}%`} as CSSProperties;
      return <div className={`tableSeat ${active?'isTurn':''} ${player.id===userId?'isMe':''} ${player.eliminated?'isOut':''}`} style={style} key={player.id} aria-label={`${player.name}. ${index===0?'Comienza':index===count-1?'Termina':'Jugador'} la secuencia. ${player.lives} vidas, ${player.wins} bazas ganadas, ${player.bid??'sin'} predichas.${active?' Su turno.':''}`}>
        <span className="tableSeatMarker">{index===0?'INICIO':index===count-1?'FINAL':null}</span><div className="tableSeatHead"><span className="playerAvatar">{avatarOf(player.avatar)}</span><b>{player.name}{player.id===userId?' · Tú':''}</b></div><small>❤️ {game.settings.modes?.infiniteLives?'∞':player.lives} <span>🏆 {player.wins}/{player.bid??'—'}</span></small>{active&&<strong className="tableTurnIndicator">{game.phase==='bid'?'PREDICE':'JUEGA'}</strong>}
        {player.id!==userId&&player.hand?.some(Boolean)&&<div className="opponentVisibleCards">{player.hand.map((card,cardIndex)=>card?<CardView key={card.id} card={card} small/>:<CardView key={cardIndex} card={null} hidden small/>)}</div>}
      </div>;
    })}
  </div>;
}
