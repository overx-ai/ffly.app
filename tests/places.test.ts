import { describe, expect, it } from 'vitest';
import { addPlace, removePlace } from '../src/scripts/places';

describe('addPlace', () => {
  it('appends in the order picked, up to the cap', () => {
    expect(addPlace([], 'WAW', 2)).toEqual(['WAW']);
    expect(addPlace(['WAW'], 'VNO', 2)).toEqual(['WAW', 'VNO']);
  });

  it('refuses a third once the cap is reached', () => {
    expect(addPlace(['WAW', 'VNO'], 'KRK', 2)).toEqual(['WAW', 'VNO']);
  });

  it('replaces the one pick when the cap is 1', () => {
    expect(addPlace(['WAW'], 'VNO', 1)).toEqual(['VNO']);
    expect(addPlace([], 'VNO', 1)).toEqual(['VNO']);
  });

  it('refuses a duplicate, also at a cap of 1', () => {
    expect(addPlace(['WAW'], 'WAW', 3)).toEqual(['WAW']);
    expect(addPlace(['WAW'], 'WAW', 1)).toEqual(['WAW']);
  });

  it('never changes the list it was given', () => {
    const list = ['WAW'];
    addPlace(list, 'VNO', 3);
    expect(list).toEqual(['WAW']);
  });
});

describe('removePlace', () => {
  it('drops the code and keeps the order of the rest', () => {
    expect(removePlace(['WAW', 'VNO', 'KRK'], 'VNO')).toEqual(['WAW', 'KRK']);
    expect(removePlace(['WAW'], 'XXX')).toEqual(['WAW']);
  });
});
