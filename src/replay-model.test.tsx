import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReplayBoard} from './ReplayLibrary';
import {buildReplayTimeline,type ReplayData,type ReplayEvent} from './replay-model';

const ace={id:'Oros_As',suit:'Oros' as const,value:'As' as const};
const two={id:'Copas_2',suit:'Copas' as const,value:'2' as const};
const event=(sequence:number,type:string,data:Record<string,unknown>,player_id?:string):ReplayEvent=>({sequence,type,data,player_id,occurred_at:'2026-10-20T17:00:00Z'});
const replay:ReplayData={
  game:{id:'game',room_name:'Mesa de prueba',room_code:'TEST',started_at:'2026-10-20T17:00:00Z',finished_at:'2026-10-20T17:01:00Z',winners:['b'],settings:{}},
  players:[{player_id:'a',name:'Ana',avatar:'🃏',is_bot:false,lives_start:1,lives_end:0},{player_id:'b',name:'Bot Pepe',avatar:'🤖',is_bot:true,lives_start:3,lives_end:3}],
  events:[
    event(1,'round_started',{roundIndex:0,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:1,b:3}}),
    event(2,'bid',{roundIndex:0,bid:0,position:1},'a'),
    event(3,'bid',{roundIndex:0,bid:0,position:2},'b'),
    event(4,'card_played',{roundIndex:0,trickIndex:0,playIndex:0,card:ace},'a'),
    event(5,'card_played',{roundIndex:0,trickIndex:0,playIndex:1,card:two},'b'),
    event(6,'trick_won',{roundIndex:0,trickIndex:0,winnerId:'a',reason:'Ana gana con As de Oros.'},'a'),
    event(7,'round_ended',{roundIndex:0,result:[{id:'a',bid:0,wins:1,livesBefore:1,lives:0,lost:1},{id:'b',bid:0,wins:0,livesBefore:3,lives:3,lost:0}]}),
    event(8,'game_finished',{winners:['b'],reason:'elimination'}),
  ],
};

it('reconstruye reparto, predicciones, cartas, ganador y vidas sin alterar escenas anteriores',()=>{
  const scenes=buildReplayTimeline(replay);
  expect(scenes.map(scene=>scene.sequence)).toEqual([1,2,3,4,5,6,7,8]);
  expect(scenes[0].hands.a).toEqual([ace]);
  expect(scenes[0].nextPlayerId).toBe('a');
  expect(scenes[3].table).toHaveLength(1);
  expect(scenes[3].hands.a).toEqual([]);
  expect(scenes[5].table.map(play=>play.card.id)).toEqual(['Oros_As','Copas_2']);
  expect(scenes[5].wins.a).toBe(1);
  expect(scenes[5].winnerId).toBe('a');
  expect(scenes[6].lives.a).toBe(0);
  expect(scenes[6].table).toHaveLength(0);
  expect(scenes[0].hands.a).toEqual([ace]);
  expect(scenes[0].lives.a).toBe(1);
});

