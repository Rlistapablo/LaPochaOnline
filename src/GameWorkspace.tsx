import {useEffect,useState} from 'react';
import type {Card,Value,View,TrickRecord} from '../shared/game';
import {VALUES} from '../shared/game';
import {CardView} from './CardView';
import {TableCards} from './TrickHistory';
import {RoundProgress} from './RoundProgress';
import './game-workspace.css';

type PlayerView=View['players'][number];
type Tab='players'|'history'|'round';
const nameOf=(game:View,id:string)=>game.players.find(p=>p.id===id)?.name||'Jugador';
const avatarOf=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:data.icon||'🃏';}catch{return raw||'🃏';}};

function PlayerCard({game,player,position}:{game:View;player:PlayerView;position:number}){
  const active=game.turnId===player.id&&['bid','play'].includes(game.phase);
  const wonLast=game.lastTrick?.winnerId===player.id&&!!game.revealUntil&&Date.now()<game.revealUntil;
  const state=player.bid===undefined?'pending':player.wins>player.bid?'over':player.wins===player.bid&&player.wins>0?'exact':player.wins>0?'progress':'pending';
  const progress=player.bid?Math.min(100,player.wins/player.bid*100):player.wins?100:0;
  return <article className={`playerInfo ${active?'active':''} ${wonLast?'wonLast':''} ${player.eliminated?'eliminated':''}`} aria-label={`${player.name}, ${position||'sin'} turno, ${player.lives} vidas, ${player.wins} bazas ganadas`}>
    <div className="playerInfoHead"><span className="playerOrder">{position?`${position}.º`:'—'}</span><span className="playerAvatar">{avatarOf(player.avatar)}</span><div className="playerIdentity"><strong>{player.name}</strong><small>{player.bot?`Bot · ${player.bot==='hard'?'difícil':player.bot==='normal'?'normal':'fácil'}`:'Humano'} · {player.connected||player.bot?'En línea':'Desconectado'}</small></div>{active&&<b className="activeTurn">{game.phase==='bid'?'PREDICE':'JUEGA'}</b>}</div>
    <div className="playerStats"><span>❤️ <b>{player.lives}</b> vidas</span><span>🎯 <b>{player.bid??'—'}</b> predicción</span><span>🏆 <b>{player.wins}</b> ganadas</span></div>
    <div className={`trickProgress ${state}`} role="progressbar" aria-label={`Bazas de ${player.name}: ${player.wins} de ${player.bid??0}`} aria-valuenow={player.wins} aria-valuemin={0} aria-valuemax={Math.max(player.bid??0,player.wins,1)}><span style={{width:`${progress}%`}}/></div>
    <div className="playerInfoFoot"><span>{player.bid===undefined?'Pendiente de predecir':player.wins>player.bid?'Ha superado su predicción':player.wins===player.bid&&player.wins>0?'Predicción alcanzada':`${player.wins} / ${player.bid} bazas`}</span><span>{player.handCount} cartas · racha {player.missStreak} · ×{game.settings.penalty==='progressive'?player.missStreak+1:1}</span></div>
  </article>;
}

function HistoryTab({game}:{game:View}){
  const rounds=[...game.history];
  if(game.tricks.length&&!rounds.some(r=>r.roundIndex===game.round-1))rounds.push({round:game.cardsPerPlayer,roundIndex:game.round-1,result:[],tricks:game.tricks,hands:undefined});
  if(!rounds.length)return <p className="muted">Aún no se ha completado ninguna baza.</p>;
  return <div className="gameHistory">{rounds.toReversed().map(round=><details key={round.roundIndex}><summary>Ronda {round.roundIndex+1} · {round.round} {round.round===1?'carta':'cartas'} · {round.tricks.length} bazas</summary>{round.tricks.map((trick:TrickRecord,index)=><div className="historyTrick" key={index}><b>Baza {index+1} · {nameOf(game,trick.winnerId)}</b><div className="historyPlays">{trick.plays.map((played,order)=><div className={played.playerId===trick.winnerId?'winningPlay':''} key={played.card.id}><span>{order+1}.º {nameOf(game,played.playerId)}</span><CardView card={played.card} small declaredValue={played.declaredValue}/></div>)}</div>{trick.reason&&<small>{trick.reason}</small>}</div>)}</details>)}</div>;
}

