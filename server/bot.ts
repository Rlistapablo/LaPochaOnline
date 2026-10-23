import {Game,Player,VALUES,Value,Card,allowedBids,bid,play,view,isJoker,rank,configuredDeck,active,offerExchange,declineExchange,selectExchange,selectReveal,preparationActor,stealCard,reshuffleHands,turnOrder} from '../shared/game.js';
import {chooseExpertBid,chooseExpertPlay,expertConfig,hardConfig} from './montecarlo.js';

type Option={card:Card;value?:Value;rank:number};
const cardRank=(card:Card,trump?:Card['suit'])=>isJoker(card)?VALUES.length-1:(card.suit===trump?VALUES.length:0)+VALUES.indexOf(card.value!);
const strength=(card:Card,trump?:Card['suit'])=>cardRank(card,trump);

// Solo utiliza información que el jugador podría conocer. En la ronda de una
// carta oculta, las cartas visibles de los rivales se excluyen del mazo posible.
function unseen(g:Game,p:Player){
  const visible=view(g,p.id).players.flatMap(player=>(player.hand||[]).filter((card):card is Card=>!!card));
  const seen=new Set([...visible,...g.used,...g.table.map(item=>item.card)].map(card=>card.id));
  return configuredDeck(g.settings).filter(card=>!seen.has(card.id));
}

function chanceToWin(r:number,unknown:Card[],before:number,after:number,tableRank=-1,trump?:Card['suit']){
  if(r<tableRank)return 0;
  if(!before&&!after)return 1;
  const total=Math.max(1,unknown.length);
  const safeBefore=unknown.filter(card=>strength(card,trump)<=r).length/total;
  const safeAfter=unknown.filter(card=>strength(card,trump)<r).length/total;
  return Math.pow(safeBefore,before)*Math.pow(safeAfter,after);
}

// A known rival card counts exactly. For a partly revealed hand, the remaining
// slots are sampled from cards the bot has not seen, never from the real hand.
function opponentSafe(g:Game,viewer:Player,opponentId:string,r:number,actsBefore:boolean,unknown:Card[]){
  const rival=view(g,viewer.id).players.find(player=>player.id===opponentId);
  if(!rival||!rival.handCount)return 1;
  const known=(rival.hand||[]).filter((card):card is Card=>!!card);
  const safe=(card:Card)=>actsBefore?strength(card,g.trumpSuit)<=r:strength(card,g.trumpSuit)<r;
  const unknownSafe=unknown.length?unknown.filter(safe).length/unknown.length:0.5;
  if(!known.length)return unknownSafe;
  const knownSafe=known.filter(safe).length/known.length;
  return (knownSafe*known.length+unknownSafe*(rival.handCount-known.length))/rival.handCount;
}

function publicChance(g:Game,p:Player,r:number,unknown:Card[],opponents:string[],before:number,tableRank=-1){
  if(r<tableRank)return 0;
  return opponents.reduce((chance,id,index)=>chance*opponentSafe(g,p,id,r,index<before,unknown),1);
}

function winDistribution(chances:number[]){
  let probabilities=[1];
  for(const chance of chances){
    const next=Array(probabilities.length+1).fill(0) as number[];
    probabilities.forEach((probability,wins)=>{next[wins]+=probability*(1-chance);next[wins+1]+=probability*chance;});
    probabilities=next;
  }
  return probabilities;
}

function hiddenOneCardChance(g:Game,p:Player){
  const visible=view(g,p.id),unknown=unseen(g,p),order=Array.from({length:g.players.length},(_,offset)=>g.players[(g.firstIndex+offset)%g.players.length]).filter(player=>!player.eliminated);
  const known=new Map(visible.players.filter(player=>player.id!==p.id&&player.hand?.[0]).map(player=>[player.id,player.hand![0] as Card]));
  if(known.size!==order.length-1)return 1/order.length;
  const wins=unknown.filter(candidate=>{
    let best=-1,winner='';
    for(const player of order){const card=player.id===p.id?candidate:known.get(player.id)!;const strength=cardRank(card,g.trumpSuit);if(strength>=best){best=strength;winner=player.id;}}
    return winner===p.id;
  }).length;
  return wins/Math.max(1,unknown.length);
}

