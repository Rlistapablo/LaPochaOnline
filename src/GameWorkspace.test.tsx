import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {addPlayer,bid,createGame,start,view,type Settings} from '../shared/game';
import {GameWorkspace} from './GameWorkspace';
import {TrickHistory} from './TrickHistory';
import {CardView} from './CardView';

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
