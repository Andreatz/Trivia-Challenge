import { test } from 'vitest';
import assert from 'node:assert/strict';

import { createGameTemplates, createStarWarsGames, GAME_DEFINITIONS, GAME_TYPES, MENU_ORDER } from '../src/core/game-registry.js';

test('il registro espone tutti i tredici tipi di minigioco', () => {
  assert.equal(GAME_TYPES.size, 13);
  assert.deepEqual(new Set(MENU_ORDER), new Set(Object.keys(GAME_DEFINITIONS)));
});

test('il preset Star Wars contiene tutti i contenuti forniti', () => {
  const games = Object.fromEntries(createStarWarsGames().map(game => [game.type, game]));
  assert.equal(games.guess.rounds.length, 10);
  assert.equal(games.clues.questions.length, 10);
  assert.equal(games.geoguessr.questions.length, 10);
  assert.equal(games.jeopardy.categories.length, 5);
  assert.ok(games.jeopardy.categories.every(category => category.clues.length === 5));
  assert.equal(games.pass.duration, 300);
  assert.deepEqual(
    Object.fromEntries(Object.entries(games.pass.questionSets).map(([difficulty, questions]) => [difficulty, questions.length])),
    { facile: 20, medio: 20, difficile: 20 }
  );
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
