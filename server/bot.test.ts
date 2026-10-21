import {it,expect} from 'vitest';
import {createGame,addPlayer,start,advance,assertIntegrity,makeDeck,bid,offerExchange,selectExchange,type Settings,type Game,type Card} from '../shared/game';
import {runBots,runBotTurn,chooseBotBid,chooseBotPlay} from './bot';

function putInHand(g:Game,playerId:string,card:Card,index=0){
 const player=g.players.find(p=>p.id===playerId)!;
 const existing=player.hand[index];
 const deckIndex=g.deck.findIndex(c=>c.id===card.id);
 const owner=g.players.find(p=>p.hand.some(c=>c.id===card.id));
 if(deckIndex>=0)g.deck[deckIndex]=existing;
 else if(owner){const otherIndex=owner.hand.findIndex(c=>c.id===card.id);owner.hand[otherIndex]=existing;}
 else throw Error('Carta fuera del reparto');
 player.hand[index]=card;
}
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
it('los bots resuelven intercambio y revelación antes de jugar con triunfo',()=>{
 const settings:Settings={name:'modos',private:true,maxPlayers:2,maxCards:2,lives:3,penalty:'normal',oneCard:'visible',bots:2,difficulty:'normal',turnSeconds:30,sounds:false,modes:{exchangeEveryWaves:1,exchangeCount:1,revealPercent:50,trump:true,deck:'figures',stealWinStreak:1,reshuffleWinStreak:1}};
 const g=createGame('MODBOT',{id:'a',name:'A',avatar:'🤖',connected:true,bot:'normal'},settings);addPlayer(g,{id:'b',name:'B',avatar:'🤖',connected:true,bot:'hard'});start(g);
 expect(g.phase).toBe('exchange');runBots(g);expect(['roundEnd','finished']).toContain(g.phase);expect(g.pendingEvents?.some(event=>['cards_exchanged','exchange_declined','exchange_skipped'].includes(event.type))).toBe(true);expect(g.pendingEvents?.some(event=>event.type==='cards_revealed')).toBe(true);assertIntegrity(g);
});
it('los bots usan o conservan sus cambios fijos sin bloquear la preparación',()=>{
 const settings:Settings={name:'cambios',private:true,maxPlayers:3,maxCards:2,lives:3,penalty:'normal',oneCard:'visible',bots:3,difficulty:'normal',turnSeconds:30,sounds:false,modes:{exchangeUses:2,exchangeRefreshRounds:2}};
 const g=createGame('BOTCUPOS',{id:'a',name:'A',avatar:'B',connected:true,bot:'normal'},settings);
 addPlayer(g,{id:'b',name:'B',avatar:'B',connected:true,bot:'hard'});
 addPlayer(g,{id:'c',name:'C',avatar:'B',connected:true,bot:'easy'});
 start(g);
 expect(g.exchangeQueue).toHaveLength(2);
 runBots(g);
 expect(['roundEnd','finished']).toContain(g.phase);
 expect(g.players.every(p=>(p.exchanges||0)>=1)).toBe(true);
 assertIntegrity(g);
});
it('un bot a ciegas espera a la jugada para usar un robo',()=>{
 const settings:Settings={name:'ciego',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:2,difficulty:'normal',turnSeconds:30,sounds:false,modes:{vision:'blind',stealWinStreak:1}};
 const g=createGame('BLIND',{id:'a',name:'A',avatar:'🤖',connected:true,bot:'normal'},settings);addPlayer(g,{id:'b',name:'B',avatar:'🤖',connected:true,bot:'normal'});start(g);
 runBots(g);expect(['roundEnd','finished']).toContain(g.phase);assertIntegrity(g);
});

