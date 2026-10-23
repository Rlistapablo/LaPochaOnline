import {pathToFileURL} from 'node:url';
import {createGame,addPlayer,start,advance,assertIntegrity,bid,play,type Settings,type Game,type Modes} from '../shared/game.js';
import {runBotTurn} from '../server/bot.js';
import {expertConfig,hardConfig,type ExpertConfig} from '../server/montecarlo.js';
import * as legacy from './legacy/bot-v1.js';

// "hard-v1" es el nivel difícil original, conservado solo para medir mejoras.
export const LEGACY_LEVEL = 'hard-v1';
const botLevel = (level: string) => (level === LEGACY_LEVEL ? 'hard' : level) as 'easy' | 'normal' | 'hard' | 'expert';

function drive(g: Game, levelById: Map<string, string>) {
  for (let guard = 0; guard < 1000; guard++) {
    const actor = g.players[g.turnIndex];
    if ((g.phase === 'bid' || g.phase === 'play') && actor?.bot && levelById.get(actor.id) === LEGACY_LEVEL) {
      if (g.phase === 'bid') bid(g, actor.id, legacy.chooseBotBid(g, actor), g.version);
      else { const choice = legacy.chooseBotPlay(g, actor); play(g, actor.id, choice.card.id, choice.value, g.version); }
    } else if (!runBotTurn(g)) return;
  }
  throw Error('Bucle de bots');
}

export type BenchOptions = {
  games: number;
  seats: string[];
  maxCards: number;
  lives: 3|5;
  penalty: 'normal'|'progressive';
  oneCard: 'hidden'|'visible'|'alternate';
  jokerCount?: number;
  modes?: Modes;
  shuffleSeats: boolean;
};

export type LevelStats = {
  level: string;
  seats: number;
  wins: number;
  fairShare: number;
  winRate: number;
  winRateError: number;
  avgFinalLives: number;
  rounds: number;
  exactBidRate: number;
  avgMiss: number;
  avgLivesLostPerRound: number;
};

export type BenchReport = { games: number; players: number; avgRounds: number; levels: LevelStats[] };

type Acc = { seats: number; wins: number; finalLives: number; rounds: number; exact: number; miss: number; lost: number };

export const DEFAULT_OPTIONS: BenchOptions = {
  games: 500,
  seats: ['easy', 'normal', 'hard'],
  maxCards: 5,
  lives: 3,
  penalty: 'normal',
  oneCard: 'hidden',
  shuffleSeats: true
};

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function playGame(options: BenchOptions): { game: Game; levelById: Map<string, string> } {
  const levels = options.shuffleSeats ? shuffled(options.seats) : options.seats;
  const settings: Settings = {
    name: 'bench', private: true, maxPlayers: 8, maxCards: options.maxCards, lives: options.lives,
    penalty: options.penalty, oneCard: options.oneCard, bots: levels.length, difficulty: 'normal',
    turnSeconds: 30, sounds: false, modes: options.modes
  };
  if (options.jokerCount !== undefined) settings.jokerCount = options.jokerCount;
  const levelById = new Map<string, string>();
  let game: Game | undefined;
  levels.forEach((level, index) => {
    const id = `seat${index}`;
    levelById.set(id, level);
    const player = { id, name: `${level}-${index}`, avatar: 'B', connected: true, bot: botLevel(level) };
    if (!game) game = createGame('BENCH', player, settings);
    else addPlayer(game, player);
  });
  const g = game!;
  start(g);
  const phaseOf = (x: Game): string => x.phase;
  for (let steps = 0; phaseOf(g) !== 'finished'; steps++) {
    if (steps > 5000) throw Error('La partida no termina');
    drive(g, levelById);
    const phase = phaseOf(g);
    if (phase === 'roundEnd') advance(g, g.version);
    else if (phase !== 'finished') throw Error(`Partida bloqueada en la fase ${phase}`);
  }
  assertIntegrity(g);
  return { game: g, levelById };
}

