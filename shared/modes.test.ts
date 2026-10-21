import {expect,it} from 'vitest';
import {active,addPlayer,advance,assertIntegrity,bid,configuredDeck,createGame,declineExchange,finishGame,normalizeModes,offerExchange,play,preparationActor,rematch,reshuffleHands,selectExchange,selectReveal,start,stealCard,trickWinnerWithTrump,validateModes,view,type Game,type Modes,type Settings} from './game';

const settings=(modes:Modes):Settings=>({name:'Modos',private:true,maxPlayers:3,maxCards:1,jokerCount:2,lives:3,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false,modes});
function game(modes:Modes,players=2){const g=createGame('MODOS',{id:'a',name:'Ana',avatar:'🃏',connected:true},settings(modes));addPlayer(g,{id:'b',name:'Beto',avatar:'🃏',connected:true});if(players===3)addPlayer(g,{id:'c',name:'Cora',avatar:'🃏',connected:true});start(g);return g;}
function completeOneCardRound(g:Game){while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[0];play(g,p.id,card.id,card.id.startsWith('joker')?'2':undefined,g.version);}}

it('intercambia cartas escogidas por ambos antes de predecir y conserva la baraja',()=>{
  const g=game({exchangeEveryWaves:1,exchangeCount:1});expect(g.phase).toBe('exchange');
  const a=g.players.find(p=>p.id===g.exchangePairs?.[0].a)!,b=g.players.find(p=>p.id!==a.id)!,fromA=a.hand[0],fromB=b.hand[0];offerExchange(g,a.id,b.id);selectExchange(g,a.id,[fromA.id]);expect(g.phase).toBe('exchange');
  selectExchange(g,b.id,[fromB.id]);expect(g.phase).toBe('bid');expect(a.hand[0]).toEqual(fromB);expect(b.hand[0]).toEqual(fromA);assertIntegrity(g);
});

it('el invitado puede rechazar el intercambio sin mover cartas y seguir a la revelación',()=>{
  const g=game({exchangeEveryWaves:1,exchangeCount:1,revealPercent:50});
  const offerer=g.players.find(p=>p.id===g.exchangePairs?.[0].a)!,guest=g.players.find(p=>p.id!==offerer.id)!;
  const before=Object.fromEntries(g.players.map(p=>[p.id,p.hand.map(card=>card.id)]));
  expect(()=>declineExchange(g,guest.id)).toThrow();
  offerExchange(g,offerer.id,guest.id);
  expect(preparationActor(g)?.id).toBe(guest.id);
  selectExchange(g,offerer.id,[offerer.hand[0].id]);
  declineExchange(g,guest.id);
  expect(g.phase).toBe('reveal');
  expect(g.exchangePairs?.[0].declined).toBe(true);
  expect(Object.fromEntries(g.players.map(p=>[p.id,p.hand.map(card=>card.id)]))).toEqual(before);
  expect(g.pendingEvents?.some(event=>event.type==='exchange_declined'&&event.playerId===guest.id)).toBe(true);
  expect(()=>declineExchange(g,offerer.id)).toThrow();
  for(const p of g.players)selectReveal(g,p.id,[p.hand[0].id]);
  expect(g.phase).toBe('bid');assertIntegrity(g);
  const accepted=game({exchangeEveryWaves:1});const a=accepted.exchangePairs![0].a,b=accepted.players.find(p=>p.id!==a)!;
  offerExchange(accepted,a,b.id);selectExchange(accepted,b.id,[b.hand[0].id]);
  expect(()=>declineExchange(accepted,b.id)).toThrow();
});

it('permite al oferente omitir el intercambio y empezar la predicción sin cambiar cartas',()=>{
  const g=game({exchangeEveryWaves:1,revealPercent:50});
  const owner=g.exchangePairs![0].a;
  const before=g.players.map(p=>p.hand.map(card=>card.id));
  declineExchange(g,owner);
  expect(g.phase).toBe('reveal');
  expect(g.players.map(p=>p.hand.map(card=>card.id))).toEqual(before);
  expect(g.pendingEvents?.some(event=>event.type==='exchange_skipped'&&event.playerId===owner)).toBe(true);
  for(const p of g.players)selectReveal(g,p.id,[p.hand[0].id]);
  expect(g.phase).toBe('bid');
});

