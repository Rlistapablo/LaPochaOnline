import './round-progress.css';

type Props = { round: number; schedule: number[]; finished: boolean };

export function RoundProgress({round, schedule, finished}: Props) {
  if (!schedule.length) return null;
  const next = schedule[round];
  return <section className="roundProgress" aria-label="Calendario de rondas">
    <div className="roundProgressHeading">
      <span>Cartas por ronda</span>
      <small>{finished ? 'Partida terminada' : next === undefined ? 'Última ronda' : `Siguiente: ${next} ${next === 1 ? 'carta' : 'cartas'}`}</small>
    </div>
    <ol className="roundProgressTrack">
      {schedule.map((cards, index) => <li key={index} className={!finished && index + 1 === round ? 'current' : index + 1 < round || finished && index + 1 === round ? 'completed' : ''} aria-current={!finished && index + 1 === round ? 'step' : undefined} title={`Ronda ${index + 1}: ${cards} ${cards === 1 ? 'carta' : 'cartas'}`}>
        <span className="roundProgressNumber">{index + 1}</span>
        <strong>{cards}</strong>
        <span className="roundProgressUnit">{cards === 1 ? 'carta' : 'cartas'}</span>
      </li>)}
    </ol>
  </section>;
}