it('muestra la mesa y el menú de situaciones con los datos reconstruidos',()=>{
  const scenes=buildReplayTimeline(replay);
  const html=renderToStaticMarkup(<ReplayBoard replay={replay} scenes={scenes} index={5} setIndex={()=>{}} playing={false} setPlaying={()=>{}} focusId="a" setFocusId={()=>{}} showHands={false} setShowHands={()=>{}}/>);
  expect(html).toContain('Mesa de repetición');
  expect(html).toContain('Momentos de la ronda');
  expect(html).toContain('Ana gana la baza');
  expect(html).toContain('As de Oros');
  expect((html.match(/class="tablePlay/g)||[])).toHaveLength(2);
  expect(html).toContain('polygonTable replayFelt players-2');
  expect(html).toContain('class="tableOuterRim"');
  expect(html).toContain('class="tableRimHighlight"');
  expect(html).toContain('rotationArrow');
  expect((html.match(/class="rotationArrow"/g)||[])).toHaveLength(1);
  expect(html).toContain('INICIO');
  expect(html).toContain('FINAL');
  expect(html).not.toContain('replayPlayed');
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('Mostrar todas las manos');
});
it('mantiene las posiciones al rotar el inicio de la ronda',()=>{
  const rotated:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
    event(2,'round_started',{roundIndex:1,cards:1,order:['b','a'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
  ]};
  const scenes=buildReplayTimeline(rotated);
  const render=(index:number)=>renderToStaticMarkup(<ReplayBoard replay={rotated} scenes={scenes} index={index} setIndex={()=>{}} playing={false} setPlaying={()=>{}} focusId="a" setFocusId={()=>{}} showHands={false} setShowHands={()=>{}}/>);
  const first=render(0),second=render(1);
  expect(first).toContain('style="--seat-x:50%;--seat-y:85%" aria-label="Ana. Comienza');
  expect(second).toContain('style="--seat-x:50%;--seat-y:85%" aria-label="Ana. Termina');
  expect(second).toContain('style="--seat-x:50%;--seat-y:15%" aria-label="Bot Pepe. Comienza');
  expect((first.match(/class="rotationArrow"/g)||[])).toHaveLength(1);
  expect((second.match(/class="rotationArrow"/g)||[])).toHaveLength(1);
});
it('reconstruye intercambios, cartas mostradas y robos en la repetición',()=>{
  const altered:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3},trumpSuit:'Copas'}),
    event(2,'cards_exchanged',{a:'a',b:'b',aCards:[ace],bCards:[two]}),
    event(3,'cards_revealed',{cards:[two]},'a'),
    event(4,'card_stolen',{from:'b',gave:two,took:ace},'a'),
  ]};
  const scenes=buildReplayTimeline(altered);
  expect(scenes[0].trumpSuit).toBe('Copas');
  expect(scenes[1].hands.a[0]).toEqual(two);
  expect(scenes[2].revealed.a).toEqual([two.id]);
  expect(scenes[3].hands.a[0]).toEqual(ace);
  expect(scenes[0].hands.a[0]).toEqual(ace);
  const html=renderToStaticMarkup(<ReplayBoard replay={altered} scenes={scenes} index={0} setIndex={()=>{}} playing={false} setPlaying={()=>{}} focusId="a" setFocusId={()=>{}} showHands={false} setShowHands={()=>{}}/>);
  expect(html).toContain('trump-copas');
  expect(html).toContain('replayTrumpSymbol');
});
it('muestra los poderes disponibles en cada situación, también en repeticiones antiguas',()=>{
  const powered:ReplayData={...replay,game:{...replay.game,settings:{modes:{stealWinStreak:1,reshuffleWinStreak:2,exchangeUses:2,exchangeRefreshRounds:2}}},events:[
    event(1,'round_started',{roundIndex:0,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3},trumpSuit:'Copas'}),
    event(2,'cards_exchanged',{a:'a',b:'b',aCards:[ace],bCards:[two]}),
    event(3,'round_ended',{result:[{id:'a',bid:0,wins:0,lives:3},{id:'b',bid:0,wins:1,lives:3}]}),
    event(4,'round_started',{roundIndex:1,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
    event(5,'card_stolen',{from:'b',gave:ace,took:two},'a'),
    event(6,'round_ended',{result:[{id:'a',bid:0,wins:0,lives:3},{id:'b',bid:0,wins:1,lives:3}]}),
    event(7,'round_started',{roundIndex:2,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
    event(8,'hands_reshuffled',{hands:{a:[ace],b:[two]}},'a'),
  ]};
  const scenes=buildReplayTimeline(powered);
  expect(scenes[0].powers.a).toEqual({steals:0,reshuffles:0,exchanges:2});
  expect(scenes[1].powers.a.exchanges).toBe(1);
  expect(scenes[2].powers.a.steals).toBe(1);
  expect(scenes[4].powers.a.steals).toBe(0);
  expect(scenes[5].powers.a).toEqual({steals:1,reshuffles:1,exchanges:1});
  expect(scenes[6].powers.a.exchanges).toBe(2);
  expect(scenes[7].powers.a.reshuffles).toBe(0);
  expect(scenes[2].powers.a.steals).toBe(1);
  const html=renderToStaticMarkup(<ReplayBoard replay={powered} scenes={scenes} index={5} setIndex={()=>{}} playing={false} setPlaying={()=>{}} focusId="a" setFocusId={()=>{}} showHands={false} setShowHands={()=>{}}/>);
  expect(html).toContain('1 robo');
  expect(html).toContain('1 mezcla');
  expect(html).toContain('1 cambio');
});
it('usa los contadores guardados en los eventos nuevos',()=>{
  const withSnapshots:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},powers:{a:{steals:2,reshuffles:1,exchanges:0},b:{steals:0,reshuffles:0,exchanges:0}}}),
    event(2,'round_ended',{result:[{id:'a',bid:0,wins:0,lives:3}],powers:{a:{steals:4,reshuffles:2,exchanges:0}}}),
  ]};
  const scenes=buildReplayTimeline(withSnapshots);
  expect(scenes[0].powers.a).toEqual({steals:2,reshuffles:1,exchanges:0});
  expect(scenes[1].powers.a).toEqual({steals:4,reshuffles:2,exchanges:0});
});
it('mantiene eliminados sin poderes disponibles al pasar de ronda',()=>{
  const nextRound:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:1,b:3},powers:{a:{steals:1,reshuffles:0,exchanges:0}}}),
    event(2,'round_ended',{result:[{id:'a',bid:0,wins:1,lives:0},{id:'b',bid:0,wins:0,lives:3}]}),
    event(3,'round_started',{roundIndex:1,cards:1,order:['b'],hands:{b:[two]},lives:{b:3}}),
  ]};
  const scenes=buildReplayTimeline(nextRound);
  expect(scenes[2].lives.a).toBe(0);
  const html=renderToStaticMarkup(<ReplayBoard replay={nextRound} scenes={scenes} index={2} setIndex={()=>{}} playing={false} setPlaying={()=>{}} focusId="b" setFocusId={()=>{}} showHands={false} setShowHands={()=>{}}/>);
  expect(html).not.toContain('1 robo');
});
it('muestra una oferta rechazada sin cambiar las manos',()=>{
  const declined:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
    event(2,'exchange_offered',{to:'b'},'a'),
    event(3,'exchange_declined',{from:'a'},'b'),
  ]};
  const scenes=buildReplayTimeline(declined);
  expect(scenes[2].title).toContain('rechaza el intercambio');
  expect(scenes[2].hands).toEqual(scenes[0].hands);
});
it('muestra un intercambio omitido antes de predecir',()=>{
  const skipped:ReplayData={...replay,events:[
    event(1,'round_started',{roundIndex:0,wave:0,cards:1,order:['a','b'],hands:{a:[ace],b:[two]},lives:{a:3,b:3}}),
    event(2,'exchange_skipped',{roundIndex:0},'a'),
  ]};
  const scenes=buildReplayTimeline(skipped);
  expect(scenes[1].title).toContain('pasa el intercambio');
  expect(scenes[1].hands).toEqual(scenes[0].hands);
});
