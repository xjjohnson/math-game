import { createRng } from '@/utils/seededRandom';
import {
  EGG_BASKET,
  EGG_BASKET_MAX,
  eggsToUnit,
  FARM,
  FLOOR,
  inFarmPond,
  inMud,
  onAnimal,
  onBasket,
  PLACE_PROPS,
  settle,
  unitToEggs,
} from '@/utils/multiplayer/placeProps';
import { FARM_VERSION, PROTOCOL_VERSION, TOWN_PLACES } from '@/utils/multiplayer/protocol';
import { BUILDINGS, eggHint, eggsIn, eggUnits, shiftQuestions } from '@/utils/town';

describe('farm', () => {
  it('is a sixth building and place, and older phones are asked to update', () => {
    expect(BUILDINGS.map((b) => b.id)).toContain('farm');
    expect(BUILDINGS).toHaveLength(6);
    expect(TOWN_PLACES).toContain('farm');
    expect(PROTOCOL_VERSION).toBeGreaterThanOrEqual(FARM_VERSION);
  });

  it('has animals that say something, eggs, food and the egg basket', () => {
    const props = PLACE_PROPS.farm;
    expect(props.filter((p) => p.says).length).toBeGreaterThanOrEqual(10);
    expect(props.filter((p) => p.egg).length).toBeGreaterThanOrEqual(3);
    expect(props.filter((p) => p.food).length).toBeGreaterThanOrEqual(3);
    expect(props.filter((p) => p.eggBasket)).toEqual([EGG_BASKET]);
  });

  it('puts things down on the hay loft and in the nest boxes', () => {
    expect(settle('farm', {}, 0.1, FARM.barn.loft - 0.05).y).toBe(FARM.barn.loft);
    expect(settle('farm', {}, 0.38, FARM.coop.rows[0] - 0.05).y).toBe(FARM.coop.rows[0]);
    expect(settle('farm', {}, 0.6, 0.8)).toEqual({ x: 0.6, y: 0.8 });
    expect(settle('farm', {}, 0.6, 0.3).y).toBeCloseTo(FLOOR + 0.04);
  });

  it('counts eggs dropped in the basket, kept as a switch', () => {
    expect(onBasket({ x: EGG_BASKET.x + 0.01, y: EGG_BASKET.y - 0.05 }, EGG_BASKET)).toBe(true);
    expect(onBasket({ x: EGG_BASKET.x + 0.1, y: EGG_BASKET.y }, EGG_BASKET)).toBe(false);
    for (let n = 0; n <= EGG_BASKET_MAX; n++) expect(unitToEggs(eggsToUnit(n))).toBe(n);
    expect(unitToEggs(eggsToUnit(EGG_BASKET_MAX + 5))).toBe(EGG_BASKET_MAX);
  });

  it('knows food dropped on an animal, and animals in the mud or the pond', () => {
    const pig = PLACE_PROPS.farm.find((p) => p.id === 'pig')!;
    expect(onAnimal({ x: pig.x, y: pig.y - 0.05 }, pig, pig.scale)).toBe(true);
    expect(onAnimal({ x: pig.x + 0.1, y: pig.y }, pig, pig.scale)).toBe(false);
    expect(inMud(pig)).toBe(true);
    const duck = PLACE_PROPS.farm.find((p) => p.id === 'duck1')!;
    expect(inFarmPond(duck)).toBe(true);
    expect(inMud(duck)).toBe(false);
  });

  it('asks egg questions with whole, positive answers at every grade', () => {
    for (let grade = 0; grade <= 6; grade++) {
      for (let seed = 0; seed < 15; seed++) {
        shiftQuestions('farm', grade as 0, createRng(seed)).forEach((q) => {
          expect(q.eggs).toBeDefined();
          expect(Number.isInteger(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThan(0);
          expect(q.eggs!.units).toContain(1);
          expect(q.prompt).toMatch(/egg/);
        });
      }
    }
  });

  it('offers boxes of ten from first grade, and crates and trucks for big numbers', () => {
    expect(eggUnits(0, 7)).toEqual([1]);
    expect(eggUnits(1, 15)).toEqual([1, 10]);
    expect(eggUnits(3, 40)).toEqual([1, 10, 100]);
    expect(eggUnits(5, 40)).toEqual([1, 10, 100, 1000]);
    expect(eggUnits(2, 120)).toEqual([1, 10, 100]);
    expect(eggsIn([10, 1, 1])).toBe(12);
  });

  it('gives a gentle hint', () => {
    expect(eggHint(7, 5, 0)).toMatch(/Count them again/);
    expect(eggHint(7, 9, 2)).toMatch(/too many/);
    expect(eggHint(7, 5, 2)).toMatch(/Not enough/);
  });
});
