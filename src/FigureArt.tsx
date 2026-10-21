import type {Card} from '../shared/game';

type Figure=Extract<Card['value'],'Sota'|'Caballo'|'Rey'>;
type Suit=NonNullable<Card['suit']>;

const colors:Record<Suit,{cloth:string;dark:string;trim:string}>={
  Oros:{cloth:'#bd513d',dark:'#76372f',trim:'#d9a844'},
  Copas:{cloth:'#b54c52',dark:'#702f42',trim:'#d6a74d'},
  Espadas:{cloth:'#5c7891',dark:'#344e69',trim:'#c3a05a'},
  Bastos:{cloth:'#4e785b',dark:'#30513d',trim:'#c6a15b'},
};

function FigureCrest({suit}:{suit:Suit}){
  return <g transform="translate(75 76)" stroke="#614527" strokeWidth="1.5" strokeLinejoin="round">
    <circle r="13" fill="#f6e6b3" stroke="#b48643" strokeWidth="2"/>
    {suit==='Oros'&&<><circle r="8" fill="#d5a43c"/><path d="M0-6 2-2 6-1 3 2 4 6 0 4-4 6-3 2-6-1-2-2Z" fill="#fff2bc"/></>}
    {suit==='Copas'&&<><path d="M-6-6H6L4 1Q0 7-4 1Z" fill="#ba6150"/><path d="M-6-5Q-11-6-8 0l4 2M6-5Q11-6 8 0L4 2M0 4v4m-5 0H5" fill="none" stroke="#9a5e35"/></>}
    {suit==='Espadas'&&<><path d="M-6-7 6 6M6-7-6 6" stroke="#61778b" strokeWidth="3"/><path d="M-8 1-4-3M8 1 4-3" stroke="#aa7444" strokeWidth="3"/></>}
    {suit==='Bastos'&&<><path d="M-6-7 6 7M6-7-6 7" stroke="#805e37" strokeWidth="4"/><path d="M-5-4-9-7M5-4 9-7" stroke="#4c7955" strokeWidth="3"/></>}
  </g>;
}

