export const VALUES = ['2','4','5','6','7','Sota','Caballo','Rey','3','As'] as const;
export const SUITS = ['Oros','Copas','Espadas','Bastos'] as const;
export type Value = typeof VALUES[number];
export type Card = { id: string; suit?: typeof SUITS[number]; value?: Value };
export type Play = { playerId: string; card: Card; declaredValue?: Value; playedAt?: string };
export type Player = { id: string; name: string; avatar: string; bot?: 'easy'|'normal'|'hard'; lives: number; connected: boolean; ready: boolean; hand: Card[]; bid?: number; wins: number; eliminated: boolean; missStreak: number };
export type Settings = { name: string; private: boolean; maxPlayers: number; maxCards: number; jokerCount?: number; lives: 3|5; penalty: 'normal'|'progressive'; oneCard: 'hidden'|'visible'|'alternate'; bots: number; difficulty: 'easy'|'normal'|'hard'; turnSeconds: number; sounds: boolean };
export type TrickRecord = { plays: Play[]; winnerId: string; reason?: string; finishedAt?: string };
export type RoundResult = { id: string; name: string; bid: number; wins: number; difference: number; streak: number; multiplier: number; lost: number; lives: number; livesBefore?: number };
export type RoundRecord = { round: number; roundIndex: number; wave?: number; result: RoundResult[]; tricks: TrickRecord[]; order?: string[]; hands?: Record<string,Card[]>; startedAt?: string; finishedAt?: string };
export type GameEvent = { sequence: number; type: string; playerId?: string; data: Record<string,unknown>; at: string };
export type Game = { code: string; hostId: string; settings: Settings; players: Player[]; bannedIds: string[]; phase: 'lobby'|'bid'|'play'|'roundEnd'|'finished'; version: number; cycle: number; wave?: number; roundIndex: number; roundStep?: number; schedule: number[]; cardsPerPlayer: number; firstIndex: number; turnIndex: number; bidCount: number; deck: Card[]; table: Play[]; used: Card[]; tricks: TrickRecord[]; lastTrick?: TrickRecord; revealUntil?: number; autoRestart: boolean; autoRestartAt?: number; endReason?: 'manual'|'elimination'|'cycle'|'cancelled'; roundResult?: RoundResult[]; winners: string[]; history: RoundRecord[]; roundHands?: Record<string,Card[]>; roundStartedAt?: string; eventSeq?: number; pendingEvents?: GameEvent[]; pendingOperations?: string[]; startedAt?: string; finishedAt?: string; updatedAt: string };

