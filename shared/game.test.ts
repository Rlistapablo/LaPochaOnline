import {describe,it,expect} from 'vitest';
import {makeDeck,createGame,addPlayer,takeOverBot,replaceLeaverWithBot,returnToBotSeat,start,bid,play,advance,rematch,finishGame,oneCardMode,allowedBids,assertIntegrity,view,trickWinner,schedule,penaltyForRound,VALUES,type Settings} from './game';
const settings:Settings={name:'test',private:true,maxPlayers:4,maxCards:5,lives:3,penalty:'normal',oneCard:'hidden',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
function game(){const g=createGame('TEST',{id:'a',name:'A',avatar:'🃏',connected:true},{...settings});addPlayer(g,{id:'b',name:'B',avatar:'🃏',connected:true});return g;}
describe('motor físico',()=>{
 it('releva con un bot al jugador que sale y conserva sus cartas y turno',()=>{
  const g=game();start(g);
  const seat=g.players[g.turnIndex],cards=[...seat.hand],turn=g.turnIndex;
  replaceLeaverWithBot(g,seat.id);
  expect(g.players[turn].bot).toBe('normal');expect(g.players[turn].hand).toEqual(cards);
  expect(g.turnIndex).toBe(turn);expect(g.players[turn].controllerId).toBeUndefined();
  expect(g.pendingEvents?.at(-1)?.type).toBe('player_replaced_by_bot');
  assertIntegrity(g);
 });
 it('devuelve al jugador de una sala privada el mismo asiento y mano al regresar',()=>{
  const g=game();start(g);
  const seat=g.players[0],cards=[...seat.hand],turn=g.turnIndex;
  replaceLeaverWithBot(g,seat.id);
  expect(()=>returnToBotSeat(g,seat.id,{id:'intruso',name:'Intruso',avatar:'🃏'})).toThrow('Asiento no disponible');
  returnToBotSeat(g,seat.id,{id:'a',name:'A',avatar:'🃏'});
  expect(seat.bot).toBeUndefined();expect(seat.hand).toEqual(cards);
  expect(g.turnIndex).toBe(turn);expect(view(g,'a').players[0].hand).toEqual(cards);
  expect(g.pendingEvents?.at(-1)?.type).toBe('player_returned');
  assertIntegrity(g);
 });
 it('sustituye un bot público sin mover su asiento ni revelar cartas a espectadores',()=>{
  const g=createGame('PUBLIC',{id:'a',name:'A',avatar:'🃏',connected:true},{...settings,private:false});
  addPlayer(g,{id:'bot-id',name:'Bot',avatar:'🤖',bot:'normal',connected:true});start(g);
  const hand=[...g.players[1].hand],seat=g.players[1].id;
  const replacement=takeOverBot(g,{id:'human-id',name:'Humano',avatar:'🃏'});
  expect(replacement.id).toBe(seat);expect(replacement.hand).toEqual(hand);expect(replacement.bot).toBeUndefined();
  expect(view(g,seat).viewerId).toBe(seat);expect(view(g,seat).players[1].hand).toEqual(hand);
  expect(view(g).players.every(player=>player.hand===undefined)).toBe(true);
  expect(()=>takeOverBot(g,{id:'another',name:'Otro',avatar:'🃏'})).toThrow('No hay bots');
 });
 it('contiene 40 cartas y dos comodines únicos',()=>{const d=makeDeck();expect(d).toHaveLength(42);expect(new Set(d.map(c=>c.id)).size).toBe(42);expect(d.filter(c=>c.id.startsWith('joker'))).toHaveLength(2);});
 it('el empate de valor favorece la última carta, incluidos comodines',()=>{const d=makeDeck();expect(trickWinner([{playerId:'a',card:d.find(c=>c.id==='Oros_As')!},{playerId:'b',card:d.find(c=>c.id==='joker_1')!,declaredValue:'As'}])).toBe('b');expect(trickWinner([{playerId:'a',card:d.find(c=>c.id==='joker_1')!,declaredValue:'As'},{playerId:'b',card:d.find(c=>c.id==='Copas_As')!}])).toBe('b');});
 it('rechaza predicción prohibida, versión antigua y carta repetida',()=>{const g=game();start(g);bid(g,g.players[g.turnIndex].id,2,g.version);expect(allowedBids(g)).not.toContain(3);expect(()=>bid(g,g.players[g.turnIndex].id,3,g.version)).toThrow();bid(g,g.players[g.turnIndex].id,0,g.version);const p=g.players[g.turnIndex],c=p.hand[0],old=g.version;play(g,p.id,c.id,c.id.startsWith('joker')?'As':undefined,g.version);expect(()=>play(g,p.id,c.id,undefined,old)).toThrow();assertIntegrity(g);});
 it('oculta la carta propia sin enviarla durante la predicción',()=>{const g=game();g.settings.maxCards=1;start(g);const a=view(g,'a'),b=view(g,'b'),spectator=view(g);expect(a.players[0].hand).toEqual([null]);expect(a.players[1].hand?.[0]).toEqual(g.players[1].hand[0]);expect(b.players[1].hand).toEqual([null]);expect(spectator.players.every(p=>p.hand===undefined)).toBe(true);});
 it('entrega la mano antes de predecir en las rondas normales y en una carta visible',()=>{const g=game();start(g);expect(g.phase).toBe('bid');expect(view(g,'a').players[0].hand).toEqual(g.players[0].hand);expect(view(g,'a').players[1].hand).toBeUndefined();const h=game();h.settings.maxCards=1;h.settings.oneCard='visible';start(h);expect(view(h,'a').players[0].hand).toEqual(h.players[0].hand);expect(view(h,'a').players[1].hand).toBeUndefined();});
 it('genera un solo valle de una carta',()=>expect(schedule(5)).toEqual([5,4,3,2,1,2,3,4,5]));
 it('incluye copas y los otros palos en cada bloque de cuatro rondas de triunfo',()=>{
  const g=game();g.settings.maxCards=2;g.settings.modes={trump:true};start(g);
  g.players.forEach(p=>p.lives=100);
  const suits:string[]=[];
  for(let round=0;round<8;round++){
   suits.push(g.trumpSuit!);
   while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);
   while(g.phase==='play'){const p=g.players[g.turnIndex],c=p.hand[0];play(g,p.id,c.id,c.id.startsWith('joker')?'2':undefined,g.version);}
   advance(g,g.version);
  }
  expect(suits.slice(0,4).toSorted()).toEqual(['Bastos','Copas','Espadas','Oros']);
  expect(suits.slice(4,8).toSorted()).toEqual(['Bastos','Copas','Espadas','Oros']);
  expect(suits.every((suit,index)=>index===0||suit!==suits[index-1])).toBe(true);
 });
 it('reparte menos cartas cada ronda y vuelve a subir después de una carta',()=>{
  const g=game();g.settings.maxCards=3;start(g);
  g.players.forEach(p=>p.lives=100); // Evita que una eliminación reinicie el ciclo durante esta prueba.
  const dealt:number[]=[];
  for(let round=0;round<5;round++){
   dealt.push(g.cardsPerPlayer);
   expect(g.players.map(p=>p.hand.length)).toEqual([g.cardsPerPlayer,g.cardsPerPlayer]);
   expect(view(g,'a').schedule).toEqual([3,2,1,2,3]);
   while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);
   while(g.phase==='play'){
    const p=g.players[g.turnIndex],c=p.hand[0];
    play(g,p.id,c.id,c.id.startsWith('joker')?'2':undefined,g.version);
   }
   expect(g.phase).toBe('roundEnd');
   advance(g,g.version);
  }
  expect(dealt).toEqual([3,2,1,2,3]);
  expect(g.history.map(r=>r.round)).toEqual(dealt);
  expect(g.phase).toBe('bid');
  expect(g.wave).toBe(1);
  expect(g.cardsPerPlayer).toBe(2);
  expect(view(g,'a').round).toBe(6);
 });
 it('aumenta la penalización progresiva y reinicia la racha al acertar',()=>{expect(penaltyForRound(2,0,'progressive')).toEqual({streak:1,multiplier:1,lost:2});expect(penaltyForRound(2,1,'progressive')).toEqual({streak:2,multiplier:2,lost:4});expect(penaltyForRound(1,2,'normal')).toEqual({streak:3,multiplier:1,lost:1});expect(penaltyForRound(0,3,'progressive')).toEqual({streak:0,multiplier:1,lost:0});});
 it('permite todos los valores de comodín',()=>{for(const v of VALUES)expect(trickWinner([{playerId:'a',card:{id:'joker_1'},declaredValue:v}])).toBe('a');});
 it('descuenta vidas sin bajarlas de cero y termina al agotar las vidas',()=>{const g=game();g.settings.maxCards=1;start(g);g.players.forEach(p=>p.lives=1);while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,1,g.version);while(g.phase==='play'){const p=g.players[g.turnIndex],c=p.hand[0];play(g,p.id,c.id,c.id.startsWith('joker')?'2':undefined,g.version);}expect(g.phase).toBe('finished');expect(g.players.filter(p=>p.eliminated)).toHaveLength(1);expect(g.players.some(p=>p.lives<0)).toBe(false);expect(g.autoRestart).toBe(false);expect(g.winners).toHaveLength(1);expect(()=>advance(g,g.version)).toThrow();assertIntegrity(g);});
 it('termina la partida antes de la última ronda si alguien pierde todas las vidas',()=>{
  const g=game();g.settings.maxCards=3;start(g);g.players.forEach(p=>p.lives=1);
  const dealt:number[]=[];
  while(g.phase!=='finished'){
   dealt.push(g.cardsPerPlayer);
   while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);
   while(g.phase==='play'){
    const p=g.players[g.turnIndex],card=p.hand[0];
    play(g,p.id,card.id,card.id.startsWith('joker')?'2':undefined,g.version);
   }
   if(g.phase==='roundEnd')advance(g,g.version);
  }
  expect(dealt).toEqual([3]);
  expect(g.history.map(r=>r.round)).toEqual(dealt);
  expect(g.players.some(p=>p.eliminated)).toBe(true);
  expect(g.autoRestart).toBe(false);
  expect(g.endReason).toBe('elimination');
  expect(g.autoRestartAt).toBeUndefined();
  expect(()=>rematch(g,'b')).toThrow('Solo el creador');
  expect(g.phase).toBe('finished');
  rematch(g,'a');start(g);
  expect(g.cycle).toBe(1);
  expect(g.players.every(p=>p.lives===3&&!p.eliminated)).toBe(true);
 });
 it('alterna el modo de una carta en la revancha',()=>{const g=game();g.settings.maxCards=1;g.settings.oneCard='alternate';start(g);expect(oneCardMode(g)).toBe('hidden');while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);while(g.phase==='play'){const p=g.players[g.turnIndex],c=p.hand[0];play(g,p.id,c.id,c.id.startsWith('joker')?'2':undefined,g.version);}finishGame(g,'a',g.version);rematch(g,'a');start(g);expect(oneCardMode(g)).toBe('visible');});
 it('solo el anfitrión puede terminar una partida y la ronda incompleta no puntúa',()=>{const g=game();start(g);const version=g.version;expect(()=>finishGame(g,'b',version)).toThrow('Solo el anfitrión');expect(g.phase).toBe('bid');finishGame(g,'a',version);expect(g.phase).toBe('finished');expect(g.endReason).toBe('manual');expect(g.autoRestart).toBe(false);expect(g.history).toHaveLength(0);expect(g.players.every(p=>p.lives===3)).toBe(true);expect(()=>finishGame(g,'a',version)).toThrow();rematch(g,'a');expect(g.phase).toBe('lobby');});
 it('permite a un administrador terminar una partida sin ser anfitrión',()=>{const g=game();start(g);finishGame(g,'admin',g.version,true);expect(g.phase).toBe('finished');expect(g.endReason).toBe('manual');expect(g.autoRestart).toBe(false);expect(g.pendingEvents?.at(-1)).toMatchObject({type:'game_finished',playerId:'admin'});});
});
