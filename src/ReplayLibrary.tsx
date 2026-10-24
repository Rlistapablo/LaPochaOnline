import {AvatarIcon} from './SpanishSuitIcon';
import {Fragment,useEffect,useMemo,useState,type CSSProperties} from 'react';
import {CardView,SuitArt} from './CardView';
import {TableOutline,tableLayout} from './TableOutline';
import {SUITS} from '../shared/game';
import {apiPath} from './paths';
import {readApiResponse} from './api-response';
import {buildReplayTimeline,type ReplayData,type ReplayPlayer,type ReplayScene} from './replay-model';
import './table-board.css';
import './replay.css';

type ReplayEntry={id:string;room_name:string;room_code:string;finished_at:string;won:boolean};
const request=async(path:string,method='GET',body?:unknown)=>{
  const response=await fetch(apiPath('/replays'+path),{method,headers:{Authorization:'Bearer '+(localStorage.getItem('pocha_token')||''),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return readApiResponse(response);
};
const avatar=(raw:string)=>{try{const data=JSON.parse(raw);return data.image?<img src={data.image} alt=""/>:<AvatarIcon icon={data.icon||'🃏'}/>;}catch{return <AvatarIcon icon={raw||'🃏'}/>;}};
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

function ReplayTable({replay,scene,focusId,showHands}:{replay:ReplayData;scene:ReplayScene;focusId:string;showHands:boolean}){
  const count=replay.players.length;
  const layout=tableLayout(replay.players.map(player=>player.player_id));
  const {vertices}=layout;
  const startId=scene.order[0],endId=scene.order.at(-1);
  const trumpSuit=SUITS.find(suit=>suit===scene.trumpSuit);
  return <div className={`table gameFelt polygonTable replayFelt players-${count} ${trumpSuit?`trump-${trumpSuit.toLowerCase()}`:''}`} aria-label={`Mesa de repetición de ${count} jugadores. Sentido antihorario.${trumpSuit?` Triunfo: ${trumpSuit}.`:''}`}>
    <TableOutline layout={layout} startId={startId} endId={endId} markerId="pocha-replay-turn-arrow"/>
    <div className="tableCenter">{trumpSuit?<div className="tableTrumpSymbol replayTrumpSymbol" aria-label={`Triunfo de la ronda: ${trumpSuit}`}><SuitArt suit={trumpSuit}/></div>:<span className="feltTitle">LA POCHA</span>}</div>
    {vertices.map(vertex=>{
      const id=vertex.id,player=replay.players.find(item=>item.player_id===id)!,hand=scene.hands[id]||[];
      const play=scene.table.find(item=>item.playerId===id);
      const visibleCards=showHands?hand:hand.filter(card=>scene.revealed[id]?.includes(card.id));
      const hiddenCount=showHands?0:Math.min(3,hand.length-visibleCards.length);
      const seatStyle={'--seat-x':`${vertex.seatX}%`,'--seat-y':`${vertex.seatY}%`} as CSSProperties;
      const playStyle={'--play-x':`${vertex.playX}%`,'--play-y':`${vertex.playY}%`} as CSSProperties;
      const active=scene.nextPlayerId===id;
      return <Fragment key={id}><div className={`tableSeat ${active?'isTurn':''} ${id===focusId?'isMe':''} ${(scene.lives[id]??player.lives_start)===0?'isOut':''}`} style={seatStyle} aria-label={`${player.name}. ${id===startId?'Comienza':id===endId?'Termina':'Continúa'} la secuencia. ${scene.lives[id]??player.lives_start} vidas, ${scene.wins[id]||0} bazas ganadas, ${scene.bids[id]??'sin'} predichas.${active?' Su turno.':''}`}>
        <span className="tableSeatMarker">{id===startId&&<span className="tableSequenceBadge start" aria-label="Inicio de la secuencia"><span aria-hidden="true">▶</span> INICIO</span>}{id===endId&&<span className="tableSequenceBadge end" aria-label="Final de la secuencia"><span aria-hidden="true">■</span> FINAL</span>}</span>
        <div className="tableSeatHead"><span className="playerAvatar">{avatar(player.avatar)}</span><b>{player.name}{id===focusId?' · Tú':''}</b></div>
        <small>❤️ {scene.lives[id]??player.lives_start} <span>🏆 {scene.wins[id]||0}/{scene.bids[id]??'—'}</span></small>
        <ReplayPowers scene={scene} id={id} compact/>
        {active&&<strong className="tableTurnIndicator">{scene.type==='bid'?'PREDICE':'JUEGA'}</strong>}
        {id!==focusId&&hand.length>0&&<div className="opponentVisibleCards replaySeatCards">{visibleCards.map(card=><CardView key={card.id} card={card} small/>)}{Array.from({length:hiddenCount},(_,index)=><CardView key={index} card={null} hidden small/>)}</div>}
      </div>{play&&<div className={`tablePlay ${scene.winnerId===id?'isWinningPlay':''}`} style={playStyle} aria-label={`${player.name} jugó en posición ${scene.table.indexOf(play)+1}`}><CardView card={play.card} small declaredValue={play.declaredValue}/></div>}</Fragment>;
    })}
  </div>;
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
        <ReplayTable replay={replay} scene={scene} focusId={focus?.player_id||''} showHands={showHands}/>
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

export function ReplayLibrary({initialRoom}:{initialRoom?:{code:string;cycle:number}|null}){
  const [list,setList]=useState<ReplayEntry[]>([]);
  const [listLoaded,setListLoaded]=useState(false);
  const [page,setPage]=useState(0);
  const [replay,setReplay]=useState<ReplayData|null>(null);
  const [index,setIndex]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [focusId,setFocusId]=useState('');
  const [showHands,setShowHands]=useState(false);
  const [deletingId,setDeletingId]=useState('');
  const [selecting,setSelecting]=useState(false);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [openingRoom,setOpeningRoom]=useState(!!initialRoom);
  const scenes=useMemo(()=>replay?buildReplayTimeline(replay):[],[replay]);
  const loadList=async()=>{
    try{
      const next=await request('?page='+page) as ReplayEntry[];
      setList(next);setListLoaded(true);setError('');
    }catch(cause){setListLoaded(false);setError(String(cause));}
  };
  useEffect(()=>{void loadList();},[page]);
  useEffect(()=>{
    if(!initialRoom)return;
    let cancelled=false;
    setOpeningRoom(true);
    request('/by-room/'+encodeURIComponent(initialRoom.code)+'/'+initialRoom.cycle).then((data:ReplayData)=>{
      if(cancelled)return;
      setReplay(data);
      setFocusId(data.players.find(player=>!player.is_bot)?.player_id||data.players[0]?.player_id||'');
      setIndex(0);setPlaying(false);setShowHands(false);setError('');
    }).catch(cause=>{if(!cancelled)setError(String(cause));}).finally(()=>{if(!cancelled)setOpeningRoom(false);});
    return()=>{cancelled=true;};
  },[initialRoom?.code,initialRoom?.cycle]);
  useEffect(()=>{
    if(!playing)return;
    if(index>=scenes.length-1){setPlaying(false);return;}
    const timer=setTimeout(()=>setIndex(index+1),1800);
    return()=>clearTimeout(timer);
  },[playing,index,scenes.length]);
  const open=async(id:string)=>{
    try{
      const data=await request('/'+id) as ReplayData;
      setReplay(data);
      setFocusId(data.players.find(player=>!player.is_bot)?.player_id||data.players[0]?.player_id||'');
      setIndex(0);setPlaying(false);setShowHands(false);setError('');
    }catch(cause){setError(String(cause));}
  };
  const refreshAfterDelete=async()=>{
    const next=await request('?page='+page) as ReplayEntry[];
    setList(next);
    if(!next.length&&page>0)setPage(page-1);
  };
  const remove=async(item:ReplayEntry)=>{
    setDeletingId(item.id);setError('');
    try{
      await request('/'+item.id,'DELETE');
      await refreshAfterDelete();
      setSelectedIds(ids=>ids.filter(id=>id!==item.id));
      if(replay?.game.id===item.id){setReplay(null);setPlaying(false);}
    }catch(cause){setError(String(cause));}finally{setDeletingId('');}
  };
  const removeSelected=async()=>{
    if(!selectedIds.length)return;
    setDeletingId('bulk');setError('');
    try{
      await request('','DELETE',{ids:selectedIds});
      await refreshAfterDelete();
      setSelectedIds([]);setSelecting(false);
    }catch(cause){setError(String(cause));}finally{setDeletingId('');}
  };
  const toggleSelection=(id:string)=>setSelectedIds(ids=>ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]);
  const currentIds=list.map(item=>item.id);
  const allCurrentSelected=!!currentIds.length&&currentIds.every(id=>selectedIds.includes(id));
  const toggleCurrentPage=()=>setSelectedIds(ids=>allCurrentSelected?ids.filter(id=>!currentIds.includes(id)):[...new Set([...ids,...currentIds])]);
  if(openingRoom&&!replay)return <section className="shell replayPage"><h1>Abriendo repetición…</h1></section>;
  return <section className="shell replayPage">
    <span className="eyebrow">ARCHIVO DE PARTIDAS</span>
    <h1>Repetición de partida</h1>
    {error&&<div className="replayError" role="alert"><p>{error}</p><button className="secondary" onClick={()=>void loadList()}>Reintentar</button></div>}
    {!replay?<>
      <p>Elige una partida para volver a verla como si estuvieras en la mesa.</p>
      {listLoaded&&!!list.length&&<div className="replaySelectionBar">
        <button className="secondary" type="button" disabled={!!deletingId} onClick={()=>{setSelecting(value=>!value);setSelectedIds([]);}}>{selecting?'Cancelar selección':'Seleccionar varias'}</button>
        {selecting&&<>
          <label className="replaySelectAll"><input type="checkbox" checked={allCurrentSelected} onChange={toggleCurrentPage} disabled={!!deletingId}/> Seleccionar página</label>
          <span aria-live="polite">{selectedIds.length} seleccionadas</span>
          <button className="replayDelete replayBulkDelete" type="button" disabled={!selectedIds.length||!!deletingId} onClick={()=>void removeSelected()}>{deletingId==='bulk'?'Borrando…':`Borrar ${selectedIds.length} repeticiones`}</button>
        </>}
      </div>}
      <div className="replayList">{list.map(item=><article className={`panel replayItem ${selectedIds.includes(item.id)?'is-selected':''}`} key={item.id}>
        {selecting&&<label className="replaySelectItem"><input type="checkbox" checked={selectedIds.includes(item.id)} disabled={!!deletingId} onChange={()=>toggleSelection(item.id)}/><span>Seleccionar repetición de {item.room_name||'Sala '+item.room_code}</span></label>}
        <button className="replayItemOpen" onClick={()=>selecting?toggleSelection(item.id):open(item.id)} disabled={!!deletingId} aria-label={selecting?'Seleccionar '+(item.room_name||'Sala '+item.room_code):undefined}>
          <span className="replayArchiveIcon"><SuitArt suit="Oros"/></span>
          <strong>{item.room_name||'Sala '+item.room_code}</strong>
          <span>{new Date(item.finished_at).toLocaleString('es-ES')} · {item.won?'Victoria':'Partida terminada'}</span>
          <b>{selecting?'Seleccionar partida':'Entrar en la repetición →'}</b>
        </button>
        {!selecting&&<button className="replayDelete" disabled={!!deletingId} onClick={()=>void remove(item)} aria-label={'Borrar repetición de '+(item.room_name||'Sala '+item.room_code)}>{deletingId===item.id?'Borrando…':'Borrar repetición'}</button>}
      </article>)}{listLoaded&&!list.length&&<p>No hay partidas terminadas en esta página.</p>}</div>
      <div className="replayPager"><button className="secondary" disabled={page===0||!!deletingId} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page+1}</span><button className="secondary" disabled={list.length<20||!!deletingId} onClick={()=>setPage(page+1)}>Siguiente</button></div>
    </>:<><button className="secondary replayBack" onClick={()=>{setReplay(null);setPlaying(false);}}>← Volver al archivo</button><ReplayBoard replay={replay} scenes={scenes} index={index} setIndex={setIndex} playing={playing} setPlaying={setPlaying} focusId={focusId} setFocusId={setFocusId} showHands={showHands} setShowHands={setShowHands}/></>}
  </section>;
}
