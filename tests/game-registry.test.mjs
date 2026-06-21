import { test } from 'vitest';
import assert from 'node:assert/strict';

import { createGameTemplates, GAME_DEFINITIONS, GAME_TYPES, MENU_ORDER } from '../src/core/game-registry.js';

test('il registro espone esattamente gli undici minigiochi', () => {
  assert.equal(GAME_TYPES.size, 11);
  assert.deepEqual(new Set(MENU_ORDER), new Set(Object.keys(GAME_DEFINITIONS)));
});

test('ogni template produce un gioco valido con ID e tipo coerenti', () => {
  let sequence = 0;
  const templates = createGameTemplates({
    createId: prefix => `${prefix}-${sequence += 1}`,
    alphabet: 'ABC'.split('')
  });
  for (const [type, factory] of Object.entries(templates)) {
    const game = factory();
    assert.equal(game.type, type);
    assert.match(game.id, /^game-/);
    assert.equal(typeof game.title, 'string');
  }
});
