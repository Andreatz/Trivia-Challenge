import { describe, expect, it } from 'vitest';
import { audienceQuestionState } from '../src/core/audience-questions.js';

describe('audienceQuestionState', () => {
  it('opens one guess attempt for every revealed image with decreasing points', () => {
    const game = {
      id: 'guess-1',
      type: 'guess',
      title: 'Indovina',
      rounds: [{
        answer: 'Aizen|Sosuke Aizen',
        acceptedAnswers: ['Aizen Sosuke', 'Capitano Aizen'],
        points: [1000, 500, 250, 50],
        clues: [{}, {}, {}, {}]
      }]
    };

    const first = audienceQuestionState(game, { i: 0, revealed: 1, answer: false });
    const second = audienceQuestionState(game, { i: 0, revealed: 2, answer: false });

    expect(first).toMatchObject({
      questionKey: 'guess-1:guess:round:0',
      revealStep: 1,
      points: 1000,
      accepting: true
    });
    expect(second).toMatchObject({ revealStep: 2, points: 500, accepting: true });
    expect(second.answerRules.map(rule => rule.answer)).toEqual([
      'Aizen',
      'Sosuke Aizen',
      'Aizen Sosuke',
      'Capitano Aizen'
    ]);
  });

  it('does not open guess answers before an image or after the host reveals the answer', () => {
    const game = {
      id: 'guess-1',
      type: 'guess',
      title: 'Indovina',
      rounds: [{ answer: 'Aizen', clues: [{ label: '1000' }] }]
    };

    expect(audienceQuestionState(game, { i: 0, revealed: 0 }).accepting).toBe(false);
    expect(audienceQuestionState(game, { i: 0, revealed: 1, answer: true }).accepting).toBe(false);
  });

  it('extracts the selected Jeopardy clue and its value', () => {
    const game = {
      id: 'jeo-1',
      type: 'jeopardy',
      title: 'Jeopardy',
      categories: [{ name: 'Anime', clues: [{ value: 300, question: 'Chi è?', answer: 'Goku' }] }]
    };

    expect(audienceQuestionState(game, { jeo: { c: 0, q: 0 } })).toMatchObject({
      questionKey: 'jeo-1:jeopardy:clue:0:0',
      prompt: 'Anime · 300 punti\nChi è?',
      points: 300,
      accepting: true
    });
  });

  it('keeps spectators waiting when the show is not on an active question', () => {
    const game = {
      id: 'quote-1',
      type: 'quote',
      title: 'Completa',
      questions: [{ partial: 'Io sono tuo…', answer: 'padre' }]
    };

    expect(audienceQuestionState(game, { i: 0 }, false)).toMatchObject({
      questionKey: '',
      accepting: false,
      answerRules: []
    });
  });

  it('awards title, artist or full Sarabanda points server-side through answer rules', () => {
    const game = {
      id: 'song-1',
      type: 'sarabanda',
      title: 'Sarabanda',
      pointsTitle: 25,
      pointsArtist: 25,
      songs: [{ title: 'Blue Bird', artist: 'Ikimono-gakari' }]
    };

    const question = audienceQuestionState(game, { i: 0 });
    expect(question.answerRules).toEqual([
      { answer: 'Blue Bird', points: 25 },
      { answer: 'Ikimono-gakari', points: 25 },
      { answer: 'Blue Bird - Ikimono-gakari', points: 50 }
    ]);
  });

  it('includes aliases configured for every correct Bomb item', () => {
    const game = {
      id: 'bomb-1',
      type: 'bomb',
      title: 'Schiva la bomba',
      pointsPerCorrect: 50,
      items: [
        { label: 'Izuku Midoriya', acceptedAnswers: ['Midoriya', 'Deku'], isBomb: false },
        { label: 'All For One', acceptedAnswers: ['AFO'], isBomb: true }
      ]
    };

    expect(audienceQuestionState(game).answerRules).toEqual([
      { answer: 'Izuku Midoriya', points: 50 },
      { answer: 'Midoriya', points: 50 },
      { answer: 'Deku', points: 50 }
    ]);
  });
});
