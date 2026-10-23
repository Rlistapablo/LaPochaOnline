import {Game,Player,Card,VALUES,Value,allowedBids,active,turnOrder,view,isJoker,configuredDeck,penaltyForRound} from '../shared/game.js';

// Bot experto: muestrea manos posibles de los rivales (solo con información
// que el jugador puede ver), las pondera según las predicciones ya hechas y
// simula el resto de la ronda para elegir lo que menos vidas cuesta de media.

export type ExpertConfig={
  samples:number;        // mundos simulados por decisión
  maxMs:number;          // tope de tiempo por decisión
  candidates:number;     // manos candidatas por rival al ponderar sus predicciones
  rivalWeight:number;    // peso del daño causado a los rivales frente al propio
  eliminationCost:number;// coste extra de quedarse sin vidas
  botSigma:number;       // dispersión esperada entre mano y predicción de un bot
  humanSigma:number;     // idem para un humano
};
export const expertConfig:ExpertConfig={samples:120,maxMs:1500,candidates:5,rivalWeight:0.25,eliminationCost:1.5,botSigma:0.7,humanSigma:1.1};
// Nivel difícil: la misma simulación, pero con pocos mundos y sin deducir nada de las predicciones rivales.
export const hardConfig:ExpertConfig={samples:24,maxMs:400,candidates:1,rivalWeight:0,eliminationCost:1.5,botSigma:0,humanSigma:0};

const TOP=VALUES.length-1,JOKER=99,MIN_SAMPLES=24;
export type ExpertOption={card:Card;value?:Value;rank:number};

type Seat={id:string;slots:number;known:number[];played:number[];bid?:number;sigma:number};
type Context={
  cfg:ExpertConfig;seats:Seat[];me:number;n:number;cards:number;pool:number[];wins:number[];
  cost:number[][];weight:number[];tableBest:number;tableWinner:number;tableCount:number;
};

const strengthOf=(card:Card,trump?:Card['suit'])=>isJoker(card)?JOKER:(card.suit===trump?VALUES.length:0)+VALUES.indexOf(card.value!);
const shuffleInPlace=<T>(items:T[])=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};

// Probabilidad aproximada de que una carta gane una baza frente a cartas al azar.
function winWeights(g:Game,n:number){
  const deck=configuredDeck(g.settings).map(card=>strengthOf(card,g.trumpSuit)),table:number[]=[];
  for(const s of new Set([...deck,JOKER])){
    const less=deck.filter(x=>x<s).length,equal=deck.filter(x=>x===s).length;
    table[s===JOKER?VALUES.length*2:s]=Math.pow((less+equal/2)/deck.length,Math.max(1,n-1));
  }
  return table;
}
const weightOf=(table:number[],s:number)=>table[s===JOKER?VALUES.length*2:s]??0;

function buildContext(g:Game,p:Player,phase:'bid'|'play',cfg:ExpertConfig):Context|undefined{
  const trump=g.trumpSuit,n=active(g).length,v=view(g,p.id),cards=g.cardsPerPlayer;
  const leader=phase==='bid'?g.firstIndex:g.table.length?g.players.findIndex(x=>x.id===g.table[0].playerId):g.turnIndex;
  const order=turnOrder(g,leader),weight=winWeights(g,n);
  const playedBy=new Map<string,number[]>();
  for(const play of [...g.tricks.flatMap(t=>t.plays),...g.table])playedBy.set(play.playerId,[...(playedBy.get(play.playerId)||[]),strengthOf(play.card,trump)]);
  const visibleIds=new Set<string>();
  const seats=order.map((id):Seat=>{
    const player=g.players.find(x=>x.id===id)!,shown=v.players.find(x=>x.id===id)!;
    const known=(shown.hand||[]).filter((card):card is Card=>!!card);
    known.forEach(card=>visibleIds.add(card.id));
    const informative=player.id!==p.id&&player.bid!==undefined&&player.bot!=='easy';
    return{id,slots:shown.handCount-known.length,known:known.map(card=>strengthOf(card,trump)),played:playedBy.get(id)||[],bid:player.bid,sigma:informative?(player.bot?cfg.botSigma:cfg.humanSigma):0};
  });
  [...g.used,...g.table.map(item=>item.card)].forEach(card=>visibleIds.add(card.id));
  const pool=configuredDeck(g.settings).filter(card=>!visibleIds.has(card.id)).map(card=>strengthOf(card,trump));
  if(seats.reduce((sum,seat)=>sum+seat.slots,0)>pool.length)return undefined;
  const infinite=!!g.settings.modes?.infiniteLives;
  const cost=order.map(id=>{
    const player=g.players.find(x=>x.id===id)!;
    return Array.from({length:cards+1},(_,diff)=>{
      if(infinite)return diff;
      const lost=penaltyForRound(diff,player.missStreak,g.settings.penalty).lost;
      return lost+(lost>=player.lives?cfg.eliminationCost:0);
    });
  });
  const wins=order.map(id=>g.players.find(x=>x.id===id)!.wins);
  let tableBest=-1,tableWinner=-1;
  g.table.forEach((play,index)=>{const s=isJoker(play.card)?VALUES.indexOf(play.declaredValue!):strengthOf(play.card,trump);if(s>=tableBest){tableBest=s;tableWinner=index;}});
  return{cfg,seats,me:order.indexOf(p.id),n,cards,pool,wins,cost,weight,tableBest,tableWinner,tableCount:g.table.length};
}

