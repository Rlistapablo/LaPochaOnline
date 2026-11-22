import {describe,expect,it} from 'vitest';
import {SUITS,VALUES,type Card} from '../shared/game';
import {deckSheetCell,normalizeDeckStyle} from './deck-style';

describe('baraja clásica',()=>{
  it('asigna las 40 cartas, sin reutilizar las casillas de 8 y 9',()=>{
    const positions=SUITS.flatMap(suit=>VALUES.map(value=>deckSheetCell({id:`${suit}_${value}`,suit,value})!.join(',')));
    expect(positions).toHaveLength(40);
    expect(new Set(positions).size).toBe(40);
    expect(positions).not.toContain('1,2');
    expect(positions).not.toContain('1,3');
    expect(positions).not.toContain('3,4');
    expect(positions).not.toContain('4,0');
    expect(positions).not.toContain('6,1');
    expect(positions).not.toContain('6,2');
    expect(positions).not.toContain('8,3');
    expect(positions).not.toContain('8,4');
  });
  it('reserva el dibujo del antiguo reverso para el comodín',()=>{
    expect(deckSheetCell(null)).toBeUndefined();
    expect(deckSheetCell({id:'Oros_As',suit:'Oros',value:'As'},true)).toBeUndefined();
    expect(deckSheetCell({id:'joker_1'} as Card)).toEqual([9,3]);
    expect(normalizeDeckStyle('clasica')).toBe('clasica');
    expect(normalizeDeckStyle('desconocida')).toBe('original');
  });
});
