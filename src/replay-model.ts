import type {Card,Value} from '../shared/game';

export type ReplayEvent={sequence:number;type:string;player_id?:string|null;data:Record<string,any>;occurred_at:string};
export type ReplayPlayer={player_id:string;name:string;avatar:string;is_bot:boolean;bot_difficulty?:string|null;lives_start:number;lives_end:number};
export type ReplayData={game:{id:string;room_name:string;room_code:string;started_at:string;finished_at:string;winners:string[];settings:Record<string,any>};players:ReplayPlayer[];events:ReplayEvent[]};
export type ReplayPlay={playerId:string;card:Card;declaredValue?:Value;sequence:number};
export type ReplayScene={sequence:number;type:string;title:string;detail:string;at:string;roundIndex:number;wave:number;cards:number;trickIndex:number;order:string[];trumpSuit?:string;revealed:Record<string,string[]>;nextPlayerId?:string;table:ReplayPlay[];hands:Record<string,Card[]>;bids:Record<string,number>;wins:Record<string,number>;lives:Record<string,number>;winnerId?:string;reason?:string;results?:Array<{id:string;bid:number;wins:number;lives:number;livesBefore?:number;lost:number}>};

export function buildReplayTimeline(replay:ReplayData):ReplayScene[]{
  const scenes:ReplayScene[]=[];
  const name=(id?:string|null)=>replay.players.find(player=>player.player_id===id)?.name||'Jugador';
  let roundIndex=-1,wave=0,cards=0,trickIndex=0,trumpSuit:string|undefined;
  let order:string[]=[],table:ReplayPlay[]=[],hands:Record<string,Card[]>={},bids:Record<string,number>={},wins:Record<string,number>={},lives:Record<string,number>={},revealed:Record<string,string[]>={};
  for(const event of [...replay.events].sort((a,b)=>a.sequence-b.sequence)){
    const data=event.data||{};
    if(event.type==='round_started'){
      roundIndex=Number(data.roundIndex);
      wave=Number(data.wave)||0;
      cards=Number(data.cards)||0;
      trumpSuit=data.trumpSuit;
      trickIndex=0;
      order=Array.isArray(data.order)?[...data.order]:[];
      table=[];
      revealed={};
      hands=Object.fromEntries(replay.players.map(player=>[player.player_id,[...(data.hands?.[player.player_id]||[])]]));
      bids={};wins={};
      lives=Object.fromEntries(replay.players.map(player=>[player.player_id,Number(data.lives?.[player.player_id]??player.lives_start)]));
    }else if(roundIndex<0)continue;
    else if(event.type==='cards_exchanged'){
      const a=data.a as string,b=data.b as string,aCards=data.aCards as Card[],bCards=data.bCards as Card[];
      hands[a]=(hands[a]||[]).filter(card=>!aCards.some(c=>c.id===card.id)).concat(bCards);
      hands[b]=(hands[b]||[]).filter(card=>!bCards.some(c=>c.id===card.id)).concat(aCards);
    }else if(event.type==='cards_revealed'&&event.player_id){
      revealed[event.player_id]=(data.cards as Card[]).map(card=>card.id);
    }else if(event.type==='card_stolen'&&event.player_id){
      const a=event.player_id,b=data.from as string,gave=data.gave as Card,took=data.took as Card;
      hands[a]=(hands[a]||[]).map(card=>card.id===gave.id?took:card);
      hands[b]=(hands[b]||[]).map(card=>card.id===took.id?gave:card);
    }else if(event.type==='hands_reshuffled'){
      for(const [id,hand] of Object.entries(data.hands||{}))hands[id]=hand as Card[];
    }
    else if(event.type==='bid'&&event.player_id)bids[event.player_id]=Number(data.bid);
    else if(event.type==='card_played'&&event.player_id){
      const nextTrick=Number(data.trickIndex)||0;
      if(nextTrick!==trickIndex){table=[];trickIndex=nextTrick;}
      const card=data.card as Card;
      hands[event.player_id]=(hands[event.player_id]||[]).filter(item=>item.id!==card.id);
      table=[...table,{playerId:event.player_id,card,declaredValue:data.declaredValue,sequence:event.sequence}];
    }else if(event.type==='trick_won'){
      trickIndex=Number(data.trickIndex)||0;
      if(data.winnerId)wins[data.winnerId]=(wins[data.winnerId]||0)+1;
    }else if(event.type==='round_ended'){
      for(const result of data.result||[])lives[result.id]=Number(result.lives);
      table=[];
    }else if(!['game_finished','exchange_offered','exchange_selected','cards_revealed','cards_exchanged','card_stolen','hands_reshuffled'].includes(event.type))continue;
    const title=event.type==='round_started'?'Ronda '+(roundIndex+1)+': reparto'
      :event.type==='bid'?name(event.player_id)+' predice '+data.bid
      :event.type==='card_played'?name(event.player_id)+' juega '+(data.card?.value||'comodín')
      :event.type==='trick_won'?name(data.winnerId)+' gana la baza'
      :event.type==='round_ended'?'Resultado de la ronda':event.type==='exchange_offered'?name(event.player_id)+' ofrece un cambio':event.type==='exchange_selected'?name(event.player_id)+' elige cartas':event.type==='cards_revealed'?name(event.player_id)+' enseña cartas':event.type==='cards_exchanged'?'Cartas intercambiadas':event.type==='card_stolen'?name(event.player_id)+' roba una carta':event.type==='hands_reshuffled'?'Manos redistribuidas':'Resultado final';
    const detail=event.type==='round_started'?cards+' '+(cards===1?'carta':'cartas')+' por jugador'
      :event.type==='bid'?'Predicción '+(data.position||Object.keys(bids).length)+' de '+order.length
      :event.type==='card_played'?'Baza '+(trickIndex+1)+' · carta '+table.length+' de '+order.length
      :event.type==='trick_won'?String(data.reason||'Baza '+(trickIndex+1)+' completada')
      :event.type==='round_ended'?'Vidas y penalizaciones aplicadas'
      :event.type==='exchange_offered'?'Oferta para '+name(data.to)
      :event.type==='exchange_selected'?'Esperando la elección de la pareja'
      :event.type==='cards_revealed'?'Cartas visibles antes de predecir'
      :event.type==='cards_exchanged'?name(data.a)+' y '+name(data.b)+' cambian cartas'
      :event.type==='card_stolen'?'Carta robada a '+name(data.from)
      :event.type==='hands_reshuffled'?'Cartas restantes mezcladas de nuevo'
      :data.reason==='cancelled'?'Partida cancelada':'Partida terminada';
    scenes.push({sequence:event.sequence,type:event.type,title,detail,at:event.occurred_at,roundIndex,wave,cards,trickIndex,trumpSuit,revealed:Object.fromEntries(Object.entries(revealed).map(([id,cards])=>[id,[...cards]])),order:[...order],table:[...table],hands:Object.fromEntries(Object.entries(hands).map(([id,hand])=>[id,[...hand]])),bids:{...bids},wins:{...wins},lives:{...lives},winnerId:event.type==='trick_won'?data.winnerId:undefined,reason:event.type==='trick_won'?data.reason:undefined,results:event.type==='round_ended'?data.result:undefined});
  }
  const actorBySequence=new Map(replay.events.map(event=>[event.sequence,event.player_id]));
  for(let index=0;index<scenes.length;index++){
    const next=scenes[index+1];
    if(next?.roundIndex===scenes[index].roundIndex&&['bid','card_played'].includes(next.type))scenes[index].nextPlayerId=actorBySequence.get(next.sequence)||undefined;
  }
  return scenes;
}