const expectedWins=(ctx:Context,hand:number[])=>hand.reduce((sum,s)=>sum+weightOf(ctx.weight,s),0);

function sampleWorld(ctx:Context):number[][]{
  const pool=ctx.pool.slice(),hands=ctx.seats.map(seat=>seat.known.slice());
  const draw=(m:number)=>{for(let j=0;j<m;j++){const r=j+Math.floor(Math.random()*(pool.length-j));[pool[j],pool[r]]=[pool[r],pool[j]];}return pool.slice(0,m);};
  const targets=shuffleInPlace(ctx.seats.map((_,i)=>i).filter(i=>ctx.seats[i].slots>0));
  for(const i of targets){
    const seat=ctx.seats[i],m=seat.slots;
    if(!seat.sigma){hands[i].push(...draw(m));pool.splice(0,m);continue;}
    const base=expectedWins(ctx,seat.known)+expectedWins(ctx,seat.played);
    let chosen:number[]=[],total=0;
    for(let c=0;c<Math.max(1,ctx.cfg.candidates);c++){
      const candidate=draw(m),d=base+expectedWins(ctx,candidate)-seat.bid!,w=Math.exp(-d*d/(2*seat.sigma*seat.sigma));
      total+=w;
      if(Math.random()*total<=w)chosen=candidate;
    }
    for(const s of chosen){pool.splice(pool.indexOf(s),1);}
    hands[i].push(...chosen);
  }
  return hands;
}

// Política de rollout: cada jugador intenta cuadrar su predicción sin mirar
// las cartas de nadie. Devuelve la fuerza jugada y retira la carta de la mano.
function jokerWin(best:number,after:number){return best<0?TOP:best>TOP?-1:Math.min(TOP,best+(after>0&&best<TOP?1:0));}
function take(hand:number[],index:number){const s=hand[index];hand[index]=hand[hand.length-1];hand.pop();return s;}
function choose(hand:number[],remaining:number,best:number,after:number):number{
  const k=hand.length;
  if(k===1){
    const s=hand.pop()!;
    if(s!==JOKER)return s;
    if(remaining<=0)return 0;
    const declared=jokerWin(best,after);
    return declared<0?0:declared;
  }
  if(remaining<=0){
    let pick=-1,top=-1;
    for(let i=0;i<k;i++){const s=hand[i];if(s!==JOKER&&s<best&&s>top){top=s;pick=i;}}
    if(pick>=0)return take(hand,pick);
    const joker=hand.indexOf(JOKER);
    if(joker>=0&&best>0){take(hand,joker);return 0;}
    let low=0;
    for(let i=1;i<k;i++)if(hand[i]<hand[low])low=i;
    const s=take(hand,low);
    return s===JOKER?0:s;
  }
  const sorted=hand.slice().sort((a,b)=>b-a),threshold=remaining>=k?sorted[k-1]:sorted[remaining-1];
  let pick=-1,low=Infinity,jokerAt=-1;
  for(let i=0;i<k;i++){
    const s=hand[i];
    if(s===JOKER){jokerAt=i;continue;}
    if(s>=threshold&&s>=best&&s<low){low=s;pick=i;}
  }
  if(pick>=0)return take(hand,pick);
  if(jokerAt>=0){
    const declared=jokerWin(best,after);
    if(declared>=0){take(hand,jokerAt);return declared;}
  }
  if(remaining>=k){
    let lowest=0;
    for(let i=1;i<k;i++)if(hand[i]<hand[lowest])lowest=i;
    const s=take(hand,lowest);
    return s===JOKER?0:s;
  }
  let drop=-1,high=-1;
  for(let i=0;i<k;i++){const s=hand[i];if(s!==JOKER&&s<threshold&&s>high){high=s;drop=i;}}
  if(drop<0){drop=0;for(let i=1;i<k;i++)if(hand[i]<hand[drop])drop=i;}
  const s=take(hand,drop);
  return s===JOKER?0:s;
}

function playOut(hands:number[][],bids:number[],wins:number[],start:number,pos:number,best:number,winner:number){
  const n=hands.length;
  for(;;){
    for(let i=pos;i<n;i++){
      const seat=(start+i)%n,s=choose(hands[seat],bids[seat]-wins[seat],best,n-1-i);
      if(s>=best){best=s;winner=seat;}
    }
    wins[winner]++;
    if(!hands[winner].length)return;
    start=winner;pos=0;best=-1;winner=-1;
  }
}

