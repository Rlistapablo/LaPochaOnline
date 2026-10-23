import {Fragment,type CSSProperties} from 'react';
import type {View} from '../shared/game';
import {CardView,SuitArt} from './CardView';
import {useVisibleTrick} from './TrickHistory';
import './table-board.css';

const avatarOf=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:data.icon||'🃏';}catch{return raw||'🃏';}};

export function TableBoard({game,userId}:{game:View;userId:string}){
  const {plays,revealing}=useVisibleTrick(game);
  const seats=game.players.map(player=>player.id);
  const count=seats.length;
  const startId=game.order[0],endId=game.order.at(-1);
  const vertices=seats.map((id,index)=>{
    const angle=Math.PI/2-index*2*Math.PI/count;
    const playRadiusX=count===2?0:28,playRadiusY=count===2?14:18;
    return {id,x:50+46*Math.cos(angle),y:50+44*Math.sin(angle),seatX:50+38*Math.cos(angle),seatY:50+35*Math.sin(angle),playX:50+playRadiusX*Math.cos(angle),playY:50+playRadiusY*Math.sin(angle)};
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
      {lens?<>{seats[0]!==endId&&<path className="rotationArrow" d="M60 76 Q85 50 60 24" markerEnd="url(#pocha-turn-arrow)"/>}{seats[1]!==endId&&<path className="rotationArrow" d="M40 24 Q15 50 40 76" markerEnd="url(#pocha-turn-arrow)"/>}</>:arrows.map((arrow,index)=>seats[index]===endId&&seats[(index+1)%count]===startId?null:<line className="rotationArrow" key={index} {...arrow} markerEnd="url(#pocha-turn-arrow)"/>)}
      <defs><marker id="pocha-turn-arrow" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffe69a"/></marker></defs>
    </svg>
    <div className="tableCenter">{game.trumpSuit?<div className="tableTrumpSymbol" aria-label={`Triunfo de la ronda: ${game.trumpSuit}`}><SuitArt suit={game.trumpSuit}/></div>:<span className="feltTitle">LA POCHA</span>}</div>
    {vertices.map(vertex=>{
      const player=game.players.find(item=>item.id===vertex.id)!;
      const active=game.turnId===player.id&&['bid','play'].includes(game.phase);
      const style={'--seat-x':`${vertex.seatX}%`,'--seat-y':`${vertex.seatY}%`} as CSSProperties;
      const play=plays.find(item=>item.playerId===player.id);
      const playStyle={'--play-x':`${vertex.playX}%`,'--play-y':`${vertex.playY}%`} as CSSProperties;
      return <Fragment key={player.id}><div className={`tableSeat ${active?'isTurn':''} ${player.id===userId?'isMe':''} ${player.eliminated?'isOut':''}`} style={style} aria-label={`${player.name}. ${player.id===startId?'Comienza':player.id===endId?'Termina':player.eliminated?'Fuera de':'Continúa'} la secuencia. ${player.lives} vidas, ${player.wins} bazas ganadas, ${player.bid??'sin'} predichas.${active?' Su turno.':''}`}>
        <span className="tableSeatMarker">{player.id===startId&&<span className="tableSequenceBadge start" aria-label="Inicio de la secuencia"><span aria-hidden="true">▶</span> INICIO</span>}{player.id===endId&&<span className="tableSequenceBadge end" aria-label="Final de la secuencia"><span aria-hidden="true">■</span> FINAL</span>}</span><div className="tableSeatHead"><span className="playerAvatar">{avatarOf(player.avatar)}</span><b>{player.name}{player.id===userId?' · Tú':''}</b></div><small>❤️ {game.settings.modes?.infiniteLives?'∞':player.lives} <span>🏆 {player.wins}/{player.bid??'—'}</span></small>{active&&<strong className="tableTurnIndicator">{game.phase==='bid'?'PREDICE':'JUEGA'}</strong>}
        {player.id!==userId&&player.hand?.some(Boolean)&&<div className="opponentVisibleCards">{player.hand.map((card,cardIndex)=>card?<CardView key={card.id} card={card} small/>:<CardView key={cardIndex} card={null} hidden small/>)}</div>}
      </div>{play&&<div className={`tablePlay ${revealing&&game.lastTrick?.winnerId===player.id?'isWinningPlay':''}`} style={playStyle} aria-label={`${player.name} jugó en posición ${plays.indexOf(play)+1}`}><CardView card={play.card} small declaredValue={play.declaredValue}/></div>}</Fragment>;
    })}
  </div>;
}
