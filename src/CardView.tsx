import { motion } from 'framer-motion';
import type { Card, Value } from '../shared/game';

type Suit = NonNullable<Card['suit']>;

export function SuitArt({ suit }: { suit: Suit }) {
  if (suit === 'Oros') return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg">
    <circle cx="50" cy="50" r="34" fill="#d7a83e" stroke="#89592d" strokeWidth="3" />
    <circle cx="50" cy="50" r="27" fill="none" stroke="#fff1ba" strokeWidth="2" />
    <circle cx="50" cy="50" r="21" fill="#edc965" stroke="#a06c2b" strokeWidth="1.5" />
    <path d="M50 31l5 13 14 1-11 9 4 13-12-8-12 8 4-13-11-9 14-1z" fill="#fff0b1" stroke="#a06c2b" strokeWidth="1.4" />
    {[0,45,90,135,180,225,270,315].map(n=><circle key={n} cx="50" cy="11" r="2" fill="#ad742b" transform={`rotate(${n} 50 50)`}/>)}
  </svg>;
  if (suit === 'Copas') return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg">
    <path d="M24 20h52l-5 26c-3 14-11 22-21 22S32 60 29 46z" fill="#d2a746" stroke="#8d572c" strokeWidth="3"/>
    <path d="M30 25h40l-4 20c-3 11-9 18-16 18s-13-7-16-18z" fill="#f6df86"/>
    <path d="M25 27c-12-2-13 14-3 21l9 4M75 27c12-2 13 14 3 21l-9 4" fill="none" stroke="#a76a32" strokeWidth="5" strokeLinecap="round"/>
    <path d="M46 68h8v13H46zM35 83h30v5H35z" fill="#b67937"/>
    <path d="M42 31l8 8 8-8M50 39v14" fill="none" stroke="#b64b3b" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>;
  if (suit === 'Espadas') return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg">
    <g transform="rotate(-29 50 50)"><path d="M50 8l8 14-4 48h-8l-4-48z" fill="#dce1dc" stroke="#5c6970" strokeWidth="2"/><path d="M50 13v54" stroke="#85949a" strokeWidth="2"/><path d="M32 67h36l-5 6H37zM47 73h6v14h-6z" fill="#a76b3d" stroke="#744726" strokeWidth="2"/><circle cx="50" cy="90" r="4" fill="#d9b15f"/></g>
    <g transform="rotate(29 50 50)"><path d="M50 8l8 14-4 48h-8l-4-48z" fill="#dce1dc" stroke="#5c6970" strokeWidth="2"/><path d="M50 13v54" stroke="#85949a" strokeWidth="2"/><path d="M32 67h36l-5 6H37zM47 73h6v14h-6z" fill="#a76b3d" stroke="#744726" strokeWidth="2"/><circle cx="50" cy="90" r="4" fill="#d9b15f"/></g>
  </svg>;
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg">
    <g transform="rotate(-25 50 50)"><path d="M46 18q4-10 8 0l-2 61q-2 6-5 0z" fill="#916039" stroke="#5b412b" strokeWidth="2"/><path d="M45 30q-12-10-15 0 8 4 17 9M54 44q12-8 15 2-8 4-16 8" fill="#4f7d4e" stroke="#31563d" strokeWidth="2"/></g>
    <g transform="rotate(25 50 50)"><path d="M46 18q4-10 8 0l-2 61q-2 6-5 0z" fill="#916039" stroke="#5b412b" strokeWidth="2"/><path d="M45 30q-12-10-15 0 8 4 17 9M54 44q12-8 15 2-8 4-16 8" fill="#4f7d4e" stroke="#31563d" strokeWidth="2"/></g>
    <circle cx="50" cy="50" r="5" fill="#dfbd70" stroke="#6d4c30" strokeWidth="2"/>
  </svg>;
}

function JokerArt() { return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg">
  <circle cx="50" cy="50" r="36" fill="none" stroke="#c69454" strokeWidth="1.5" strokeDasharray="3 3"/>
  <circle cx="50" cy="50" r="29" fill="#172e39" stroke="#dfc27b" strokeWidth="2"/>
  <path d="M50 22l8 18 19 10-19 9-8 19-9-19-18-9 18-10z" fill="#e7bd67" stroke="#fff0b7" strokeWidth="2"/>
  <path d="M50 32l5 13 13 5-13 5-5 13-5-13-13-5 13-5z" fill="#b94f52"/>
  <circle cx="50" cy="50" r="6" fill="#fff0bc"/>
</svg> }

export function CardView({card,onClick,small=false,hidden=false,declaredValue}:{card:Card|null;onClick?:()=>void;small?:boolean;hidden?:boolean;declaredValue?:Value}) {
  const back=hidden||!card;
  const joker=!!card?.id.startsWith('joker');
  const suit=card?.suit;
  const label=back?'Carta boca abajo':joker?`Comodín${declaredValue?`, valor ${declaredValue}`:''}`:`${card?.value} de ${suit}`;
  return <motion.button type="button" aria-label={label} whileHover={onClick?{y:-9,rotate:-1}:undefined} whileTap={onClick?{scale:.97}:undefined} onClick={onClick} disabled={!onClick} className={`playing-card ${small?'small':''} ${back?'is-back':''} ${joker?'is-joker':''} ${suit?`suit-${suit.toLowerCase()}`:''} ${onClick?'can-play':''}`}>
    {back?<><span className="card-back-frame"><span className="card-back-core">✦<small>LA POCHA</small>✦</span></span></>:<>
      <span className="card-filigree top-left">❧</span><span className="card-filigree bottom-right">❧</span>
      <span className="card-index"><strong>{joker?'★':card!.value}</strong><i>{joker?'✦':suit?.slice(0,1)}</i></span>
      <span className="card-illustration">{joker?<JokerArt/>:<SuitArt suit={suit!}/>}</span>
      <span className="card-caption">{joker?'COMODÍN':suit?.toUpperCase()}</span>
      {declaredValue&&<span className="declared-value">{declaredValue}</span>}
    </>}
  </motion.button>;
}
