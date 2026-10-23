import {SuitArt} from './CardView';

export const spanishSuits=['Oros','Copas','Espadas','Bastos'] as const;
type SpanishSuit=typeof spanishSuits[number];

const oldSuitIcons:Record<string,SpanishSuit>={
  '♠':'Espadas','♠️':'Espadas',
  '♥':'Copas','♥️':'Copas',
  '♦':'Oros','♦️':'Oros',
  '♣':'Bastos','♣️':'Bastos',
};

export function SpanishSuitIcon({suit}:{suit:SpanishSuit}){
  return <span className="spanishSuitIcon" role="img" aria-label={suit}><SuitArt suit={suit}/></span>;
}

export function AvatarIcon({icon}:{icon:string}){
  const suit=spanishSuits.find(value=>value===icon)||oldSuitIcons[icon];
  return suit?<SpanishSuitIcon suit={suit}/>:<>{icon}</>;
}
