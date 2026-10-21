import {useEffect,useMemo,useState} from 'react';
import {CardView,SuitArt} from './CardView';
import {SUITS} from '../shared/game';
import {apiPath} from './paths';
import {buildReplayTimeline,type ReplayData,type ReplayPlayer,type ReplayScene} from './replay-model';
import './replay.css';

type ReplayEntry={id:string;room_name:string;room_code:string;finished_at:string;won:boolean};
const request=async(path:string,method='GET')=>{
  const response=await fetch(apiPath('/replays'+path),{method,headers:{Authorization:'Bearer '+(localStorage.getItem('pocha_token')||'')}});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'Error al cargar la repetición');
  return data;
};
const avatar=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:data.icon||'🃏';}catch{return raw||'🃏';}};
const time=(raw:string)=>raw?new Date(raw).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';

function ReplayPowers({scene,id,compact=false}:{scene:ReplayScene;id:string;compact?:boolean}){
  const uses=scene.powers[id];
  if(!uses||scene.lives[id]===0||!uses.steals&&!uses.reshuffles&&!uses.exchanges)return null;
  return <div className={`replayPowerList ${compact?'compact':''}`} aria-label="Poderes disponibles">
    {uses.steals>0&&<span title="Robos disponibles" aria-label={`${uses.steals} robos disponibles`}>✋ {uses.steals}{!compact&&` ${uses.steals===1?'robo':'robos'}`}</span>}
    {uses.reshuffles>0&&<span title="Redistribuciones disponibles" aria-label={`${uses.reshuffles} redistribuciones disponibles`}>✦ {uses.reshuffles}{!compact&&` ${uses.reshuffles===1?'mezcla':'mezclas'}`}</span>}
    {uses.exchanges>0&&<span title="Cambios disponibles" aria-label={`${uses.exchanges} cambios disponibles`}>⇄ {uses.exchanges}{!compact&&` ${uses.exchanges===1?'cambio':'cambios'}`}</span>}
  </div>;
}

function ReplayPlayerCard({player,scene,focused}:{player:ReplayPlayer;scene:ReplayScene;focused:boolean}){
  const id=player.player_id,bid=scene.bids[id],won=scene.wins[id]||0,lives=scene.lives[id]??player.lives_start;
  const position=scene.order.indexOf(id)+1,progress=bid?Math.min(100,won/bid*100):won?100:0;
  const progressClass=bid===undefined||won===0?'pending':won>bid?'over':won===bid?'exact':'progress';
  return <article className={'replayPlayerCard '+(scene.nextPlayerId===id?'active ':'')+(scene.winnerId===id?'winner ':'')+(lives===0?'out':'')}>
    <div className="replayPlayerHead"><span className="playerOrder">{position?position+'.º':'—'}</span><span className="playerAvatar">{avatar(player.avatar)}</span><div><strong>{player.name}</strong><small>{player.is_bot?'Bot':'Humano'}{focused?' · perspectiva':''}</small></div>{scene.nextPlayerId===id&&<b className="replayTurnPill">TURNO</b>}</div>
    <div className="replayPlayerFacts"><span>❤️ {lives}</span><span>🎯 {bid??'—'}</span><span>🏆 {won}</span><span>🃏 {scene.hands[id]?.length??0}</span></div>
    <ReplayPowers scene={scene} id={id}/>
    <div className={'trickProgress '+progressClass} role="progressbar" aria-label={'Bazas de '+player.name+': '+won+' de '+(bid??0)} aria-valuenow={won} aria-valuemin={0} aria-valuemax={Math.max(bid??0,won,1)}><span style={{width:progress+'%'}}/></div>
    <small className="replayPlayerFoot">{bid===undefined?'Predicción pendiente':won>bid?'Predicción superada':won===bid&&won>0?'Predicción alcanzada':won+' / '+bid+' bazas'}</small>
  </article>;
}