export function runBenchmark(partial: Partial<BenchOptions> = {}): BenchReport {
  const options: BenchOptions = { ...DEFAULT_OPTIONS, ...partial };
  const accs = new Map<string, Acc>();
  const acc = (level: string) => {
    if (!accs.has(level)) accs.set(level, { seats: 0, wins: 0, finalLives: 0, rounds: 0, exact: 0, miss: 0, lost: 0 });
    return accs.get(level)!;
  };
  let totalRounds = 0;
  for (let n = 0; n < options.games; n++) {
    const { game, levelById } = playGame(options);
    totalRounds += game.history.length;
    for (const player of game.players) {
      const a = acc(levelById.get(player.id)!);
      a.seats++;
      a.finalLives += player.lives;
      if (game.winners.includes(player.id)) a.wins += 1 / game.winners.length;
    }
    for (const round of game.history) {
      for (const result of round.result) {
        const a = acc(levelById.get(result.id)!);
        a.rounds++;
        if (result.bid === result.wins) a.exact++;
        a.miss += Math.abs(result.bid - result.wins);
        a.lost += result.lost;
      }
    }
  }
  const players = options.seats.length;
  const levels = [...accs.entries()].map(([level, a]): LevelStats => {
    const winRate = a.wins / a.seats;
    return {
      level,
      seats: a.seats,
      wins: a.wins,
      fairShare: 1 / players,
      winRate,
      winRateError: 1.96 * Math.sqrt(winRate * (1 - winRate) / a.seats),
      avgFinalLives: a.finalLives / a.seats,
      rounds: a.rounds,
      exactBidRate: a.exact / a.rounds,
      avgMiss: a.miss / a.rounds,
      avgLivesLostPerRound: a.lost / a.rounds
    };
  }).sort((x, y) => y.winRate - x.winRate);
  return { games: options.games, players, avgRounds: totalRounds / options.games, levels };
}

export function formatReport(report: BenchReport): string {
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  const head = ['nivel', 'asientos', 'victorias', 'justo', 'aciertos', 'fallo medio', 'vidas perd./ronda', 'vidas finales'];
  const rows = report.levels.map(l => [
    l.level, String(l.seats), `${pct(l.winRate)} ±${pct(l.winRateError)}`, pct(l.fairShare),
    pct(l.exactBidRate), l.avgMiss.toFixed(2), l.avgLivesLostPerRound.toFixed(2), l.avgFinalLives.toFixed(2)
  ]);
  const widths = head.map((title, i) => Math.max(title.length, ...rows.map(r => r[i].length)));
  const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i])).join('  ');
  return [
    `${report.games} partidas, ${report.players} jugadores, ${report.avgRounds.toFixed(1)} rondas de media`,
    line(head), line(widths.map(w => '-'.repeat(w))), ...rows.map(line)
  ].join('\n');
}

function parseArgs(argv: string[]): Partial<BenchOptions> {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) throw Error(`Argumento no válido: ${argv[i]}`);
    const key = argv[i].slice(2);
    if (key === 'fixed-seats') values.set(key, 'true');
    else values.set(key, argv[++i] ?? '');
  }
  const options: Partial<BenchOptions> = {};
  if (values.has('games')) options.games = Number(values.get('games'));
  if (values.has('seats')) options.seats = values.get('seats')!.split(',').map(x => x.trim()).filter(Boolean);
  if (values.has('cards')) options.maxCards = Number(values.get('cards'));
  if (values.has('lives')) options.lives = Number(values.get('lives')) === 5 ? 5 : 3;
  if (values.has('penalty')) options.penalty = values.get('penalty') === 'progressive' ? 'progressive' : 'normal';
  if (values.has('one-card')) options.oneCard = values.get('one-card') as BenchOptions['oneCard'];
  if (values.has('jokers')) options.jokerCount = Number(values.get('jokers'));
  if (values.has('modes')) options.modes = JSON.parse(values.get('modes')!);
  if (values.has('fixed-seats')) options.shuffleSeats = false;
  if (values.has('expert')) Object.assign(expertConfig, JSON.parse(values.get('expert')!) as Partial<ExpertConfig>);
  if (values.has('hard')) Object.assign(hardConfig, JSON.parse(values.get('hard')!) as Partial<ExpertConfig>);
  const unknown = [...values.keys()].filter(k => !['games', 'seats', 'cards', 'lives', 'penalty', 'one-card', 'jokers', 'modes', 'fixed-seats', 'expert', 'hard'].includes(k));
  if (unknown.length) throw Error(`Opciones desconocidas: ${unknown.join(', ')}`);
  if (options.seats && (options.seats.length < 2 || options.seats.length > 8)) throw Error('Se necesitan entre 2 y 8 asientos');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  const report = runBenchmark(parseArgs(process.argv.slice(2)));
  console.log(formatReport(report));
  console.log(`Tiempo: ${((Date.now() - started) / 1000).toFixed(1)} s`);
}