function RoundTab({game}:{game:View}){
  return <div className="roundInfo"><p><b>Ronda global {game.round}</b> · ciclo {game.wave+1} · {game.cardsPerPlayer} {game.cardsPerPlayer===1?'carta':'cartas'} por jugador.</p><p>Baza {Math.min(game.trickNumber,game.cardsPerPlayer)} de {game.cardsPerPlayer}. {game.tricks.length} completadas.</p><p>Orden actual: {game.order.map(id=>nameOf(game,id)).join(' → ')}.</p><p>Baraja: {40+(game.settings.jokerCount??2)} cartas, incluidos {game.settings.jokerCount??2} comodines.</p>{game.roundResult&&<div className="roundResults">{game.roundResult.map(r=><div key={r.id}>{r.name}: {r.wins}/{r.bid} bazas · {r.livesBefore??'—'} → {r.lives} vidas</div>)}</div>}</div>;
}

function Countdown({until}:{until:number}){const [seconds,setSeconds]=useState(0);useEffect(()=>{const update=()=>setSeconds(Math.max(0,Math.ceil((until-Date.now())/1000)));update();const timer=setInterval(update,250);return()=>clearInterval(timer);},[until]);return <p className="autoRestartNotice">Nueva partida en <strong>{seconds}</strong> s.</p>;}