it('el triunfo cambia la carta elegida para ganar una baza',()=>{
 const settings:Settings={name:'triunfo',private:true,maxPlayers:2,maxCards:2,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{trump:true}};
 const g=createGame('TRUMP',{id:'human',name:'Humano',avatar:'H',connected:true},settings);addPlayer(g,{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'});start(g);
 g.phase='play';g.trumpSuit='Oros';g.turnIndex=1;g.players[1].bid=2;
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Oros_4')!,0);
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Copas_As')!,1);
 const rival=makeDeck().find(c=>c.id==='Oros_2')!;
 putInHand(g,'human',rival,0);
 g.table=[{playerId:'human',card:rival}];g.players[0].hand.shift();
 expect(chooseBotPlay(g,g.players[1]).card.id).toBe('Oros_4');
});

it('una predicción a ciegas no depende de la carta real del bot',()=>{
 const settings:Settings={name:'ciego',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{vision:'blind'}};
 const g=createGame('BLIND',{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'},settings);addPlayer(g,{id:'human',name:'Humano',avatar:'H',connected:true});start(g);
 g.turnIndex=0;g.firstIndex=0;
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Oros_As')!);
 const first=chooseBotBid(g,g.players[0]);
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Oros_2')!);
 expect(chooseBotBid(g,g.players[0])).toBe(first);
});

it('en un intercambio el bot conserva su triunfo fuerte',()=>{
 const settings:Settings={name:'intercambio',private:true,maxPlayers:2,maxCards:2,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{exchangeEveryWaves:1,exchangeCount:1,trump:true}};
 const g=createGame('EXCHANGE',{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'},settings);addPlayer(g,{id:'human',name:'Humano',avatar:'H',connected:true});start(g);
 g.trumpSuit='Oros';g.exchangePairs=[{a:'bot',b:'human'}];
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Oros_As')!,0);
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Copas_2')!,1);
 selectExchange(g,'human',[g.players[1].hand[0].id]);
 expect(runBotTurn(g)).toBe(true);
 expect(g.exchangePairs[0].aCards).toEqual(['Copas_2']);
 assertIntegrity(g);
});

it('un bot rechaza un intercambio sin ventaja en una baraja de comodines',()=>{
 const settings:Settings={name:'comodines',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{deck:'jokers',exchangeEveryWaves:1}};
 const g=createGame('DECLINE',{id:'human',name:'Humano',avatar:'H',connected:true},settings);addPlayer(g,{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'});start(g);
 g.exchangePairs=[{a:'human',b:''}];offerExchange(g,'human','bot');
 expect(runBotTurn(g)).toBe(true);
 expect(g.phase).toBe('bid');
 expect(g.exchangePairs?.[0].declined).toBe(true);
 expect(g.pendingEvents?.some(event=>event.type==='exchange_declined')).toBe(true);
 assertIntegrity(g);
});

it('el bot guarda un robo cuando todas las cartas son comodines equivalentes',()=>{
 const settings:Settings={name:'comodines',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{deck:'jokers',stealWinStreak:1}};
 const g=createGame('JOKERS',{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'},settings);addPlayer(g,{id:'human',name:'Humano',avatar:'H',connected:true});start(g);
 g.turnIndex=0;g.firstIndex=0;g.players[0].steals=1;
 expect(runBotTurn(g)).toBe(true);
 expect(g.players[0].steals).toBe(1);
 expect(g.pendingEvents?.some(event=>event.type==='card_stolen')).toBe(false);
 assertIntegrity(g);
});

it('el bot conserva la redistribución si ya tiene las bazas previstas',()=>{
 const settings:Settings={name:'redistribución',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{reshuffleWinStreak:1}};
 const g=createGame('SHUFFLE',{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'},settings);addPlayer(g,{id:'human',name:'Humano',avatar:'H',connected:true});start(g);
 g.phase='play';g.turnIndex=0;g.players[0].bid=0;g.players[0].reshuffles=1;
 expect(runBotTurn(g)).toBe(true);
 expect(g.players[0].reshuffles).toBe(1);
 expect(g.pendingEvents?.some(event=>event.type==='hands_reshuffled')).toBe(false);
 assertIntegrity(g);
});

it('el bot roba una carta fuerte mostrada a cambio de una débil',()=>{
 const settings:Settings={name:'robo',private:true,maxPlayers:2,maxCards:1,lives:3,penalty:'normal',oneCard:'visible',bots:1,difficulty:'hard',turnSeconds:30,sounds:false,modes:{revealPercent:100,stealWinStreak:1}};
 const g=createGame('STEAL',{id:'bot',name:'Bot',avatar:'B',connected:true,bot:'hard'},settings);addPlayer(g,{id:'human',name:'Humano',avatar:'H',connected:true});start(g);
 putInHand(g,'bot',makeDeck().find(c=>c.id==='Oros_2')!);
 putInHand(g,'human',makeDeck().find(c=>c.id==='Oros_As')!);
 g.phase='play';g.turnIndex=0;g.players[0].bid=1;g.players[0].steals=1;g.revealed={human:['Oros_As']};
 expect(runBotTurn(g)).toBe(true);
 expect(g.players[0].steals).toBe(0);
 expect(g.pendingEvents?.some(event=>event.type==='card_stolen')).toBe(true);
 assertIntegrity(g);
});