export function chooseBotBid(g:Game,p:Player){
  const hand=view(g,p.id).players.find(player=>player.id===p.id)?.hand||[];
  const choices=allowedBids(g);
  if(p.bot==='easy')return choices[Math.floor(Math.random()*choices.length)];
  if(p.bot==='expert'||p.bot==='hard'){const choice=chooseExpertBid(g,p,p.bot==='expert'?expertConfig:hardConfig);if(choice!==undefined)return choice;}
  const n=active(g).length;
  if(p.bot==='normal'){
    const unknown=unseen(g,p),order=turnOrder(g),position=order.indexOf(p.id),opponents=order.filter(id=>id!==p.id);
    const estimate=hand.reduce((sum,card)=>sum+(card?publicChance(g,p,cardRank(card,g.trumpSuit),unknown,opponents,position):1/n),0);
    return choices.reduce((best,choice)=>Math.abs(choice-estimate)<Math.abs(best-estimate)?choice:best,choices[0]);
  }
  const unknown=unseen(g,p),order=turnOrder(g),position=order.indexOf(p.id),opponents=order.filter(id=>id!==p.id);
  const chances=hand.map(card=>card?publicChance(g,p,cardRank(card,g.trumpSuit),unknown,opponents,position):hiddenOneCardChance(g,p));
  const probabilities=winDistribution(chances);
  const expected=chances.reduce((sum,chance)=>sum+chance,0);
  return choices.reduce((best,choice)=>{
    const score=(probabilities[choice]||0)-0.01*Math.abs(choice-expected);
    const bestScore=(probabilities[best]||0)-0.01*Math.abs(best-expected);
    return score>bestScore?choice:best;
  },choices[0]);
}

function optionsFor(hand:Card[],trump?:Card['suit']):Option[]{
  return hand.flatMap(card=>isJoker(card)?VALUES.map(value=>({card,value,rank:VALUES.indexOf(value)})):[{card,rank:cardRank(card,trump)}]);
}

function expectedError(probabilities:number[],need:number){return probabilities.reduce((sum,probability,wins)=>sum+probability*Math.abs(need-wins),0);}

