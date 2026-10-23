import {randomInt} from 'node:crypto';
import {createGame,addPlayer,start,bid,play,advance,allowedBids,assertIntegrity,active,VALUES,type Settings} from '../shared/game.js';
const count=Number(process.argv[2]||10000);
for(let n=0;n<count;n++){
 const players=2+randomInt(5);const settings:Settings={name:'sim',private:true,maxPlayers:8,maxCards:1+randomInt(9),lives:randomInt(2)?3:5,penalty:randomInt(2)?'normal':'progressive',oneCard:randomInt(2)?'hidden':'visible',bots:0,difficulty:'normal',turnSeconds:30,sounds:false};
 const g=createGame('SIM',{id:'p0',name:'p0',avatar:'🃏',connected:true},settings);
 for(let i=1;i<players;i++)addPlayer(g,{id:`p${i}`,name:`p${i}`,avatar:'🃏',connected:true});start(g);
 let actions=0;while(g.phase!=='finished'&&actions++<1000){if(g.phase==='bid'){const p=g.players[g.turnIndex];const a=allowedBids(g);bid(g,p.id,a[randomInt(a.length)],g.version);}else if(g.phase==='play'){const p=g.players[g.turnIndex],c=p.hand[randomInt(p.hand.length)];play(g,p.id,c.id,c.id.startsWith('joker')?VALUES[randomInt(VALUES.length)]:undefined,g.version);}else advance(g,g.version);assertIntegrity(g);}
 if(g.phase!=='finished'||!g.winners.length||actions>=1000||g.players.some(p=>p.lives<0))throw Error(`Fallo en partida ${n}`);
}
console.log(`${count} partidas completas: integridad, turnos y resultado correctos.`);
