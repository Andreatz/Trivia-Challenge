export const PASS_STATUSES = new Set(['pending', 'correct', 'wrong', 'pass']);

export function normalizePassStatus(value) {
  return PASS_STATUSES.has(value) ? value : 'pending';
}

export function passPointsForDifficulty(game) {
  const difficulty = game?.difficulty || 'facile';
  const value = Number(game?.points?.[difficulty]);
  return Number.isFinite(value) ? value : 0;
}

export function passBonusForDifficulty(game) {
  const difficulty = game?.difficulty || 'facile';
  const value = Number(game?.bonus?.[difficulty]);
  return Number.isFinite(value) ? value : 0;
}

export function nextPassIndex(questions, currentIndex) {
  if (!Array.isArray(questions) || questions.length === 0) return -1;

  const normalized = questions.map(question => normalizePassStatus(question?.status));
  const findNext = status => {
    for (let offset = 1; offset <= normalized.length; offset += 1) {
      const index = (currentIndex + offset) % normalized.length;
      if (normalized[index] === status) return index;
    }
    return -1;
  };

  const pending = findNext('pending');
  return pending >= 0 ? pending : findNext('pass');
}

export function passSummary(questions) {
  const summary = { total: 0, pending: 0, correct: 0, wrong: 0, pass: 0, complete: false, perfect: false };
  for (const question of Array.isArray(questions) ? questions : []) {
    const status = normalizePassStatus(question?.status);
    summary.total += 1;
    summary[status] += 1;
  }
  summary.complete = summary.total > 0 && summary.pending === 0 && summary.pass === 0;
  summary.perfect = summary.complete && summary.correct === summary.total;
  return summary;
}

export function calculateBombScore(items, selectedIndexes, pointsPerCorrect = 0) {
  const selected = new Set(Array.isArray(selectedIndexes) ? selectedIndexes : []);
  let correct = 0;
  let bombs = 0;

  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (!selected.has(index)) return;
    if (item?.isBomb) bombs += 1;
    else correct += 1;
  });

  const unit = Number(pointsPerCorrect) || 0;
  return { correct, bombs, score: (correct - bombs) * unit };
}

export function guessPointsForReveal(round, revealed) {
  const points = Array.isArray(round?.points) ? round.points : [];
  if (!points.length) return 0;
  const index = Math.min(Math.max(Number(revealed) - 1, 0), points.length - 1);
  const value = Number(points[index]);
  return Number.isFinite(value) ? value : 0;
}
