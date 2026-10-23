import {it,expect} from 'vitest';
import {runBenchmark,formatReport} from './bot-benchmark';

it('el banco de pruebas reparte las victorias entre los niveles y termina todas las partidas', () => {
 const report=runBenchmark({games:30,seats:['easy','normal','hard']});
 expect(report.games).toBe(30);
 expect(report.players).toBe(3);
 expect(report.levels.map(l=>l.level).sort()).toEqual(['easy','hard','normal']);
 const totalWins=report.levels.reduce((sum,l)=>sum+l.wins,0);
 expect(totalWins).toBeCloseTo(30,6);
 for(const level of report.levels){
  expect(level.seats).toBe(30);
  expect(level.exactBidRate).toBeGreaterThanOrEqual(0);
  expect(level.exactBidRate).toBeLessThanOrEqual(1);
  expect(level.fairShare).toBeCloseTo(1/3,6);
 }
});

it('los bots difíciles ganan a los fáciles con claridad', () => {
 const report=runBenchmark({games:60,seats:['hard','easy','easy']});
 const hard=report.levels.find(l=>l.level==='hard')!;
 const easy=report.levels.find(l=>l.level==='easy')!;
 expect(hard.winRate).toBeGreaterThan(easy.winRate);
});

it('el informe incluye una fila por nivel', () => {
 const text=formatReport(runBenchmark({games:5,seats:['normal','hard']}));
 expect(text).toContain('normal');
 expect(text).toContain('hard');
});