export function ReplayBoard({replay,scenes,index,setIndex,playing,setPlaying,focusId,setFocusId,showHands,setShowHands}:{replay:ReplayData;scenes:ReplayScene[];index:number;setIndex:(n:number)=>void;playing:boolean;setPlaying:(value:boolean)=>void;focusId:string;setFocusId:(id:string)=>void;showHands:boolean;setShowHands:(value:boolean)=>void}){
  const scene=scenes[index];
  if(!scene)return <div className="panel replayEmpty">Esta partida se guardó antes de activar el registro detallado de eventos.</div>;
  const name=(id?:string)=>replay.players.find(player=>player.player_id===id)?.name||'Jugador';
  const currentRoundScenes=scenes.map((item,position)=>({item,position})).filter(entry=>entry.item.roundIndex===scene.roundIndex);
  const roundStarts=scenes.map((item,position)=>({item,position})).filter(entry=>entry.item.type==='round_started');
  const tricks=[...new Set(currentRoundScenes.filter(entry=>['card_played','trick_won'].includes(entry.item.type)).map(entry=>entry.item.trickIndex))];
  const selectedTrick=['round_started','bid'].includes(scene.type)?-1:scene.trickIndex;
  const focus=replay.players.find(player=>player.player_id===focusId)||replay.players[0];
  const trumpSuit=SUITS.find(suit=>suit===scene.trumpSuit);
  const focusHand=scene.hands[focus?.player_id]||[];
  const jump=(position:number)=>{setPlaying(false);setIndex(position);};
  const jumpTrick=(value:number)=>{
    if(value<0){jump(roundStarts.find(entry=>entry.item.roundIndex===scene.roundIndex)?.position??index);return;}
    jump(currentRoundScenes.find(entry=>entry.item.trickIndex===value&&entry.item.type==='card_played')?.position??index);
  };
  return <div className="replayStage">
    <div className="replayStageHead"><div><span className="eyebrow">REPETICIÓN · {replay.game.room_code}</span><h2>{replay.game.room_name||'Partida de La Pocha'}</h2><p>Ronda {scene.roundIndex+1} · ciclo {scene.wave+1} · {scene.cards} {scene.cards===1?'carta':'cartas'} · {time(scene.at)}</p></div><div className="replayNow"><span>{scene.type==='trick_won'?'🏆':scene.type==='card_played'?'🃏':scene.type==='bid'?'🎯':'✦'}</span><div><strong>{scene.title}</strong><small>{scene.detail}</small></div></div></div>
    <div className="replayLayout">
      <div className="replayMain">
        <div className="replayStageFacts"><span>Baza {Math.min(scene.trickIndex+1,scene.cards)} de {scene.cards}{scene.trumpSuit?' · 👑 '+scene.trumpSuit:''}</span><span>{scene.nextPlayerId?'Le toca a '+name(scene.nextPlayerId):scene.winnerId?'Ganó '+name(scene.winnerId):'Situación '+(index+1)+' de '+scenes.length}</span></div>
        <div className={`table gameFelt replayFelt ${trumpSuit?`trump-${trumpSuit.toLowerCase()}`:''}`} aria-label={`Mesa de repetición${trumpSuit?`. Triunfo: ${trumpSuit}`:''}`}>
          <div className="opponents">{replay.players.filter(player=>player.player_id!==focus?.player_id).map(player=>{
            const hand=scene.hands[player.player_id]||[];
            return <div className={'seat '+(scene.nextPlayerId===player.player_id?'turn ':'')+((scene.lives[player.player_id]??player.lives_start)===0?'out':'')} key={player.player_id}><span className="seatOrder">{scene.order.indexOf(player.player_id)+1}.º</span><span className="playerAvatar">{avatar(player.avatar)}</span><b>{player.name}</b><small>❤️ {scene.lives[player.player_id]??player.lives_start} · 🏆 {scene.wins[player.player_id]||0}/{scene.bids[player.player_id]??'—'}</small><ReplayPowers scene={scene} id={player.player_id} compact/><div className="replaySeatHand">{showHands?hand.map(card=><CardView key={card.id} card={card} small/>):<div className="replayBacks">{hand.filter(card=>scene.revealed[player.player_id]?.includes(card.id)).map(card=><CardView key={card.id} card={card} small/>)}{Array.from({length:Math.min(3,hand.filter(card=>!scene.revealed[player.player_id]?.includes(card.id)).length)},(_,n)=><CardView key={n} card={null} hidden small/>)}</div>}<span>{hand.length} {hand.length===1?'carta':'cartas'}</span></div></div>;
          })}</div>
          <div className="felt">{trumpSuit&&<div className="trumpWatermark" aria-hidden="true"><SuitArt suit={trumpSuit}/></div>}<div className="feltInner"><span className="feltTitle">LA POCHA</span><div className="played replayPlayed">{scene.table.map((play,position)=><div className={'playedCard '+(scene.winnerId===play.playerId?'replayWinningCard':'')} key={play.sequence}><span className="playOrder">{position+1}.º</span><CardView card={play.card} small declaredValue={play.declaredValue}/><span>{name(play.playerId)}</span></div>)}{!scene.table.length&&<span className="replayTableHint">{scene.type==='round_ended'?'Ronda completada':'Las cartas jugadas aparecerán aquí'}</span>}</div></div></div>
          {focus&&<div className={'mySeat '+(scene.nextPlayerId===focus.player_id?'turn':'')}><span className="seatOrder">{scene.order.indexOf(focus.player_id)+1}.º</span><span className="playerAvatar">{avatar(focus.avatar)}</span><div><b>{focus.name}</b><small>❤️ {scene.lives[focus.player_id]??focus.lives_start} · 🏆 {scene.wins[focus.player_id]||0}/{scene.bids[focus.player_id]??'—'}</small><ReplayPowers scene={scene} id={focus.player_id} compact/></div></div>}
        </div>
        {scene.reason&&<div className="replayResultBanner">🏆 {scene.reason}</div>}
        {scene.results&&<div className="replayResultGrid">{scene.results.map(result=><div key={result.id}><b>{name(result.id)}</b><span>{result.wins}/{result.bid} bazas</span><span>❤️ {result.livesBefore??'—'} → {result.lives}</span><span>−{result.lost} vidas</span></div>)}</div>}
        {scene.type==='game_finished'&&<div className="replayResultBanner">{replay.game.winners.length?'Resultado final: '+replay.game.winners.map(name).join(' y '):'Partida cancelada'}</div>}
        <div className="replayHandArea"><div><span className="eyebrow">MANO DE {focus?.name.toUpperCase()||'JUGADOR'}</span><small>{focusHand.length} {focusHand.length===1?'carta':'cartas'} en este momento</small></div><div className="hand replayHand">{focusHand.length?focusHand.map(card=><CardView key={card.id} card={card}/>):<span className="muted">Sin cartas en la mano</span>}</div></div>
        <div className="replayTransport"><button className="secondary" disabled={index===0} onClick={()=>jump(index-1)}>← Anterior</button><button className="primary" onClick={()=>{if(playing){setPlaying(false);return;}if(index===scenes.length-1)setIndex(0);setPlaying(true);}}>{playing?'Pausar':index===scenes.length-1?'↻ Repetir':'▶ Reproducir'}</button><button className="secondary" disabled={index===scenes.length-1} onClick={()=>jump(index+1)}>Siguiente →</button></div>
        <div className="replayProgress" role="progressbar" aria-label="Progreso de la repetición" aria-valuenow={index+1} aria-valuemin={1} aria-valuemax={scenes.length}><span style={{width:((index+1)/scenes.length*100)+'%'}}/></div>
        <p className="replayCounter">Situación {index+1} de {scenes.length}</p>
      </div>
      <aside className="panel replayAside"><span className="eyebrow">EXPLORAR LA PARTIDA</span><h3>Situaciones</h3><div className="replayFilters"><label>Ronda<select value={scene.roundIndex} onChange={event=>jump(roundStarts.find(entry=>entry.item.roundIndex===Number(event.target.value))?.position??0)}>{roundStarts.map(entry=><option key={entry.item.sequence} value={entry.item.roundIndex}>Ronda {entry.item.roundIndex+1} · {entry.item.cards} cartas</option>)}</select></label><label>Baza<select value={selectedTrick} onChange={event=>jumpTrick(Number(event.target.value))}><option value={-1}>Reparto y predicciones</option>{tricks.map(value=><option key={value} value={value}>Baza {value+1}</option>)}</select></label><label>Ver como<select value={focus?.player_id||''} onChange={event=>setFocusId(event.target.value)}>{replay.players.map(player=><option key={player.player_id} value={player.player_id}>{player.name}</option>)}</select></label><label className="replayReveal"><input type="checkbox" checked={showHands} onChange={event=>setShowHands(event.target.checked)}/> Mostrar todas las manos</label></div><div className="replayAsidePlayers">{replay.players.map(player=><ReplayPlayerCard key={player.player_id} player={player} scene={scene} focused={player.player_id===focus?.player_id}/>)}</div><h4>Momentos de la ronda</h4><div className="replaySceneList">{currentRoundScenes.map(({item,position})=><button className={position===index?'selected':''} key={item.sequence} onClick={()=>jump(position)} aria-current={position===index?'step':undefined}><span className="replaySceneIcon">{item.type==='round_started'?'✦':item.type==='bid'?'🎯':item.type==='card_played'?'🃏':item.type==='trick_won'?'🏆':item.type==='round_ended'?'❤️':item.type==='cards_exchanged'?'↔':item.type==='exchange_declined'||item.type==='exchange_skipped'?'✕':item.type==='card_stolen'?'✋':item.type==='hands_reshuffled'?'✦':item.type==='cards_revealed'?'👁':'★'}</span><span><strong>{item.title}</strong><small>{item.detail}</small></span><time>{time(item.at)}</time></button>)}</div></aside>
    </div>
  </div>;
}

