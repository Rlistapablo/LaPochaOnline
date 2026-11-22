import {createContext} from 'react';
import type {Card,Value} from '../shared/game';
import barajaSheet from '../baraja.jpg';

export type DeckStyle='original'|'clasica';
export const DeckStyleContext=createContext<DeckStyle>('original');
export function normalizeDeckStyle(value:unknown):DeckStyle{return value==='clasica'?'clasica':'original';}

type Cell=readonly [number,number];
const cells:Record<NonNullable<Card['suit']>,Record<Value,Cell>>={
  Oros:{As:[0,0],'2':[0,1],'3':[0,2],'4':[0,3],'5':[0,4],'6':[1,0],'7':[1,1],Sota:[1,4],Caballo:[2,0],Rey:[2,1]},
  Copas:{As:[2,2],'2':[2,3],'3':[2,4],'4':[3,0],'5':[3,1],'6':[3,2],'7':[3,3],Sota:[4,1],Caballo:[4,2],Rey:[4,3]},
  Espadas:{As:[4,4],'2':[5,0],'3':[5,1],'4':[5,2],'5':[5,3],'6':[5,4],'7':[6,0],Sota:[6,3],Caballo:[6,4],Rey:[7,0]},
  Bastos:{As:[7,1],'2':[7,2],'3':[7,3],'4':[7,4],'5':[8,0],'6':[8,1],'7':[8,2],Sota:[9,0],Caballo:[9,1],Rey:[9,2]},
};

export function deckSheetCell(card:Card|null,hidden=false):Cell|undefined{
  if(hidden||!card)return undefined;
  if(card.id.startsWith('joker'))return [9,3];
  if(!card.suit||!card.value)return undefined;
  return cells[card.suit][card.value];
}

export function DeckSheetFace({cell}:{cell:Cell}){
  const [column,row]=cell;
  return <svg className="deckSheetFace" viewBox={`${14+column*148.6} ${11+row*222.2} 144 219`} preserveAspectRatio="none" aria-hidden="true"><image href={barajaSheet} width="1500" height="1128"/></svg>;
}