it('da cambios a cada jugador, los gasta solo si se aceptan y los renueva cada X rondas',()=>{
  const g=game({exchangeUses:2,exchangeRefreshRounds:3,infiniteLives:true});
  expect(g.phase).toBe('exchange');
  const first=g.exchangePairs![0].a,second=g.exchangeQueue![0];
  expect(g.players.map(p=>p.exchanges)).toEqual([2,2]);
  expect(g.pendingEvents?.findLast(event=>event.type==='round_started')?.data.powers).toMatchObject({[first]:{exchanges:2},[second]:{exchanges:2}});
  offerExchange(g,first,second);
  selectExchange(g,first,[g.players.find(p=>p.id===first)!.hand[0].id]);
  selectExchange(g,second,[g.players.find(p=>p.id===second)!.hand[0].id]);
  expect(g.exchangePairs?.[0].a).toBe(second);
  expect(g.players.find(p=>p.id===first)?.exchanges).toBe(1);
  expect(g.players.find(p=>p.id===second)?.exchanges).toBe(2);
  expect(view(g,first).players.find(p=>p.id===first)?.exchanges).toBe(1);
  declineExchange(g,second);
  expect(g.phase).toBe('bid');
  completeOneCardRound(g);advance(g,g.version);
  expect(g.phase).toBe('exchange');
  offerExchange(g,g.exchangePairs![0].a,g.exchangeQueue![0]);
  declineExchange(g,g.exchangePairs![0].b);
  expect(g.players.find(p=>p.id===first)?.exchanges).toBe(1);
  expect(g.players.find(p=>p.id===second)?.exchanges).toBe(2);
  declineExchange(g,g.exchangePairs![0].a);
  completeOneCardRound(g);advance(g,g.version);
  while(g.phase==='exchange')declineExchange(g,g.exchangePairs![0].a);
  expect(g.players.find(p=>p.id===first)?.exchanges).toBe(1);
  completeOneCardRound(g);advance(g,g.version);
  expect(g.phase).toBe('exchange');
  expect(g.players.map(p=>p.exchanges)).toEqual([2,2]);
  assertIntegrity(g);
  finishGame(g,'a',g.version);rematch(g);
  expect(g.players.map(p=>p.exchanges)).toEqual([0,0]);
  start(g);
  expect(g.players.map(p=>p.exchanges)).toEqual([2,2]);
});

it('muestra solo las cartas elegidas y aplica las tres visiones al predecir',()=>{
  const g=game({revealPercent:50});expect(g.phase).toBe('reveal');
  for(const p of g.players)selectReveal(g,p.id,[p.hand[0].id]);
  expect(g.phase).toBe('bid');expect(view(g,'a').players[1].hand).toEqual(g.players[1].hand);
  const blind=game({vision:'blind'});expect(view(blind,'a').players[0].hand).toEqual([null]);expect(view(blind,'a').players[1].hand).toBeUndefined();
  const rivals=game({vision:'rivals'});expect(view(rivals,'a').players[0].hand).toEqual([null]);expect(view(rivals,'a').players[1].hand).toEqual(rivals.players[1].hand);
  const neighbor=game({vision:'neighbor'},3);expect(view(neighbor,'a').players.filter(p=>p.id!=='a'&&p.hand?.[0])).toHaveLength(1);
});

it('mantiene las cartas rivales visibles hasta la ultima prediccion, aunque el espectador ya haya predicho',()=>{
  const g=game({vision:'rivals'},3);
  g.firstIndex=0;g.turnIndex=0;
  const rivalHands=()=>view(g,'a').players.filter(p=>p.id!=='a').map(p=>p.hand);
  expect(rivalHands()).toEqual([g.players[1].hand,g.players[2].hand]);
  bid(g,'a',0,g.version);
  expect(g.phase).toBe('bid');
  expect(rivalHands()).toEqual([g.players[1].hand,g.players[2].hand]);
  bid(g,'b',0,g.version);
  expect(g.phase).toBe('bid');
  expect(rivalHands()).toEqual([g.players[1].hand,g.players[2].hand]);
  bid(g,'c',0,g.version);
  expect(g.phase).toBe('play');
  expect(rivalHands()).toEqual([undefined,undefined]);
  expect(view(g,'a').players[0].hand).toEqual(g.players[0].hand);
});

it('roba sin ver la carta rival y redistribuye solo las manos restantes',()=>{
  const g=game({stealWinStreak:2,reshuffleWinStreak:2});const [a,b]=g.players,fromA=a.hand[0],fromB=b.hand[0];
  a.steals=1;expect(a.steals).toBe(1);stealCard(g,a.id,b.id,fromA.id);expect(a.hand[0]).toEqual(fromB);expect(b.hand[0]).toEqual(fromA);expect(a.steals).toBe(0);
  expect(view(g,b.id).publicNotice).toEqual({sequence:g.eventSeq,type:'steal'});
  a.reshuffles=1;reshuffleHands(g,a.id,[a.id,b.id]);expect(a.reshuffles).toBe(0);assertIntegrity(g);
  expect(view(g,b.id).publicNotice).toEqual({sequence:g.eventSeq,type:'reshuffle'});
  expect(Object.keys(view(g,b.id).publicNotice!)).toEqual(['sequence','type']);
});

