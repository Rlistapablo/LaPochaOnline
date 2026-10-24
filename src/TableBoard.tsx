import {AvatarIcon} from './SpanishSuitIcon';
import {Fragment,type CSSProperties} from 'react';
import type {View} from '../shared/game';
import {CardView,SuitArt} from './CardView';
import {TableOutline,tableLayout} from './TableOutline';
import {useVisibleTrick} from './TrickHistory';
import './table-board.css';

const avatarOf=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:<AvatarIcon icon={data.icon||'🃏'}/>;}catch{return <AvatarIcon icon={raw||'🃏'}/>;}};

export function TableBoard({game,userId}:{game:View;userId:string}){
  const {plays,revealing}=useVisibleTrick(game);
  const seats=game.players.map(player=>player.id);
  const count=seats.length;
  const startId=game.order[0],endId=game.order.at(-1);
  const layout=tableLayout(seats);
  const {vertices}=layout;
  return <div className={`table gameFelt polygonTable players-${count} ${game.trumpSuit?`trump-${game.trumpSuit.toLowerCase()}`:''}`} aria-label={`Tapete de ${count} jugadores. Sentido antihorario.${game.trumpSuit?` Triunfo: ${game.trumpSuit}.`:''}`}>
    <div className="tableSurface">
    <TableOutline layout={layout} startId={startId} endId={endId} markerId="pocha-turn-arrow"/>
    <div className="tableCenter">{game.trumpSuit?<div className="tableTrumpSymbol" aria-label={`Triunfo de la ronda: ${game.trumpSuit}`}><SuitArt suit={game.trumpSuit}/></div>:<span className="feltTitle">LA POCHA</span>}</div>
    {vertices.map(vertex=>{
      const player=game.players.find(item=>item.id===vertex.id)!;
      const active=game.turnId===player.id&&['bid','play'].includes(game.phase);
      const style={'--seat-x':`${vertex.seatX}%`,'--seat-y':`${vertex.seatY}%`} as CSSProperties;
      const play=plays.find(item=>item.playerId===player.id);
      const playStyle={'--play-x':`${vertex.playX}%`,'--play-y':`${vertex.playY}%`} as CSSProperties;
      return <Fragment key={player.id}><div className={`tableSeat seat-${vertex.zone} ${active?'isTurn':''} ${player.id===userId?'isMe':''} ${player.eliminated?'isOut':''}`} style={style} aria-label={`${player.name}. ${player.id===startId?'Comienza':player.id===endId?'Termina':player.eliminated?'Fuera de':'Continúa'} la secuencia. ${player.lives} vidas, ${player.wins} bazas ganadas, ${player.bid??'sin'} predichas.${active?' Su turno.':''}`}>
        <span className="tableSeatMarker">{player.id===startId&&<span className="tableSequenceBadge start" aria-label="Inicio de la secuencia"><span aria-hidden="true">▶</span> INICIO</span>}{player.id===endId&&<span className="tableSequenceBadge end" aria-label="Final de la secuencia"><span aria-hidden="true">■</span> FINAL</span>}</span><div className="tableSeatHead"><span className="playerAvatar">{avatarOf(player.avatar)}</span><b>{player.name}{player.id===userId?' · Tú':''}</b></div><small>❤️ {game.settings.modes?.infiniteLives?'∞':player.lives} <span>🏆 {player.wins}/{player.bid??'—'}</span></small>{active&&<strong className="tableTurnIndicator">{game.phase==='bid'?'PREDICE':'JUEGA'}</strong>}
        {player.id!==userId&&player.hand?.some(Boolean)&&<div className="opponentVisibleCards">{player.hand.map((card,cardIndex)=>card?<CardView key={card.id} card={card} small/>:<CardView key={cardIndex} card={null} hidden small/>)}</div>}
      </div>{play&&<div className={`tablePlay ${revealing&&game.lastTrick?.winnerId===player.id?'isWinningPlay':''}`} style={playStyle} aria-label={`${player.name} jugó en posición ${plays.indexOf(play)+1}`}><CardView card={play.card} small declaredValue={play.declaredValue}/></div>}</Fragment>;
    })}
    </div>
  </div>;
}
