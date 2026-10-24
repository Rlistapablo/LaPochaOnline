import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {addPlayer,bid,createGame,start,view,type Settings} from '../shared/game';
import {GameWorkspace} from './GameWorkspace';
import {TrickHistory} from './TrickHistory';
import {CardView} from './CardView';
import {TableBoard} from './TableBoard';
import {tableLayout} from './TableOutline';

it('muestra una partida pública al espectador sin controles de juego ni manos privadas',()=>{
  const settings:Settings={name:'Pública',private:false,maxPlayers:2,maxCards:2,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('WATCH',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🃏',connected:true});start(game);
  const html=renderToStaticMarkup(<GameWorkspace game={view(game)} userId="spectator" action={()=>{}}/>);
  expect(html).toContain('gameWorkspace');
  expect(html).not.toContain('Escoger predicción');
  expect(view(game).players.every(player=>player.hand===undefined)).toBe(true);
});

it('mantiene los asientos al rotar el inicio y el final de la secuencia',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:3,maxCards:2,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🃏',connected:true});
  addPlayer(game,{id:'c',name:'Cora',avatar:'🃏',connected:true});
  start(game);
  game.phase='bid';
  game.firstIndex=0;
  const first=renderToStaticMarkup(<TableBoard game={view(game,'a')} userId="a"/>);
  game.firstIndex=1;
  const second=renderToStaticMarkup(<TableBoard game={view(game,'a')} userId="a"/>);
  const seat=(markup:string,name:string)=>markup.match(new RegExp(`<div class="tableSeat[^"]*" style="([^"]+)" aria-label="${name}\\.`))?.[1];
  for(const name of ['Ana','Berta','Cora'])expect(seat(second,name)).toBe(seat(first,name));
  expect(first).toMatch(/aria-label="Ana\. Comienza[^>]+><span class="tableSeatMarker"><span class="tableSequenceBadge start"/);
  expect(second).toMatch(/aria-label="Berta\. Comienza[^>]+><span class="tableSeatMarker"><span class="tableSequenceBadge start"/);
  expect(second).toMatch(/aria-label="Ana\. Termina[^>]+><span class="tableSeatMarker"><span class="tableSequenceBadge end"/);
  expect((first.match(/class="rotationArrow"/g)||[])).toHaveLength(4);
  expect(first).toContain('class="tableOuterRim"');
  expect(first).toContain('viewBox="0 0 100 150" preserveAspectRatio="none"');
  expect(first).toMatch(/class="tableOuterRim" d="M50 3 A47 47 [^"]* L97 100 [^"]* L3 50/);
  expect(first).toContain('viewBox="0 0 150 100" preserveAspectRatio="none"');
  expect((second.match(/class="rotationArrow"/g)||[])).toHaveLength(4);
});

it('reparte entre dos y ocho jugadores por el contorno vertical y pone las cartas delante',()=>{
  for(let count=2;count<=8;count++){
    const ids=Array.from({length:count},(_,index)=>String(index));
    const {vertices}=tableLayout(ids);
    expect(vertices.map(vertex=>vertex.id)).toEqual(ids);
    for(const vertex of vertices){
      expect(vertex.seatX).toBeGreaterThanOrEqual(0);
      expect(vertex.seatX).toBeLessThanOrEqual(100);
      expect(vertex.seatY).toBeGreaterThanOrEqual(0);
      expect(vertex.seatY).toBeLessThanOrEqual(100);
      expect(Math.hypot(vertex.playX-50,(vertex.playY-50)*1.5)).toBeLessThan(Math.hypot(vertex.seatX-50,(vertex.seatY-50)*1.5));
      expect(vertex.desktopSeatX).toBeGreaterThanOrEqual(0);
      expect(vertex.desktopSeatX).toBeLessThanOrEqual(100);
      expect(vertex.desktopSeatY).toBeGreaterThanOrEqual(0);
      expect(vertex.desktopSeatY).toBeLessThanOrEqual(100);
      expect(Math.hypot((vertex.desktopPlayX-50)*1.5,vertex.desktopPlayY-50)).toBeLessThan(Math.hypot((vertex.desktopSeatX-50)*1.5,vertex.desktopSeatY-50));
    }
    expect(vertices[0].seatX).toBeCloseTo(50);
    expect(vertices[0].desktopSeatX).toBeCloseTo(50);
    expect(vertices[0].desktopSeatY).toBeGreaterThan(80);
    expect(vertices[0].seatY).toBeGreaterThan(80);
    if(count%2===0){expect(vertices[count/2].seatX).toBeCloseTo(50);expect(vertices[count/2].seatY).toBeLessThan(20);}
    if(count===4){expect(vertices[1].seatX).toBeGreaterThan(80);expect(vertices[3].seatX).toBeLessThan(20);}
  }
});

it('ofrece revancha a los participantes tras cerrar la sala',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:1,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🃏',connected:true});
  start(game);
  game.phase='finished';game.winners=['a'];game.players[1].lives=0;game.players[1].eliminated=true;
  const html=renderToStaticMarkup(<GameWorkspace game={view(game,'a')} userId="a" action={()=>{}} onReplay={()=>{}} onRematch={()=>{}}/>);
  expect(html).toContain('aria-label="Resultado final"');
  expect(html).toContain('Clasificación final');
  expect(html).toContain('Ver repetición');
  expect(html).toContain('Revancha');
  expect(html).toContain('La sala se ha cerrado');
  expect(html).not.toContain('Nueva partida');
  expect(html).toContain('Ganador');
  const guest=renderToStaticMarkup(<GameWorkspace game={view(game,'b')} userId="b" action={()=>{}} onReplay={()=>{}} onRematch={()=>{}}/>);
  expect(guest).toContain('La sala se ha cerrado');
  expect(guest).toContain('Revancha');
  const spectator=renderToStaticMarkup(<GameWorkspace game={view(game)} userId="spectator" action={()=>{}} onReplay={()=>{}} onRematch={()=>{}}/>);
  expect(spectator).not.toContain('Revancha');
});

it('muestra las predicciones ajenas dentro del modal de apuesta',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:2,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🃏',connected:true});
  start(game);
  const first=game.players[game.turnIndex].id;
  bid(game,first,0,game.version);
  const next=game.players[game.turnIndex].id;
  const html=renderToStaticMarkup(<GameWorkspace game={view(game,next)} userId={next} action={()=>{}}/>);
  expect((html.match(/class="rotationArrow"/g)||[])).toHaveLength(2);
  expect(html).toContain('bidPopupPredictions');
  expect(html).toContain('0 bazas');
  expect(html).toContain('Pendiente');
  expect(html).toContain('aria-label="Escoger predicción"');
});

it('muestra orden, turno y progreso de bazas con datos del servidor',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:2,jokerCount:2,lives:5,penalty:'progressive',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🤖',connected:true,bot:'hard'});
  start(game);
  while(game.phase==='bid')bid(game,game.players[game.turnIndex].id,0,game.version);
  game.players[0].steals=2;
  game.players[0].reshuffles=1;
  const markup=renderToStaticMarkup(<GameWorkspace game={view(game,'a')} userId="a" action={()=>{}}/>);
  expect(markup).toContain('Baza 1 de 2');
  expect(markup).toContain('role="progressbar"');
  expect(markup).toContain('1.º');
  expect(markup).toContain('2.º');
  expect(markup).toContain('Bot · difícil');
  expect(markup).toContain('Información');
  expect(markup).toContain('Abrir habilidades especiales, 3 disponibles');
  expect(markup).not.toContain('class="panel specialActions"');
});

it('reserva las cartas de bazas anteriores para cuando termine la partida',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:1,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🃏',connected:true});
  start(game);
  game.history=[{round:1,roundIndex:0,result:[],tricks:[{winnerId:'a',plays:[{playerId:'a',card:{id:'old-card',suit:'Oros',value:'As'}}]}]}];
  expect(renderToStaticMarkup(<TrickHistory game={view(game,'a')}/>)).toBe('');
  game.phase='finished';
  expect(renderToStaticMarkup(<TrickHistory game={view(game,'a')}/>)).toContain('Cartas jugadas, en orden');
});

it('muestra los valores numéricos de las figuras y mantiene su dibujo',()=>{
  for(const [value,number] of [['Sota','10'],['Caballo','11'],['Rey','12']] as const){
    const html=renderToStaticMarkup(<CardView card={{id:value,suit:'Espadas',value}}/>);
    expect(html).toContain(`<strong>${number}</strong>`);
    expect(html).toContain(`data-figure="${value}"`);
  }
});

it('coloca cada carta jugada frente a su jugador y deja solo el palo de triunfo en el centro',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:2,jokerCount:0,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false,modes:{trump:true}};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🤖',connected:true});
  start(game);
  game.trumpSuit='Copas';
  game.phase='play';
  game.table=[{playerId:'a',card:{id:'a-card',suit:'Oros',value:'2'}},{playerId:'b',card:{id:'b-card',suit:'Copas',value:'3'}}];
  const html=renderToStaticMarkup(<GameWorkspace game={view(game,'a')} userId="a" action={()=>{}}/>);
  expect((html.match(/class="tablePlay /g)||[])).toHaveLength(2);
  expect(html).toContain('Ana jugó en posición 1');
  expect(html).toContain('Berta jugó en posición 2');
  expect(html).toContain('tableTrumpSymbol');
  expect(html).not.toContain('TRIUNFO · GANA ESTE PALO');
});
