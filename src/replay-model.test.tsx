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
  expect(html).toContain('role="progressbar"');
  expect(html).toContain('Mostrar todas las manos');
});
