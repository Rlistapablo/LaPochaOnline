import {Game,Player,VALUES,Value,Card,allowedBids,bid,play,view,isJoker,rank,makeDeck,active} from '../shared/game.js';

type Option={card:Card;value?:Value;rank:number};
const cardRank=(card:Card)=>isJoker(card)?VALUES.length-1:VALUES.indexOf(card.value!);

// Solo utiliza información que el jugador podría conocer. En la ronda de una
// carta oculta, las cartas visibles de los rivales se excluyen del mazo posible.
function unseen(g:Game,p:Player){
  const visible=view(g,p.id).players.flatMap(player=>(player.hand||[]).filter((card):card is Card=>!!card));
  const seen=new Set([...visible,...g.used,...g.table.map(item=>item.card)].map(card=>card.id));
  return makeDeck().filter(card=>!seen.has(card.id));
}

function chanceToWin(r:number,unknown:Card[],before:number,after:number,tableRank=-1){
  if(r<tableRank)return 0;
  if(!before&&!after)return 1;
  const total=Math.max(1,unknown.length);
  const safeBefore=unknown.filter(card=>!isJoker(card)&&cardRank(card)<=r).length/total;
  const safeAfter=unknown.filter(card=>!isJoker(card)&&cardRank(card)<r).length/total;
  return Math.pow(safeBefore,before)*Math.pow(safeAfter,after);
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
    for(const player of order){const card=player.id===p.id?candidate:known.get(player.id)!;const strength=cardRank(card);if(strength>=best){best=strength;winner=player.id;}}
    return winner===p.id;
  }).length;
  return wins/Math.max(1,unknown.length);
}

export function chooseBotBid(g:Game,p:Player){
  const hand=view(g,p.id).players.find(player=>player.id===p.id)?.hand||[];
  const choices=allowedBids(g);
  if(p.bot==='easy')return choices[Math.floor(Math.random()*choices.length)];
  const n=active(g).length;
  if(p.bot==='normal'){
    const estimate=hand.reduce((sum,card)=>sum+(card?isJoker(card)?0.85:Math.pow((cardRank(card)+1)/10,n-1):1/n),0);
    return choices.reduce((best,choice)=>Math.abs(choice-estimate)<Math.abs(best-estimate)?choice:best,choices[0]);
  }
  const unknown=unseen(g,p),leadOrder=Array.from({length:g.players.length},(_,offset)=>g.players[(g.firstIndex+offset)%g.players.length]).filter(player=>!player.eliminated),before=leadOrder.findIndex(player=>player.id===p.id),after=n-1-before;
  const chances=hand.map(card=>card?chanceToWin(cardRank(card),unknown,before,after):hiddenOneCardChance(g,p));
  const probabilities=winDistribution(chances);
  const expected=chances.reduce((sum,chance)=>sum+chance,0);
  return choices.reduce((best,choice)=>{
    const score=(probabilities[choice]||0)-0.01*Math.abs(choice-expected);
    const bestScore=(probabilities[best]||0)-0.01*Math.abs(best-expected);
    return score>bestScore?choice:best;
  },choices[0]);
}

function optionsFor(hand:Card[]):Option[]{
  return hand.flatMap(card=>isJoker(card)?VALUES.map(value=>({card,value,rank:VALUES.indexOf(value)})):[{card,rank:cardRank(card)}]);
}

function expectedError(probabilities:number[],need:number){return probabilities.reduce((sum,probability,wins)=>sum+probability*Math.abs(need-wins),0);}

export function chooseBotPlay(g:Game,p:Player){
  const visible=view(g,p.id),hand=(visible.players.find(player=>player.id===p.id)?.hand||[]).filter((card):card is Card=>!!card);
  const options=optionsFor(hand),need=(p.bid??0)-p.wins;
  if(p.bot==='easy')return options[Math.floor(Math.random()*options.length)];
  const tableRank=visible.table.length?Math.max(...visible.table.map(rank)):-1;
  const after=active(g).length-visible.table.length-1;
  if(p.bot==='normal'){
    const target=Math.max(0,Math.min(1,need/Math.max(1,hand.length)));
    return options.reduce((best,option)=>{
      const chance=option.rank<tableRank?0:after?Math.pow(option.rank/10,after):1;
      const bestChance=best.rank<tableRank?0:after?Math.pow(best.rank/10,after):1;
      const score=Math.abs(chance-target)+(need>0?option.rank:-option.rank)*0.001;
      const bestScore=Math.abs(bestChance-target)+(need>0?best.rank:-best.rank)*0.001;
      return score<bestScore?option:best;
    },options[0]);
  }
  const unknown=unseen(g,p);
  const scored=options.map(option=>{
    const chance=chanceToWin(option.rank,unknown,0,after,tableRank);
    const future=hand.filter(card=>card.id!==option.card.id).map(card=>chanceToWin(cardRank(card),unknown,0,active(g).length-1));
    const futureDistribution=winDistribution(future);
    const exact=chance*(futureDistribution[need-1]||0)+(1-chance)*(futureDistribution[need]||0);
    const error=chance*expectedError(futureDistribution,need-1)+(1-chance)*expectedError(futureDistribution,need);
    const waste=need>0?option.rank:-option.rank;
    return{option,score:exact*3-error*0.2-waste*0.001};
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].option;
}

export function runBotTurn(g:Game){
  if(g.phase!=='bid'&&g.phase!=='play')return false;
  const p=g.players[g.turnIndex];if(!p.bot)return false;
  if(g.phase==='bid')bid(g,p.id,chooseBotBid(g,p),g.version);
  else{const choice=chooseBotPlay(g,p);play(g,p.id,choice.card.id,choice.value,g.version);}
  return true;
}
export function runBots(g:Game){let guard=0;while(guard++<1000&&runBotTurn(g)){}if(guard>=1000)throw Error('Bucle de bots');}
