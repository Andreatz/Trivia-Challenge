import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateBombScore,
  guessPointsForReveal,
  nextPassIndex,
  passBonusForDifficulty,
  passPointsForDifficulty,
  passSummary
} from '../src/core/game-rules.js';

test('Passaparola legge punti e bonus dalla difficoltà attiva', () => {
  const game = {
    difficulty: 'medio',
    points: { facile: 5, medio: 10, difficile: 20 },
    bonus: { facile: 200, medio: 500, difficile: 1000 }
  };
  assert.equal(passPointsForDifficulty(game), 10);
  assert.equal(passBonusForDifficulty(game), 500);
});

test('Passaparola visita prima le domande pending e poi quelle passate', () => {
  const questions = [
    { status: 'correct' },
    { status: 'pass' },
    { status: 'pending' },
    { status: 'wrong' }
  ];
  assert.equal(nextPassIndex(questions, 0), 2);
  questions[2].status = 'correct';
  assert.equal(nextPassIndex(questions, 2), 1);
});

test('Passaparola riconosce completamento e perfect round', () => {
  assert.deepEqual(passSummary([{ status: 'correct' }, { status: 'wrong' }]), {
    total: 2,
    pending: 0,
    correct: 1,
    wrong: 1,
    pass: 0,
    complete: true,
    perfect: false
  });
  assert.equal(passSummary([{ status: 'correct' }, { status: 'correct' }]).perfect, true);
});

test('Schiva la Bomba sottrae una unità per ogni bomba selezionata', () => {
  const result = calculateBombScore(
    [{ isBomb: false }, { isBomb: true }, { isBomb: false }],
    [0, 1, 2],
    50
  );
  assert.deepEqual(result, { correct: 2, bombs: 1, score: 50 });
});

test('Indovina il personaggio usa il valore dell’ultimo indizio rivelato', () => {
  const round = { points: [1000, 500, 250, 50] };
  assert.equal(guessPointsForReveal(round, 0), 1000);
  assert.equal(guessPointsForReveal(round, 2), 500);
  assert.equal(guessPointsForReveal(round, 99), 50);
});
