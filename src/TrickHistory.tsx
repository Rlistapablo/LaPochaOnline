import {useEffect,useState} from 'react';
import type {View,Play,TrickRecord} from '../shared/game';
import {CardView} from './CardView';
import './trick-history.css';

const playerName=(game:View,id:string)=>game.players.find(p=>p.id===id)?.name||'Jugador';

export function TableCards({game}:{game:View}){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{
    setNow(Date.now());
    if(!game.revealUntil)return;
    const remaining=game.revealUntil-Date.now();
    if(remaining<=0)return;
    const timer=setTimeout(()=>setNow(Date.now()),remaining+30);
    return()=>clearTimeout(timer);
  },[game.revealUntil]);
  const revealing=!game.table.length&&!!game.lastTrick&&!!game.revealUntil&&now<game.revealUntil;
  const plays:Play[]=revealing?game.lastTrick!.plays:game.table;
  return <><div className={`played ${revealing?'revealing':''}`} aria-live="polite">{plays.map((play,i)=><div className={`playedCard ${revealing&&play.playerId===game.lastTrick?.winnerId?'winningCard':''}`} key={`${play.card.id}-${i}`}><span className="playOrder">{i+1}.º</span><CardView card={play.card} small declaredValue={play.declaredValue}/><span>{playerName(game,play.playerId)}</span></div>)}</div>{revealing&&<div className="trickWinner">Baza {game.tricks.length} · {game.lastTrick?.reason||`gana ${playerName(game,game.lastTrick!.winnerId)}`}</div>}{!revealing&&!game.table.length&&game.lastTrick&&<div className="lastTrick">Última baza: {playerName(game,game.lastTrick.winnerId)}</div>}</>;
}

export function TrickHistory({game}:{game:View}){
  if(game.phase!=='finished')return null;
  const rounds=[...game.history];
  if(game.tricks.length&&!rounds.some(r=>r.roundIndex===game.round-1))rounds.push({round:game.cardsPerPlayer,roundIndex:game.round-1,result:[],tricks:game.tricks,hands:undefined});
  if(!rounds.length)return null;
  const latest=rounds.at(-1)?.roundIndex;
  return <section className="shell trickHistory" aria-label="Cartas jugadas por ronda"><div className="panel"><span className="eyebrow">REGISTRO DE LA PARTIDA</span><h2>Cartas jugadas, en orden</h2><p>Abre cualquier ronda para repasar cada baza y el orden exacto de las cartas.</p><div className="roundHistory">{rounds.map(round=><details key={`${game.cycle}-${round.roundIndex}`} className="roundHistoryItem" ref={element=>{if(element&&!element.dataset.initialized){element.open=round.roundIndex===latest;element.dataset.initialized="true";}}}><summary>Ronda {round.roundIndex+1} · {round.round} {round.round===1?'carta':'cartas'} <span>{round.tricks.length} {round.tricks.length===1?'baza':'bazas'}</span></summary><div className="tricksList">{round.tricks.map((trick:TrickRecord,index)=><div className="trickEntry" key={index}><div className="trickHeading"><b>Baza {index+1}</b><span>Ganó {playerName(game,trick.winnerId)}</span></div><div className="trickPlays">{trick.plays.map((play,order)=><div className={`trickPlay ${play.playerId===trick.winnerId?'winningPlay':''}`} key={`${play.card.id}-${order}`}><span className="playOrder">{order+1}ª</span><CardView card={play.card} small declaredValue={play.declaredValue}/><span>{playerName(game,play.playerId)}</span></div>)}</div></div>)}</div></details>)}</div></div></section>;
}
