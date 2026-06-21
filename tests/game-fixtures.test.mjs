import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { GAME_TYPES } from '../src/core/game-registry.js';
import { validateDocument } from '../src/core/schema.js';

const fixtureUrl = new URL('./fixtures/game-cases.json', import.meta.url);
const cases = JSON.parse(await readFile(fixtureUrl, 'utf8'));
const documentFor = game => ({
  schemaVersion: 2,
  games: [game],
  players: [{ id: 'player-1', name: 'PLAYER', score: 0 }],
  session: { games: {} }
});

describe('fixture di tutti i minigiochi', () => {
  it('copre esattamente gli 11 tipi registrati', () => {
    expect(new Set(cases.map(entry => entry.type))).toEqual(GAME_TYPES);
  });

  it.each(cases)('$type: accetta la fixture valida', ({ valid }) => {
    expect(validateDocument(documentFor(valid))).toEqual([]);
  });

  it.each(cases)('$type: rifiuta la fixture non valida', ({ invalid }) => {
    expect(validateDocument(documentFor(invalid))).not.toEqual([]);
  });
});