export function GameWorkspace({game,userId,action}:{game:View;userId:string;action:(type:string,value?:unknown)=>void}){
  const [tab,setTab]=useState<Tab>('players'),[drawer,setDrawer]=useState(false),[selected,setSelected]=useState<string|null>(null),[jokerValue,setJokerValue]=useState<Value|undefined>();
  const me=game.players.find(p=>p.id===userId),myTurn=game.turnId===userId,selectedCard=me?.hand?.find((card):card is Card=>!!card&&card.id===selected),turnName=nameOf(game,game.turnId||'');
  useEffect(()=>{setSelected(null);setJokerValue(undefined);},[game.round,game.phase]);
  const confirmPlay=()=>{if(!selectedCard||!myTurn||game.phase!=='play'||selectedCard.id.startsWith('joker')&&!jokerValue)return;action('play',{cardId:selectedCard.id,...(jokerValue?{declaredValue:jokerValue}:{})});setSelected(null);setJokerValue(undefined);};
  const currentOrder=game.order.map((id,index)=>({id,position:index+1}));
  const panel=<><div className="gameTabs" role="tablist" aria-label="Información de partida">{([['players','Jugadores'],['history','Historial'],['round','Ronda']] as const).map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} className={tab===id?'selected':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div><div className="gameTabContent">{tab==='players'?<div className="playerList">{game.players.map(p=><PlayerCard key={p.id} game={game} player={p} position={currentOrder.find(x=>x.id===p.id)?.position||0}/>)}</div>:tab==='history'?<HistoryTab game={game}/>:<RoundTab game={game}/>}</div></>;
  return <div className="gameWorkspace">
    <div className="mobileGameTop"><span>Ronda {game.round} · baza {Math.min(game.trickNumber,game.cardsPerPlayer)}</span><span>❤️ {me?.lives??0} · 🏆 {me?.wins??0}/{me?.bid??'—'}</span><button onClick={()=>setDrawer(true)}>Información ☰</button></div>
    <div className="gameStatus"><div><span className="eyebrow">RONDA {game.round} · CICLO {game.wave+1}</span><h2>{game.phase==='bid'?'Predicciones':game.phase==='play'?`Baza ${Math.min(game.trickNumber,game.cardsPerPlayer)} de ${game.cardsPerPlayer}`:game.phase==='roundEnd'?'Fin de ronda':'Partida terminada'}</h2></div><div className="gameTurnMessage">{game.phase==='bid'?`Predicción ${game.turnPosition} de ${game.order.length} · le toca a ${turnName}`:game.phase==='play'?`Jugada ${game.table.length+1} de ${game.order.length} · le toca a ${turnName}`:game.phase==='roundEnd'?'Prepara la siguiente ronda':'Resultado final'}</div></div>
    <div className="gameLayout"><div className="gameMain"><RoundProgress round={game.roundStep} schedule={game.schedule} finished={game.phase==='finished'}/><div className="table gameFelt"><div className="opponents">{game.players.filter(p=>p.id!==userId&&!p.eliminated).map(p=><div className={`seat ${game.turnId===p.id?'turn':''}`} key={p.id}><span className="seatOrder">{currentOrder.find(x=>x.id===p.id)?.position}.º</span><span className="playerAvatar">{avatarOf(p.avatar)}</span><b>{p.name}</b><small>❤️ {p.lives} · 🏆 {p.wins}/{p.bid??'—'}</small>{game.phase==='bid'&&game.cardsPerPlayer===1&&p.hand?.[0]&&<CardView card={p.hand[0]} small/>}</div>)}</div><div className="felt"><div className="feltInner"><span className="feltTitle">LA POCHA</span><TableCards game={game}/></div></div><div className={`mySeat ${myTurn?'turn':''}`}><span className="seatOrder">{currentOrder.find(x=>x.id===userId)?.position??'—'}.º</span><span className="playerAvatar">{avatarOf(me?.avatar||'🃏')}</span><div><b>{me?.name}</b><small>❤️ {me?.lives??0} · 🏆 {me?.wins??0}/{me?.bid??'—'}</small></div>{myTurn&&<span className="turnPill">TU TURNO</span>}</div></div>
      {game.phase==='bid'&&<div className="actionPanel panel"><h2>{myTurn?'¿Cuántas bazas ganarás?':`Predice ${turnName}`}</h2><p>La última predicción no puede igualar la suma al número de cartas.</p>{myTurn&&<div className="bidOptions">{Array.from({length:game.cardsPerPlayer+1},(_,n)=><button disabled={!game.allowedBids.includes(n)} key={n} onClick={()=>action('bid',n)}>{n}</button>)}</div>}</div>}
      {(game.phase==='bid'||game.phase==='play')&&me&&!me.eliminated&&<div className="handArea"><p>{game.phase==='bid'?'Tus cartas para predecir':myTurn?'Selecciona una carta y confirma la jugada':`Esperando a ${turnName}`}</p><div className="hand">{me.hand?.map((card,index)=><div key={card?.id??index} className={`handChoice ${selected===card?.id?'selected':''}`}><CardView card={card} hidden={!card} onClick={game.phase==='play'&&myTurn&&card?()=>{setSelected(card.id);setJokerValue(undefined);}:undefined}/></div>)}</div>{game.phase==='play'&&myTurn&&selectedCard&&<div className="playConfirm">{selectedCard.id.startsWith('joker')&&<div className="jokerInline"><span>Valor del comodín:</span>{VALUES.map(value=><button className={jokerValue===value?'selected':''} key={value} onClick={()=>setJokerValue(value)}>{value}</button>)}</div>}<button className="secondary" onClick={()=>{setSelected(null);setJokerValue(undefined);}}>Cancelar</button><button className="primary" disabled={selectedCard.id.startsWith('joker')&&!jokerValue} onClick={confirmPlay}>Jugar carta</button></div>}</div>}
      {(game.phase==='roundEnd'||game.phase==='finished')&&<div className="panel result"><h2>{game.phase==='finished'?'Partida terminada':'Resultado de la ronda'}</h2>{game.phase==='finished'&&<p className="winner">{game.endReason==='cancelled'?'Partida cancelada':game.winners.length>1?`Empate: ${game.players.filter(p=>game.winners.includes(p.id)).map(p=>p.name).join(' y ')}`:`🏆 ${nameOf(game,game.winners[0])}`}</p>}{game.endReason==='manual'&&<p>El anfitrión terminó la partida. La ronda incompleta no cuenta.</p>}{game.autoRestartAt&&<Countdown until={game.autoRestartAt}/>}<div className="results">{game.roundResult?.map(r=><div key={r.id}><b>{r.name}</b><span>{r.wins}/{r.bid} bazas</span><span>−{r.lost} ❤️</span><strong>{r.lives} ❤️</strong></div>)}</div>{game.phase==='roundEnd'&&<button className="primary" onClick={()=>action('advance')}>Siguiente ronda →</button>}</div>}
    </div><aside className="gameSidebar panel">{panel}</aside></div>
    {drawer&&<div className="drawerBackdrop" onClick={()=>setDrawer(false)}><aside className="gameDrawer panel" onClick={event=>event.stopPropagation()}><div className="drawerHeading"><strong>Información de partida</strong><button onClick={()=>setDrawer(false)} aria-label="Cerrar información">×</button></div>{panel}</aside></div>}
  </div>;
}