export function ReplayLibrary(){
  const [list,setList]=useState<ReplayEntry[]>([]),[page,setPage]=useState(0),[replay,setReplay]=useState<ReplayData|null>(null),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[focusId,setFocusId]=useState(''),[showHands,setShowHands]=useState(false),[deletingId,setDeletingId]=useState(''),[error,setError]=useState('');
  const scenes=useMemo(()=>replay?buildReplayTimeline(replay):[],[replay]);
  useEffect(()=>{request('?page='+page).then(setList).catch(cause=>setError(String(cause)));},[page]);
  useEffect(()=>{if(!playing)return;if(index>=scenes.length-1){setPlaying(false);return;}const timer=setTimeout(()=>setIndex(index+1),1800);return()=>clearTimeout(timer);},[playing,index,scenes.length]);
  const open=async(id:string)=>{try{const data=await request('/'+id) as ReplayData;setReplay(data);setFocusId(data.players.find(player=>!player.is_bot)?.player_id||data.players[0]?.player_id||'');setIndex(0);setPlaying(false);setShowHands(false);setError('');}catch(cause){setError(String(cause));}};
  const remove=async(item:ReplayEntry)=>{
    if(!window.confirm('¿Borrar definitivamente la repetición de '+(item.room_name||'Sala '+item.room_code)+'? Desaparecerá también para los demás participantes. Esta acción no se puede deshacer.'))return;
    setDeletingId(item.id);setError('');
    try{await request('/'+item.id,'DELETE');const next=await request('?page='+page) as ReplayEntry[];setList(next);if(!next.length&&page>0)setPage(page-1);if(replay?.game.id===item.id){setReplay(null);setPlaying(false);}}catch(cause){setError(String(cause));}finally{setDeletingId('');}
  };
  return <section className="shell replayPage"><span className="eyebrow">ARCHIVO DE PARTIDAS</span><h1>Repetición de partida</h1>{error&&<p className="replayError">{error}</p>}{!replay?<><p>Elige una partida para volver a verla como si estuvieras en la mesa.</p><div className="replayList">{list.map(item=><article className="panel replayItem" key={item.id}><button className="replayItemOpen" onClick={()=>open(item.id)}><span className="replayArchiveIcon">🃏</span><strong>{item.room_name||'Sala '+item.room_code}</strong><span>{new Date(item.finished_at).toLocaleString('es-ES')} · {item.won?'Victoria':'Partida terminada'}</span><b>Entrar en la repetición →</b></button><button className="replayDelete" disabled={!!deletingId} onClick={()=>remove(item)} aria-label={'Borrar repetición de '+(item.room_name||'Sala '+item.room_code)}>{deletingId===item.id?'Borrando…':'Borrar repetición'}</button></article>)}{!list.length&&<p>No hay partidas terminadas en esta página.</p>}</div><div className="replayPager"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1}</span><button className="secondary" disabled={list.length<20} onClick={()=>setPage(page+1)}>Siguiente</button></div></>:<><button className="secondary replayBack" onClick={()=>{setReplay(null);setPlaying(false);}}>← Volver al archivo</button><ReplayBoard replay={replay} scenes={scenes} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} focusId={focusId} setFocusId={setFocusId} showHands={showHands} setShowHands={setShowHands}/></>}</section>;
}
