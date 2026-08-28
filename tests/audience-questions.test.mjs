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

  it('apre le risposte del gioco a indizi con il punteggio del passo corrente', () => {
    const game = {
      id: 'clues-1',
      type: 'clues',
      title: 'Dieci indizi',
      questions: [{
        answer: 'Jango Fett',
        acceptedAnswers: ['Jango'],
        clues: ['66 BBY', 'Orlo Esterno'],
        points: [1000, 900]
      }]
    };

    expect(audienceQuestionState(game, { i: 0, revealed: 2, answer: false })).toMatchObject({
      questionKey: 'clues-1:clues:question:0',
      questionType: 'clues',
      prompt: 'Indizio 2 di 2: Orlo Esterno',
      points: 900,
      accepting: true,
      answerRules: [{ answer: 'Jango Fett', points: 900 }, { answer: 'Jango', points: 900 }]
    });
  });

  it('pubblica la domanda e gli alias di Geoguessr', () => {
    const game = {
      id: 'geo-1',
      type: 'geoguessr',
      title: 'Geoguessr',
      points: 300,
      questions: [{ prompt: 'Quale pianeta?', answer: 'Tatooine', acceptedAnswers: ['Tatooine Prime'] }]
    };

    expect(audienceQuestionState(game, { i: 0, answer: false })).toMatchObject({
      questionKey: 'geo-1:geoguessr:question:0',
      questionType: 'geoguessr',
      prompt: 'Quale pianeta?',
      points: 300,
      accepting: true,
      answerRules: [{ answer: 'Tatooine', points: 300 }, { answer: 'Tatooine Prime', points: 300 }]
    });
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

  it('apre subito la prima immagine della variante Pixel', () => {
    const game = {
      id: 'pixel-1',
      type: 'guess',
      variant: 'pixel',
      title: 'Pixel',
      rounds: [{ answer: 'Qui-Gon Jinn', points: [1000, 500], clues: [{}, {}] }]
    };

    expect(audienceQuestionState(game, { i: 0, revealed: 0, answer: false })).toMatchObject({
      revealStep: 1,
      points: 1000,
      accepting: true
    });
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

  it('pubblica il set Passaparola della difficoltà attiva', () => {
    const game = {
      id: 'pass-1',
      type: 'pass',
      title: 'Passaparola',
      difficulty: 'medio',
      points: { facile: 5, medio: 10, difficile: 20 },
      questions: [{ letter: 'A', question: 'Fallback', answer: 'Fallback' }],
      questionSets: {
        facile: [{ letter: 'A', question: 'Facile?', answer: 'Anakin' }],
        medio: [{ letter: 'A', question: 'Medio?', answer: 'Ackbar', acceptedAnswers: ['Ammiraglio Ackbar'] }],
        difficile: [{ letter: 'A', question: 'Difficile?', answer: 'Ahsoka' }]
      }
    };

    expect(audienceQuestionState(game, { i: 0 })).toMatchObject({
      questionKey: 'pass-1:pass:question:medio:0',
      prompt: 'Medio?',
      points: 10,
      answerRules: [{ answer: 'Ackbar', points: 10 }, { answer: 'Ammiraglio Ackbar', points: 10 }]
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