export function jokerCount(settings:Settings){return settings.jokerCount===undefined?2:settings.jokerCount;}
export function makeDeck(jokers=2): Card[] { if(!Number.isInteger(jokers)||jokers<0||jokers>20)throw Error('Número de comodines inválido');return [...SUITS.flatMap(suit => VALUES.map(value => ({ id: `${suit}_${value}`, suit, value }))),...Array.from({length:jokers},(_,i)=>({id:`joker_${i+1}`}))]; }
export function shuffle(cards: Card[]): Card[] { const a = [...cards]; for(let i=a.length-1;i>0;i--){ const range=i+1,limit=Math.floor(0x100000000/range)*range,b=new Uint32Array(1);do{crypto.getRandomValues(b);}while(b[0]>=limit);const j=b[0]%range;[a[i],a[j]]=[a[j],a[i]]; } return a; }
export function schedule(max: number): number[] { return [...Array.from({length:max},(_,i)=>max-i), ...Array.from({length:max-1},(_,i)=>i+2)]; }
function randomIndex(max:number){const limit=Math.floor(0x100000000/max)*max,b=new Uint32Array(1);do{crypto.getRandomValues(b);}while(b[0]>=limit);return b[0]%max;}
export function recordEvent(g:Game,type:string,data:Record<string,unknown>,playerId?:string){g.pendingEvents??=[];g.eventSeq??=0;g.pendingEvents.push({sequence:++g.eventSeq,type,playerId,data,at:new Date().toISOString()});}
export function active(g: Game): Player[] { return g.players.filter(p=>!p.eliminated); }
export function isJoker(c: Card) { return /^joker_[1-9]\d*$/.test(c.id); }
export function rank(p: Play): number { const v = p.declaredValue ?? p.card.value; if(!v) throw Error('Valor de comodín ausente'); return VALUES.indexOf(v); }
export function trickWinner(plays: Play[]): string { if(!plays.length) throw Error('Baza vacía'); return plays.reduce((best,p)=>rank(p)>=rank(best)?p:best).playerId; }
export function penaltyForRound(difference:number,previousStreak:number,mode:Settings['penalty']){if(!Number.isInteger(difference)||difference<0||!Number.isInteger(previousStreak)||previousStreak<0)throw Error('Penalización inválida');const streak=difference?previousStreak+1:0;const multiplier=difference&&mode==='progressive'?streak:1;return{streak,multiplier,lost:difference*multiplier};}
export function assertIntegrity(g: Game) {
  if(g.phase==='lobby') return;
  const cards=[...g.deck,...g.players.flatMap(p=>p.hand),...g.table.map(p=>p.card),...g.used], expected=makeDeck(jokerCount(g.settings));
  const ids=cards.map(c=>c.id),valid=new Set(expected.map(c=>c.id)); if(ids.length!==expected.length || new Set(ids).size!==expected.length || ids.some(id=>!valid.has(id))) throw Error('Integridad de baraja rota');
  if(g.players.some(p=>p.lives<0 || p.wins<0)) throw Error('Estado de jugador inválido');
}
export function createGame(code: string, host: Omit<Player,'lives'|'ready'|'hand'|'wins'|'eliminated'|'missStreak'>, settings: Settings): Game {
  return { code,hostId:host.id,settings,players:[{...host,lives:settings.lives,ready:false,hand:[],wins:0,eliminated:false,missStreak:0}],bannedIds:[],phase:'lobby',version:0,cycle:0,wave:0,roundIndex:0,roundStep:0,schedule:[],cardsPerPlayer:0,firstIndex:0,turnIndex:0,bidCount:0,deck:[],table:[],used:[],tricks:[],autoRestart:false,winners:[],history:[],roundHands:{},eventSeq:0,pendingEvents:[],pendingOperations:[],updatedAt:new Date().toISOString() };
}
export function addPlayer(g: Game,p: Omit<Player,'lives'|'ready'|'hand'|'wins'|'eliminated'|'missStreak'>) { if(g.phase!=='lobby'||g.players.length>=g.settings.maxPlayers||g.players.some(x=>x.id===p.id)) throw Error('No se puede unir'); g.players.push({...p,lives:g.settings.lives,ready:!!p.bot,hand:[],wins:0,eliminated:false,missStreak:0}); g.version++; }
function nextActive(g: Game, from: number) { for(let n=1;n<=g.players.length;n++){const i=(from+n)%g.players.length;if(!g.players[i].eliminated)return i;} throw Error('Sin jugadores activos'); }
export function current(g: Game): Player { return g.players[g.turnIndex]; }
export function turnOrder(g:Game,first=g.firstIndex):string[]{return Array.from({length:g.players.length},(_,offset)=>g.players[(first+offset)%g.players.length]).filter(p=>!p.eliminated).map(p=>p.id);}
export function oneCardMode(g: Game) { return g.settings.oneCard==='alternate'?(g.cycle%2===0?'hidden':'visible'):g.settings.oneCard; }
function maxDeal(g:Game){return Math.min(g.settings.maxCards,Math.floor((40+jokerCount(g.settings))/active(g).length));}
export function start(g: Game) { if(g.phase!=='lobby'||active(g).length<2)throw Error('Se necesitan dos jugadores'); const cap=maxDeal(g); if(cap<1)throw Error('Reparto imposible'); g.schedule=schedule(cap);g.roundIndex=0;g.roundStep=0;g.wave=0;g.firstIndex=randomIndex(g.players.length);g.startedAt=new Date().toISOString();g.finishedAt=undefined;recordEvent(g,'game_started',{settings:g.settings,firstPlayerId:g.players[g.firstIndex].id});deal(g); }
export function rematch(g:Game){if(g.phase!=='finished')throw Error('Partida en curso');g.cycle++;g.phase='lobby';g.roundIndex=0;g.roundStep=0;g.wave=0;g.schedule=[];g.cardsPerPlayer=0;g.deck=[];g.table=[];g.used=[];g.tricks=[];g.lastTrick=undefined;g.revealUntil=undefined;g.autoRestart=false;g.autoRestartAt=undefined;g.endReason=undefined;g.roundResult=undefined;g.winners=[];g.history=[];g.roundHands={};g.roundStartedAt=undefined;g.eventSeq=0;g.pendingEvents=[];g.pendingOperations=[];g.startedAt=undefined;g.finishedAt=undefined;for(const p of g.players){p.lives=g.settings.lives;p.eliminated=false;p.hand=[];p.bid=undefined;p.wins=0;p.missStreak=0;p.ready=!!p.bot;}g.version++;}
function deal(g: Game) { const n=active(g).length;g.cardsPerPlayer=g.schedule[g.roundStep??0];if(g.cardsPerPlayer>Math.floor((40+jokerCount(g.settings))/n))throw Error('Reparto imposible');g.deck=shuffle(makeDeck(jokerCount(g.settings)));g.table=[];g.used=[];g.tricks=[];g.lastTrick=undefined;g.revealUntil=undefined;g.roundResult=undefined;g.bidCount=0;for(const p of g.players){p.hand=[];p.wins=0;p.bid=undefined;} for(let i=0;i<g.cardsPerPlayer;i++)for(const p of active(g))p.hand.push(g.deck.pop()!);g.roundHands=Object.fromEntries(active(g).map(p=>[p.id,[...p.hand]]));g.roundStartedAt=new Date().toISOString();if(g.players[g.firstIndex].eliminated)g.firstIndex=nextActive(g,g.firstIndex);g.turnIndex=g.firstIndex;g.phase='bid';g.version++;recordEvent(g,'round_started',{roundIndex:g.roundIndex,wave:g.wave,cards:g.cardsPerPlayer,order:turnOrder(g),hands:g.roundHands,lives:Object.fromEntries(active(g).map(p=>[p.id,p.lives]))});assertIntegrity(g); }
export function allowedBids(g: Game): number[] { if(g.phase!=='bid')return [];const sum=g.players.reduce((s,p)=>s+(p.bid??0),0);return Array.from({length:g.cardsPerPlayer+1},(_,i)=>i).filter(i=>g.bidCount!==active(g).length-1||sum+i!==g.cardsPerPlayer); }
export function bid(g: Game,id: string,n: number,version: number) { if(version!==g.version||g.phase!=='bid'||current(g).id!==id||!allowedBids(g).includes(n))throw Error('Predicción inválida o desactualizada');current(g).bid=n;recordEvent(g,'bid',{roundIndex:g.roundIndex,bid:n,position:g.bidCount+1},id);g.bidCount++; if(g.bidCount===active(g).length){g.phase='play';g.turnIndex=g.firstIndex;}else g.turnIndex=nextActive(g,g.turnIndex);g.version++;assertIntegrity(g); }
export function play(g: Game,id: string,cardId: string,declaredValue: Value|undefined,version: number) {
  if(version!==g.version||g.phase!=='play'||current(g).id!==id)throw Error('Turno inválido o desactualizado');
  const p=current(g),idx=p.hand.findIndex(c=>c.id===cardId);
  if(idx<0)throw Error('Carta inexistente');
  const c=p.hand[idx];
  if(isJoker(c)?!declaredValue||!VALUES.includes(declaredValue):declaredValue!==undefined)throw Error('Valor de comodín inválido');
  p.hand.splice(idx,1);
  g.table.push({playerId:id,card:c,...(declaredValue?{declaredValue}:{}),playedAt:new Date().toISOString()});
  recordEvent(g,'card_played',{roundIndex:g.roundIndex,trickIndex:g.tricks.length,playIndex:g.table.length-1,card:c,declaredValue},id);
  if(g.table.length===active(g).length){
    const winnerId=trickWinner(g.table),winner=g.players.find(x=>x.id===winnerId)!,winningPlay=g.table.findLast(x=>x.playerId===winnerId)!,tied=g.table.filter(x=>rank(x)===rank(winningPlay)),earlier=tied.at(-2);
    winner.wins++;
    const cardName=isJoker(winningPlay.card)?`comodín como ${winningPlay.declaredValue}`:`${winningPlay.card.value} de ${winningPlay.card.suit}`;
    g.lastTrick={plays:[...g.table],winnerId,reason:earlier?`${winner.name} gana con ${cardName}: jugó después que ${g.players.find(x=>x.id===earlier.playerId)?.name}.`:`${winner.name} gana con ${cardName}.`,finishedAt:new Date().toISOString()};
    g.tricks.push(g.lastTrick);
    recordEvent(g,'trick_won',{roundIndex:g.roundIndex,trickIndex:g.tricks.length-1,winnerId,winningCard:winningPlay.card,reason:g.lastTrick.reason},winnerId);
    g.used.push(...g.table.map(x=>x.card));g.table=[];g.turnIndex=g.players.findIndex(x=>x.id===winnerId);
    if(active(g).every(x=>x.hand.length===0))finishRound(g);
  }else g.turnIndex=nextActive(g,g.turnIndex);
  g.version++;assertIntegrity(g);
}
function finishRound(g: Game) {
  const entrants=active(g),order=turnOrder(g);
  g.roundResult=entrants.map(p=>{const difference=Math.abs(p.wins-p.bid!),livesBefore=p.lives,{streak,multiplier,lost}=penaltyForRound(difference,p.missStreak,g.settings.penalty);p.missStreak=streak;p.lives=Math.max(0,p.lives-lost);return{id:p.id,name:p.name,bid:p.bid!,wins:p.wins,difference,streak,multiplier,lost,lives:p.lives,livesBefore};});
  const eliminated=entrants.filter(p=>p.lives===0);
  for(const p of eliminated)p.eliminated=true;
  g.history.push({round:g.cardsPerPlayer,roundIndex:g.roundIndex,wave:g.wave,result:g.roundResult,tricks:[...g.tricks],order,hands:g.roundHands,startedAt:g.roundStartedAt,finishedAt:new Date().toISOString()});
  recordEvent(g,'round_ended',{roundIndex:g.roundIndex,result:g.roundResult,eliminated:eliminated.map(p=>p.id)});
  if(eliminated.length){const mostLives=Math.max(...entrants.map(p=>p.lives));g.winners=entrants.filter(p=>p.lives===mostLives).map(p=>p.id);g.phase='finished';g.autoRestart=true;g.endReason='elimination';g.finishedAt=new Date().toISOString();recordEvent(g,'game_finished',{winners:g.winners,reason:g.endReason});}
  else g.phase='roundEnd';
}
export function advance(g: Game,version: number) {
  if(version!==g.version||g.phase!=='roundEnd')throw Error('No se puede avanzar');
  const cap=maxDeal(g),pivot=g.schedule.indexOf(1),oldMax=Math.max(...g.schedule);
  if(cap>oldMax&&pivot>=0)g.schedule=[...g.schedule.slice(0,pivot+1),...Array.from({length:cap-1},(_,i)=>i+2)];
  g.roundIndex++;g.roundStep=(g.roundStep??0)+1;
  if(g.roundStep>=g.schedule.length){g.wave=(g.wave??0)+1;g.schedule=schedule(cap).slice(1);if(!g.schedule.length)g.schedule=[1];g.roundStep=0;}
  g.firstIndex=nextActive(g,g.firstIndex);deal(g);
}
export function finishGame(g:Game,id:string,version:number,isAdmin=false){if(g.hostId!==id&&!isAdmin)throw Error('Solo el anfitrión puede terminar la partida');if(g.version!==version||!['bid','play','roundEnd'].includes(g.phase))throw Error('La partida ya terminó o cambió');const candidates=active(g),max=Math.max(...candidates.map(p=>p.lives));g.winners=candidates.filter(p=>p.lives===max).map(p=>p.id);g.phase='finished';g.endReason='manual';g.autoRestart=false;g.autoRestartAt=undefined;g.finishedAt=new Date().toISOString();g.version++;recordEvent(g,'game_finished',{winners:g.winners,reason:g.endReason},id);assertIntegrity(g);}
export function cancelGame(g:Game,id:string){if(g.phase==='lobby')return;if(g.phase==='finished')return;g.phase='finished';g.endReason='cancelled';g.winners=[];g.autoRestart=false;g.autoRestartAt=undefined;g.finishedAt=new Date().toISOString();g.version++;recordEvent(g,'game_finished',{winners:[],reason:'cancelled'},id);assertIntegrity(g);}
export type View = ReturnType<typeof view>;
export function view(g: Game,viewerId?: string) {
  const hidden=g.phase==='bid'&&g.cardsPerPlayer===1&&oneCardMode(g)==='hidden',activeViewer=!!viewerId&&g.players.some(p=>p.id===viewerId&&!p.eliminated);
  const leader=g.phase==='play'&&g.tricks.length?g.players.findIndex(p=>p.id===g.tricks.at(-1)!.winnerId):g.firstIndex;
  const order=turnOrder(g,leader);
  return {code:g.code,hostId:g.hostId,settings:g.settings,phase:g.phase,version:g.version,cycle:g.cycle,wave:g.wave??0,round:g.roundIndex+1,roundStep:(g.roundStep??0)+1,schedule:g.schedule,cardsPerPlayer:g.cardsPerPlayer,trickNumber:g.tricks.length+1,turnId:g.players[g.turnIndex]?.id,turnPosition:order.indexOf(g.players[g.turnIndex]?.id)+1,order,allowedBids:viewerId===current(g)?.id?allowedBids(g):[],players:g.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,bot:p.bot,lives:p.lives,connected:p.connected,ready:p.ready,eliminated:p.eliminated,missStreak:p.missStreak,bid:p.bid,wins:p.wins,handCount:p.hand.length,hand:p.id===viewerId?(hidden?p.hand.map(()=>null):p.hand):hidden&&activeViewer&&!p.eliminated?p.hand:undefined})),table:g.table,tricks:g.tricks,lastTrick:g.lastTrick,revealUntil:g.revealUntil,autoRestartAt:g.autoRestartAt,endReason:g.endReason,roundResult:g.roundResult,winners:g.winners,history:g.history.map(r=>({...r,hands:g.phase==='finished'?r.hands:undefined}))};
}
