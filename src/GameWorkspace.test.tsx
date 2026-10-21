import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {addPlayer,bid,createGame,start,view,type Settings} from '../shared/game';
import {GameWorkspace} from './GameWorkspace';
import {TrickHistory} from './TrickHistory';
import {CardView} from './CardView';
import {TableBoard} from './TableBoard';

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
  expect((first.match(/class="rotationArrow"/g)||[])).toHaveLength(2);
  expect((second.match(/class="rotationArrow"/g)||[])).toHaveLength(2);
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
  expect((html.match(/class="rotationArrow"/g)||[])).toHaveLength(1);
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