it('entrega poderes solo tras rachas de predicciones exactas y los limpia en la revancha',()=>{
  const g=game({stealWinStreak:2,reshuffleWinStreak:2});
  const target=g.players[0];
  expect(g.players.every(p=>!p.steals&&!p.reshuffles)).toBe(true);
  const round=(makeExact:boolean)=>{
    const order=[g.players[g.firstIndex],g.players[1-g.firstIndex]];
    const winner=trickWinnerWithTrump(order.map(p=>({playerId:p.id,card:p.hand[0],declaredValue:p.hand[0].id.startsWith('joker')?'2':undefined})),g.trumpSuit);
    const bidValue=Number((winner===target.id)===makeExact);
    while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,bidValue,g.version);
    while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[0];play(g,p.id,card.id,card.id.startsWith('joker')?'2':undefined,g.version);}
  };
  round(true);
  expect(target.cleanRounds).toBe(1);
  expect(target.steals).toBeFalsy();expect(target.reshuffles).toBeFalsy();
  expect(g.pendingEvents?.findLast(event=>event.type==='round_ended')?.data.powers).toMatchObject({[target.id]:{steals:0,reshuffles:0}});
  advance(g,g.version);round(true);
  expect(target.cleanRounds).toBe(2);
  expect(target.steals).toBe(1);expect(target.reshuffles).toBe(1);
  expect(g.pendingEvents?.findLast(event=>event.type==='round_ended')?.data.powers).toMatchObject({[target.id]:{steals:1,reshuffles:1}});
  advance(g,g.version);round(false);
  expect(target.cleanRounds).toBe(0);
  expect(target.steals).toBe(1);expect(target.reshuffles).toBe(1);
  finishGame(g,'a',g.version);rematch(g);
  expect(g.players.every(p=>!p.steals&&!p.reshuffles&&!p.cleanRounds)).toBe(true);
  expect(normalizeModes({stealWinStreak:2,reshuffleWinStreak:2})).toMatchObject({stealWinStreak:2,reshuffleWinStreak:2});
});

it('crea barajas especiales, reconoce triunfo y rechaza combinaciones imposibles',()=>{
  expect(configuredDeck(settings({deck:'jokers'})).every(card=>card.id.startsWith('joker'))).toBe(true);
  expect(configuredDeck(settings({deck:'figures',extraDecks:1}))).toHaveLength(24);
  const jokers=game({deck:'jokers',extraDecks:1});completeOneCardRound(jokers);assertIntegrity(jokers);expect(jokers.tricks[0].plays.every(played=>played.card.id.startsWith('joker'))).toBe(true);
  expect(trickWinnerWithTrump([{playerId:'a',card:{id:'Oros_As',suit:'Oros',value:'As'}},{playerId:'b',card:{id:'Copas_2',suit:'Copas',value:'2'}}],'Copas')).toBe('b');
  expect(()=>validateModes(settings({deck:'jokers',trump:true}))).toThrow();
  expect(()=>validateModes(settings({infiniteLives:true,lastStanding:true}))).toThrow();
  expect(()=>validateModes(settings({vision:'blind',revealPercent:20}))).toThrow();
  expect(()=>validateModes(settings({vision:'blind',exchangeUses:2}))).toThrow();
  expect(()=>validateModes(settings({vision:'rivals',exchangeUses:2}))).toThrow();
  expect(()=>validateModes(settings({exchangeEveryWaves:1,exchangeUses:2}))).toThrow();
  expect(normalizeModes({exchangeUses:2,exchangeRefreshRounds:0})).toMatchObject({exchangeUses:2,exchangeRefreshRounds:1});
  expect(()=>validateModes(settings({vision:'neighbor',revealPercent:20}))).toThrow();
});

it('permite continuar tras una eliminación y evita pérdidas con vidas infinitas',()=>{
  const survivor=game({lastStanding:true},3);survivor.players.forEach(p=>p.lives=1);completeOneCardRound(survivor);
  expect(survivor.phase).toBe('roundEnd');expect(active(survivor)).toHaveLength(2);
  advance(survivor,survivor.version);expect(active(survivor)).toHaveLength(2);expect(survivor.phase).toBe('bid');assertIntegrity(survivor);
  const endless=game({infiniteLives:true});endless.players.forEach(p=>p.lives=1);completeOneCardRound(endless);
  expect(endless.phase).toBe('roundEnd');expect(endless.players.map(p=>p.lives)).toEqual([1,1]);
});
it('recupera una vida al acertar y entrega acciones por racha de rondas con bazas',()=>{
  const g=game({recoverEvery:1,stealWinStreak:1,reshuffleWinStreak:1});
  const first=g.players[g.firstIndex],second=g.players[1-g.firstIndex];
  const winner=trickWinnerWithTrump([{playerId:first.id,card:first.hand[0],declaredValue:first.hand[0].id.startsWith('joker')?'2':undefined},{playerId:second.id,card:second.hand[0],declaredValue:second.hand[0].id.startsWith('joker')?'2':undefined}]);
  g.players.find(p=>p.id===winner)!.lives=2;
  while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,1,g.version);
  while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[0];play(g,p.id,card.id,card.id.startsWith('joker')?'2':undefined,g.version);}
  const p=g.players.find(p=>p.id===winner)!;
  expect(p.lives).toBe(3);expect(p.steals).toBe(1);expect(p.reshuffles).toBe(1);
});