export function FigureArt({value,suit}:{value:Figure;suit:Suit}){
  const {cloth,dark,trim}=colors[suit];
  return <svg viewBox="0 0 100 100" aria-hidden="true" className="card-art-svg figure-art-svg" data-figure={value}>
    <path d="M13 91V30Q13 9 50 8q37 1 37 22v61" fill="none" stroke="#c5a66a" strokeWidth="1.5"/>
    <path d="M17 91V30Q17 14 50 13q33 1 33 17v61" fill="none" stroke="#dfc897" strokeWidth=".8"/>
    {value==='Sota'&&<g stroke="#5d3e2f" strokeLinejoin="round" strokeLinecap="round">
      <path d="M36 75 31 91h13l5-18M58 75l4 16h12L64 69" fill="#4d5661" strokeWidth="2"/>
      <path d="M26 87h19v5H24M59 87h18l3 5H60" fill={dark} strokeWidth="2"/>
      <path d="M35 43 22 57l6 14 9-5 3-10M64 42l13 13-7 14-10-4-3-12" fill={cloth} strokeWidth="2"/>
      <path d="M38 40h24l8 39-20 7-20-7Z" fill={cloth} strokeWidth="2.5"/>
      <path d="M43 41 50 52l7-11M50 52v27M35 73q15 8 30 0" fill="none" stroke={trim} strokeWidth="3"/>
      <path d="M43 35v8l7 6 7-6v-8" fill="#d6a475" strokeWidth="1.5"/>
      <path d="M37 25q1-12 13-12t13 12l-4 12q-9 8-18 0Z" fill="#e6b88c" strokeWidth="2"/>
      <path d="M37 24q0-16 14-16 11 0 13 13l-8-5-8 5Z" fill={dark} strokeWidth="2"/>
      <path d="M32 22q18-8 36 0l-5 6H36Z" fill={cloth} strokeWidth="2"/>
      <path d="M61 17q9-8 11-8-5 10-12 12" fill={trim} strokeWidth="1.5"/>
      <path d="M43 30h2m10 0h2m-8 5h3" stroke="#543a2f" strokeWidth="1.5"/>
      <path d="M28 67q-4 0-4 5l6 2 5-6M69 67q5 0 5 5l-6 2-5-6" fill="#e6b88c" strokeWidth="1.5"/>
      <path d="M75 24v62" stroke={trim} strokeWidth="3"/>
      <path d="M71 23h8l-4-10Z" fill="#d8d9cd" strokeWidth="1.5"/>
    </g>}
    {value==='Caballo'&&<g stroke="#554234" strokeLinejoin="round" strokeLinecap="round">
      <path d="M27 66q-8-3-10-13l-3-5q2 12 8 21" fill={dark} strokeWidth="2"/>
      <path d="M27 56q12-15 36-5l8 11-12 11H34Z" fill="#a77750" strokeWidth="2.5"/>
      <path d="M59 53q5-13 12-19l9 2 6 10-3 8-11 1-7 11" fill="#ae7d54" strokeWidth="2.5"/>
      <path d="M73 35 72 27l5 4 4-3 1 10M82 41l8 4-5 7-7-2" fill="#ae7d54" strokeWidth="2"/>
      <path d="M66 38q-7 4-10 13m13-14-5 15" fill="none" stroke="#4c392e" strokeWidth="4"/>
      <path d="M35 69 31 89h-8l5-25M48 70l-1 19h-8l-1-21M59 68l4 21h8l-3-24" fill="#a77750" strokeWidth="3"/>
      <path d="M22 89h12m4 0h12m12 0h12" stroke="#3d3029" strokeWidth="4"/>
      <path d="M41 50q9-7 19 0l-5 13H39Z" fill={cloth} strokeWidth="2"/>
      <path d="M40 37q-7 6-6 15l13 5 9-9-6-13" fill={cloth} strokeWidth="2"/>
      <path d="M38 41 34 52l-7 5m24-14 12 9 8-3" fill="none" stroke="#ddb08a" strokeWidth="6"/>
      <path d="M46 28v9l-5 5 11 4 4-7-4-10" fill="#deb08a" strokeWidth="1.5"/>
      <path d="M41 21q2-11 11-10 10 0 10 12l-4 10-11 2-6-7Z" fill="#e5b68d" strokeWidth="2"/>
      <path d="M39 20q5-14 19-10l6 11-11-5-8 7Z" fill={dark} strokeWidth="2"/>
      <path d="M38 19h27l-5 6H40Z" fill={trim} strokeWidth="2"/>
      <path d="M55 25h2m-9 7h4" stroke="#4e382d" strokeWidth="1.5"/>
      <path d="M67 49q9 0 13 4" fill="none" stroke={trim} strokeWidth="2"/>
    </g>}
    {value==='Rey'&&<g stroke="#5a3a2c" strokeLinejoin="round" strokeLinecap="round">
      <path d="M30 43 21 89q29 13 58 0L70 43 60 38H40Z" fill={cloth} strokeWidth="2.5"/>
      <path d="M35 47 29 87q21 9 42 0L65 47" fill={dark} strokeWidth="2"/>
      <path d="M43 44 50 58l7-14 8 43q-15 6-30 0Z" fill="#f5e3b4" strokeWidth="2"/>
      <path d="M50 58v30M30 78q20 9 40 0" fill="none" stroke={trim} strokeWidth="3"/>
      <path d="M39 40 22 48l-4 22 10 3 12-20M62 40l16 8 4 22-10 3-12-20" fill={cloth} strokeWidth="2"/>
      <path d="M20 67q-6 2-4 8l9 3 6-6M75 69q7-1 8 6l-9 4-6-7" fill="#dfad83" strokeWidth="1.5"/>
      <path d="M45 34v9l5 6 5-6v-9" fill="#d9a779" strokeWidth="1.5"/>
      <path d="M39 20q2-12 11-12t11 12l-2 17q-9 10-18 0Z" fill="#e7b98e" strokeWidth="2"/>
      <path d="M39 28q-3 13 11 19 14-6 11-19l-8 7-3 7-3-7Z" fill={dark} strokeWidth="2"/>
      <path d="M42 28h2m12 0h2m-10 6h4" stroke="#51382e" strokeWidth="1.5"/>
      <path d="M36 15 39 3l7 7 4-8 4 8 7-7 3 12-4 5H40Z" fill={trim} strokeWidth="2"/>
      <path d="M40 17h20M45 12h2m8 0h2" stroke="#f9e6ab" strokeWidth="2"/>
      <path d="M78 72V21m-4 4 4-8 4 8" stroke={trim} strokeWidth="3"/>
    </g>}
    <FigureCrest suit={suit}/>
  </svg>;
}
