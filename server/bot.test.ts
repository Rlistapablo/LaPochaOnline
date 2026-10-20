import {it,expect} from 'vitest';
import {createGame,addPlayer,start,advance,assertIntegrity,type Settings} from '../shared/game';
import {runBots} from './bot';
it('bots de tres niveles completan partidas usando las mismas transiciones',()=>{
 const settings:Settings={name:'bots',private:true,maxPlayers:4,maxCards:5,lives:3,penalty:'normal',oneCard:'hidden',bots:3,difficulty:'normal',turnSeconds:30,sounds:false};
 for(let i=0;i<100;i++){const g=createGame('BOTS',{id:'easy',name:'Easy',avatar:'🤖',connected:true,bot:'easy'},settings);addPlayer(g,{id:'normal',name:'Normal',avatar:'🤖',connected:true,bot:'normal'});addPlayer(g,{id:'hard',name:'Hard',avatar:'🤖',connected:true,bot:'hard'});start(g);let guard=0;while(g.phase!=='finished'&&guard++<100){runBots(g);assertIntegrity(g);if(g.phase==='roundEnd')advance(g,g.version);}expect(g.phase).toBe('finished');expect(g.winners.length).toBeGreaterThan(0);}
});
