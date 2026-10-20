import {describe,it,expect} from 'vitest';
import {active,addPlayer,advance,allowedBids,bid,createGame,isJoker,makeDeck,play,rank,start,view,assertIntegrity,type Game,type Settings} from './game';

const settings:Settings={name:'Avanzado',private:true,maxPlayers:4,maxCards:2,jokerCount:2,lives:5,penalty:'normal',oneCard:'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
function game(players=2){const g=createGame('ADV',{id:'p0',name:'P0',avatar:'🃏',connected:true},{...settings});for(let i=1;i<players;i++)addPlayer(g,{id:`p${i}`,name:`P${i}`,avatar:'🃏',connected:true});return g;}
function finishRound(g:Game){while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[0];play(g,p.id,card.id,isJoker(card)?'2':undefined,g.version);}}

describe('partidas continuas',()=>{
  it('selecciona el primer asiento en el servidor y rota en cada ronda',()=>{
    const starts=new Set<number>();for(let i=0;i<80;i++){const g=game(4);start(g);starts.add(g.firstIndex);}expect(starts.size).toBeGreaterThan(1);
    const g=game(4);start(g);g.players.forEach(p=>p.lives=100);const first=g.firstIndex,cards:number[]=[];
    for(let i=0;i<5;i++){cards.push(g.cardsPerPlayer);expect(view(g,'p0').order[0]).toBe(g.players[g.firstIndex].id);finishRound(g);expect(g.phase).toBe('roundEnd');advance(g,g.version);expect(g.firstIndex).toBe((first+i+1)%4);}
    expect(cards).toEqual([2,1,2,1,2]);expect(g.wave).toBe(2);expect(g.roundIndex).toBe(5);
  });
  it('termina la partida cuando uno pierde su última vida aunque queden dos supervivientes',()=>{
    const g=game(3);g.settings.maxCards=1;g.settings.oneCard='hidden';start(g);
    const first=g.players[g.firstIndex];first.lives=1;
    const weakest=g.players.reduce((best,p)=>rank({playerId:p.id,card:p.hand[0],declaredValue:isJoker(p.hand[0])?'2':undefined})<rank({playerId:best.id,card:best.hand[0],declaredValue:isJoker(best.hand[0])?'2':undefined})?p:best);
    [first.hand[0],weakest.hand[0]]=[weakest.hand[0],first.hand[0]];
    while(g.phase==='bid'){const p=g.players[g.turnIndex];bid(g,p.id,p.id===first.id?1:allowedBids(g)[0],g.version);}
    while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[0];play(g,p.id,card.id,isJoker(card)?'2':undefined,g.version);}
    expect(g.phase).toBe('finished');expect(first.eliminated).toBe(true);expect(active(g)).toHaveLength(2);
    const mostLives=Math.max(...g.players.map(p=>p.lives));
    expect(g.winners).toEqual(g.players.filter(p=>p.lives===mostLives).map(p=>p.id));
    expect(g.autoRestart).toBe(true);
    expect(()=>advance(g,g.version)).toThrow();
    assertIntegrity(g);
  });
  it('declara empate cuando todos pierden la última vida en la misma ronda',()=>{
    const g=game();start(g);g.players.forEach(p=>p.lives=1);
    const ids=['Oros_As','Oros_2','Copas_Rey','Copas_4'],deck=makeDeck();
    g.players[0].hand=[deck.find(c=>c.id===ids[0])!,deck.find(c=>c.id===ids[1])!];
    g.players[1].hand=[deck.find(c=>c.id===ids[2])!,deck.find(c=>c.id===ids[3])!];
    g.deck=deck.filter(c=>!ids.includes(c.id));
    while(g.phase==='bid')bid(g,g.players[g.turnIndex].id,0,g.version);
    while(g.phase==='play'){const p=g.players[g.turnIndex],card=p.hand[g.tricks.length===0?(p.id==='p0'?0:1):(p.id==='p0'?0:0)];play(g,p.id,card.id,undefined,g.version);}
    expect(g.phase).toBe('finished');expect(g.winners.toSorted()).toEqual(['p0','p1']);expect(g.players.every(p=>p.eliminated)).toBe(true);
  });
  it('admite barajas de 40 a 44 cartas y comodines físicos únicos',()=>{for(let jokers=0;jokers<=4;jokers++){const cards=makeDeck(jokers);expect(cards).toHaveLength(40+jokers);expect(new Set(cards.map(c=>c.id)).size).toBe(cards.length);const g=game();g.settings.jokerCount=jokers;start(g);assertIntegrity(g);}});
  it('registra eventos ordenados sin revelar manos anteriores durante la partida',()=>{const g=game();start(g);finishRound(g);expect(g.phase).toBe('roundEnd');expect(view(g,'p0').history[0].hands).toBeUndefined();const seq=g.pendingEvents?.map(e=>e.sequence)||[];expect(seq).toEqual(seq.toSorted((a,b)=>a-b));expect(new Set(seq).size).toBe(seq.length);expect(g.pendingEvents?.some(e=>e.type==='round_started'&&!!e.data.hands)).toBe(true);});
});
