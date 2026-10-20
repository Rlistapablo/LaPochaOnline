import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {addPlayer,bid,createGame,start,view,type Settings} from '../shared/game';
import {GameWorkspace} from './GameWorkspace';

it('muestra orden, turno y progreso de bazas con datos del servidor',()=>{
  const settings:Settings={name:'Mesa',private:true,maxPlayers:2,maxCards:2,jokerCount:2,lives:5,penalty:'progressive',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
  const game=createGame('TEST',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings);
  addPlayer(game,{id:'b',name:'Berta',avatar:'🤖',connected:true,bot:'hard'});
  start(game);
  while(game.phase==='bid')bid(game,game.players[game.turnIndex].id,0,game.version);
  const markup=renderToStaticMarkup(<GameWorkspace game={view(game,'a')} userId="a" action={()=>{}}/>);
  expect(markup).toContain('Baza 1 de 2');
  expect(markup).toContain('role="progressbar"');
  expect(markup).toContain('1.º');
  expect(markup).toContain('2.º');
  expect(markup).toContain('Bot · difícil');
  expect(markup).toContain('Información');
});