export function chooseBotPlay(g:Game,p:Player){
  const visible=view(g,p.id),hand=(visible.players.find(player=>player.id===p.id)?.hand||[]).filter((card):card is Card=>!!card);
  const options=optionsFor(hand,g.trumpSuit),need=(p.bid??0)-p.wins;
  if(p.bot==='easy')return options[Math.floor(Math.random()*options.length)];
  if(p.bot==='expert'||p.bot==='hard'){const choice=chooseExpertPlay(g,p,p.bot==='expert'?expertConfig:hardConfig);if(choice)return choice;}
  const tableRank=visible.table.length?Math.max(...visible.table.map(item=>isJoker(item.card)?rank(item):cardRank(item.card,g.trumpSuit))):-1;
  const remaining=turnOrder(g,visible.table.length?g.players.findIndex(player=>player.id===visible.table[0].playerId):g.turnIndex).slice(visible.table.length+1);
  const unknown=unseen(g,p);
  if(p.bot==='normal'){
    const target=Math.max(0,Math.min(1,need/Math.max(1,hand.length)));
    return options.reduce((best,option)=>{
      const chance=publicChance(g,p,option.rank,unknown,remaining,0,tableRank);
      const bestChance=publicChance(g,p,best.rank,unknown,remaining,0,tableRank);
      const score=Math.abs(chance-target)+(need>0?option.rank:-option.rank)*0.001;
      const bestScore=Math.abs(bestChance-target)+(need>0?best.rank:-best.rank)*0.001;
      return score<bestScore?option:best;
    },options[0]);
  }
  const scored=options.map(option=>{
    const chance=publicChance(g,p,option.rank,unknown,remaining,0,tableRank);
    const future=hand.filter(card=>card.id!==option.card.id).map(card=>chanceToWin(cardRank(card,g.trumpSuit),unknown,0,active(g).length-1,-1,g.trumpSuit));
    const futureDistribution=winDistribution(future);
    const exact=chance*(futureDistribution[need-1]||0)+(1-chance)*(futureDistribution[need]||0);
    const error=chance*expectedError(futureDistribution,need-1)+(1-chance)*expectedError(futureDistribution,need);
    const waste=need>0?option.rank:-option.rank;
    return{option,score:exact*3-error*0.2-waste*0.001};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].option;
}

function lowCards(g:Game,p:Player,count:number){
  const unknown=unseen(g,p),order=turnOrder(g),position=order.indexOf(p.id),opponents=order.filter(id=>id!==p.id);
  return [...p.hand].sort((a,b)=>publicChance(g,p,strength(a,g.trumpSuit),unknown,opponents,position)-publicChance(g,p,strength(b,g.trumpSuit),unknown,opponents,position)).slice(0,count).map(card=>card.id);
}

function chooseExchangeTarget(g:Game,p:Player){
  const others=active(g).filter(other=>other.id!==p.id);
  if(p.bot==='easy')return others[Math.floor(Math.random()*others.length)];
  // Public standing breaks ties without consulting anyone's private cards.
  return [...others].sort((a,b)=>(b.wins-(b.bid??0))-(a.wins-(a.bid??0))||b.lives-a.lives)[0];
}

function shouldDeclineExchange(g:Game,p:Player){
  if(p.bot==='easy')return Math.random()<0.2;
  const unknown=unseen(g,p),own=p.hand.map(card=>strength(card,g.trumpSuit));
  if(!unknown.length||!own.length)return false;
  const possible=unknown.map(card=>strength(card,g.trumpSuit));
  if(new Set([...own,...possible]).size===1)return true;
  const average=possible.reduce((sum,value)=>sum+value,0)/possible.length;
  return Math.min(...own)>average+2.5;
}

function shouldReshuffle(g:Game,p:Player){
  if(!p.reshuffles||p.hand.length<1||active(g).filter(other=>other.hand.length).length<2)return false;
  const own=view(g,p.id).players.find(player=>player.id===p.id)?.hand||[];
  if(own.some(card=>!card))return false;
  const unknown=unseen(g,p),order=turnOrder(g),position=order.indexOf(p.id),others=order.filter(id=>id!==p.id);
  if(new Set([...own.filter((card):card is Card=>!!card),...unknown].map(card=>strength(card,g.trumpSuit))).size<2)return false;
  const forecast=own.reduce((sum,card)=>sum+publicChance(g,p,strength(card!,g.trumpSuit),unknown,others,position),0);
  const need=g.phase==='play'?(p.bid??0)-p.wins:Math.max(1,Math.round(own.length/active(g).length));
  if(g.phase==='play'&&need<=0)return false;
  return forecast+0.35<need;
}

function shouldSteal(g:Game,p:Player,target?:Player){
  if(!p.steals||!p.hand.length||!target)return false;
  const visible=view(g,p.id),own=visible.players.find(player=>player.id===p.id)?.hand||[];
  if(own.some(card=>!card))return false;
  if(g.phase==='play'&&(p.bid??0)<=p.wins)return false;
  const unknown=unseen(g,p);
  const weakest=Math.min(...own.map(card=>strength(card!,g.trumpSuit)));
  const rival=visible.players.find(player=>player.id===target.id)!,shown=(rival.hand||[]).filter((card):card is Card=>!!card);
  const unknownAverage=unknown.length?unknown.reduce((sum,card)=>sum+strength(card,g.trumpSuit),0)/unknown.length:0;
  const replacement=(shown.reduce((sum,card)=>sum+strength(card,g.trumpSuit),0)+unknownAverage*(rival.handCount-shown.length))/rival.handCount;
  return replacement-weakest>2.5;
}

function specialTarget(g:Game,p:Player){
  const others=active(g).filter(other=>other.id!==p.id&&other.hand.length);
  const visible=view(g,p.id).players;
  return [...others].sort((a,b)=>{
    const score=(other:Player)=>{
      const shown=visible.find(v=>v.id===other.id)?.hand?.filter((card):card is Card=>!!card)||[];
      return shown.length?shown.reduce((sum,card)=>sum+strength(card,g.trumpSuit),0)/shown.length:other.wins*2+(other.bid??0);
    };
    return score(b)-score(a);
  })[0];
}

export function runBotTurn(g:Game){
  if(g.phase==='exchange'||g.phase==='reveal'){
    const p=preparationActor(g);if(!p?.bot)return false;
    if(g.phase==='exchange'){
      const pair=g.exchangePairs?.[0];
      if(!pair?.b){
        if(shouldDeclineExchange(g,p))declineExchange(g,p.id);
        else offerExchange(g,p.id,chooseExchangeTarget(g,p).id);
      }
      else if(pair.b===p.id&&shouldDeclineExchange(g,p))declineExchange(g,p.id);
      else selectExchange(g,p.id,p.bot==='easy'?[...p.hand].sort(()=>Math.random()-0.5).slice(0,Math.min(g.settings.modes?.exchangeCount||1,g.cardsPerPlayer)).map(c=>c.id):lowCards(g,p,Math.min(g.settings.modes?.exchangeCount||1,g.cardsPerPlayer)));
    }else selectReveal(g,p.id,p.bot==='easy'?[...p.hand].sort(()=>Math.random()-0.5).slice(0,Math.ceil(g.cardsPerPlayer*(g.settings.modes?.revealPercent||0)/100)).map(c=>c.id):lowCards(g,p,Math.ceil(g.cardsPerPlayer*(g.settings.modes?.revealPercent||0)/100)));
    return true;
  }
  if(g.phase!=='bid'&&g.phase!=='play')return false;
  const p=g.players[g.turnIndex];if(!p.bot)return false;
  if((p.bot==='easy'?!!p.reshuffles&&Math.random()<0.3:shouldReshuffle(g,p))){const target=specialTarget(g,p);if(target&&p.hand.length){reshuffleHands(g,p.id,[p.id,target.id]);return true;}}
  const stealTarget=specialTarget(g,p);
  if((p.bot==='easy'?!!p.steals&&Math.random()<0.3:shouldSteal(g,p,stealTarget))){const own=view(g,p.id).players.find(player=>player.id===p.id)?.hand||[];if(stealTarget&&own.some(Boolean)){stealCard(g,p.id,stealTarget.id,p.bot==='easy'?p.hand[Math.floor(Math.random()*p.hand.length)].id:lowCards(g,p,1)[0]);return true;}}
  if(g.phase==='bid')bid(g,p.id,chooseBotBid(g,p),g.version);
  else{const choice=chooseBotPlay(g,p);play(g,p.id,choice.card.id,choice.value,g.version);}
  return true;
}
export function runBots(g:Game){let guard=0;while(guard++<1000&&runBotTurn(g)){}if(guard>=1000)throw Error('Bucle de bots');}