function objective(ctx:Context,bids:number[],wins:number[]){
  let rivals=0;
  for(let i=0;i<ctx.n;i++)if(i!==ctx.me)rivals+=ctx.cost[i][Math.abs(bids[i]-wins[i])];
  return ctx.cost[ctx.me][Math.abs(bids[ctx.me]-wins[ctx.me])]-ctx.cfg.rivalWeight*rivals/Math.max(1,ctx.n-1);
}

function samplingLoop(run:(hands:number[][])=>void,ctx:Context){
  const started=performance.now();
  const {samples,maxMs}=ctx.cfg;
  for(let count=0;count<samples&&(count<Math.min(MIN_SAMPLES,samples)||performance.now()-started<maxMs);count++)run(sampleWorld(ctx));
}

export function chooseExpertBid(g:Game,p:Player,cfg:ExpertConfig=expertConfig):number|undefined{
  const choices=allowedBids(g);
  if(choices.length<2)return choices[0];
  const ctx=buildContext(g,p,'bid',cfg);
  if(!ctx)return undefined;
  const {me,n,cards}=ctx,totals=choices.map(()=>0);
  let count=0;
  samplingLoop(hands=>{
    count++;
    const natural=hands.map(hand=>Math.max(0,Math.min(cards,Math.round(expectedWins(ctx,hand)))));
    choices.forEach((choice,index)=>{
      const bids=ctx.seats.map((seat,i)=>i===me?choice:seat.bid!==undefined&&i<me?seat.bid:natural[i]);
      const last=n-1;
      if(me!==last){
        const sum=bids.reduce((a,b)=>a+b,0);
        if(sum===cards){
          const up=bids[last]+1<=cards,down=bids[last]-1>=0,wantsUp=expectedWins(ctx,hands[last])>=bids[last];
          bids[last]+=up&&(wantsUp||!down)?1:-1;
        }
      }
      const copy=hands.map(hand=>hand.slice()),wins=ctx.wins.slice();
      playOut(copy,bids,wins,0,0,-1,-1);
      totals[index]+=objective(ctx,bids,wins);
    });
  },ctx);
  const mean=totals.map(total=>total/Math.max(1,count));
  const expected=expectedWins(ctx,ctx.seats[me].known)+(ctx.seats[me].slots?ctx.seats[me].slots*(1/n):0);
  let best=0;
  for(let i=1;i<choices.length;i++){
    if(mean[i]<mean[best]-1e-9||Math.abs(mean[i]-mean[best])<=1e-9&&Math.abs(choices[i]-expected)<Math.abs(choices[best]-expected))best=i;
  }
  return choices[best];
}

function jokerDeclarations(best:number,tableCount:number){
  const values=new Set<number>([0,TOP]);
  if(tableCount===0){values.add(3);values.add(6);}
  else{for(const d of [best-1,best,best+1])if(d>=0&&d<=TOP)values.add(d);}
  return [...values];
}

export function chooseExpertPlay(g:Game,p:Player,cfg:ExpertConfig=expertConfig):ExpertOption|undefined{
  const ctx=buildContext(g,p,'play',cfg);
  if(!ctx)return undefined;
  const mine=(view(g,p.id).players.find(x=>x.id===p.id)?.hand||[]).filter((card):card is Card=>!!card);
  const options:{card:Card;value?:Value;strength:number;played:number}[]=[];
  for(const card of mine){
    const strength=strengthOf(card,g.trumpSuit);
    const plays=strength===JOKER?jokerDeclarations(ctx.tableBest,ctx.tableCount):[strength];
    for(const played of plays){
      if(options.some(o=>o.strength===strength&&o.played===played))continue;
      options.push({card,...(strength===JOKER?{value:VALUES[played]}:{}),strength,played});
    }
  }
  const format=(o:typeof options[number]):ExpertOption=>({card:o.card,...(o.value?{value:o.value}:{}),rank:o.played});
  if(options.length<2)return options.length?format(options[0]):undefined;
  const {me}=ctx,bids=ctx.seats.map(seat=>seat.bid??0),totals=options.map(()=>0);
  let count=0;
  samplingLoop(hands=>{
    count++;
    options.forEach((option,index)=>{
      const copy=hands.map(hand=>hand.slice()),wins=ctx.wins.slice(),mineHand=copy[me],at=mineHand.indexOf(option.strength);
      if(at<0)return;
      take(mineHand,at);
      let best=ctx.tableBest,winner=ctx.tableWinner;
      if(option.played>=best){best=option.played;winner=me;}
      playOut(copy,bids,wins,0,ctx.tableCount+1,best,winner);
      totals[index]+=objective(ctx,bids,wins);
    });
  },ctx);
  const need=bids[me]-ctx.wins[me],scores=totals.map((total,i)=>total/Math.max(1,count)+(need>0?1:-1)*options[i].played*1e-4);
  let best=0;
  for(let i=1;i<options.length;i++)if(scores[i]<scores[best])best=i;
  return format(options[best]);
}
