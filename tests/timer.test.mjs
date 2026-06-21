import { test } from 'vitest';
import assert from 'node:assert/strict';

import { formatTimer, pauseTimer, resetTimer, startTimer, timerRemaining } from '../src/core/timer.js';

test('il timer usa timestamp e non accumula deriva dai tick', () => {
  const timer = { duration: 50, remaining: 50, running: false, startedAt: null };
  startTimer(timer, 1_000);
  assert.equal(timerRemaining(timer, 11_000), 40);
  pauseTimer(timer, 11_000);
  assert.equal(timer.remaining, 40);
  assert.equal(timer.running, false);
});

test('reset e formattazione del timer sono deterministici', () => {
  const timer = { duration: 10, remaining: 2, running: true, startedAt: 1 };
  resetTimer(timer, 75);
  assert.equal(timerRemaining(timer, 99_000), 75);
  assert.equal(formatTimer(75), '01:15');
  assert.equal(formatTimer(-2), '00:00');
});
