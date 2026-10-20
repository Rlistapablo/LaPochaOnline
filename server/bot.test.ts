import {it,expect} from 'vitest';
import {createGame,addPlayer,start,advance,assertIntegrity,makeDeck,bid,type Settings} from '../shared/game';
import {runBots,chooseBotBid,chooseBotPlay} from './bot';
it('bots de tres niveles completan partidas usando las mismas transiciones',()=>{
 const settings:Settings={name:'bots',private:true,maxPlayers:4,maxCards:5,lives:3,penalty:'normal',oneCard:'hidden',bots:3,difficulty:'normal',turnSeconds:30,sounds:false};
 for(let i=0;i<100;i++){const g=createGame('BOTS',{id:'easy',name:'Easy',avatar:'🤖',connected:true,bot:'easy'},settings);addPlayer(g,{id:'normal',name:'Normal',avatar:'🤖',connected:true,bot:'normal'});addPlayer(g,{id:'hard',name:'Hard',avatar:'🤖',connected:true,bot:'hard'});start(g);let guard=0;while(g.phase!=='finished'&&guard++<100){runBots(g);assertIntegrity(g);if(g.phase==='roundEnd')advance(g,g.version);}expect(g.phase).toBe('finished');expect(g.winners.length).toBeGreaterThan(0);}
});
it('el bot difícil usa las cartas visibles del rival en la predicción oculta',()=>{
 const settings:Settings={name:'test',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'hidden',bots:1,difficulty:'hard',turnSeconds:30,sounds:false};
 const g=createGame('HIDDEN',{id:'human',name:'Humano',avatar:'🃏',connected:true},settings);addPlayer(g,{id:'bot',name:'Bot',avatar:'🤖',connected:true,bot:'hard'});start(g);
 g.firstIndex=0;g.turnIndex=0;
 const ace=makeDeck().find(card=>card.id==='Oros_As')!;const old=g.players[0].hand[0];if(old.id!==ace.id){g.players[0].hand[0]=ace;const index=g.deck.findIndex(card=>card.id===ace.id);if(index>=0)g.deck[index]=old;else g.players[1].hand[0]=old;}
 bid(g,'human',0,g.version);expect(chooseBotBid(g,g.players[1])).toBe(0);
});
it('el bot difícil gana con comodín cuando necesita la última baza',()=>{
 const settings:Settings={name:'test',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false};
 const g=createGame('PLAY',{id:'human',name:'Humano',avatar:'🃏',connected:true},settings);addPlayer(g,{id:'bot',name:'Bot',avatar:'🤖',connected:true,bot:'hard'});start(g);
 g.phase='play';g.turnIndex=1;g.players[1].bid=1;g.players[1].hand=[{id:'joker_1'}];g.table=[{playerId:'human',card:{id:'Oros_As',suit:'Oros',value:'As'}}];
 const choice=chooseBotPlay(g,g.players[1]);expect(choice.card.id).toBe('joker_1');expect(choice.value).toBe('As');
});
