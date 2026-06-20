export const GAME_DEFINITIONS = Object.freeze({
  guess: { label: 'Indovina il personaggio', menuOrder: 0 },
  bomb: { label: 'Schiva la Bomba', menuOrder: 1 },
  jeopardy: { label: 'Jeopardy', menuOrder: 2 },
  pass: { label: 'Passaparola', menuOrder: 3 },
  said: { label: "Chi l'ha detto", menuOrder: 4 },
  detail: { label: 'Occhio al dettaglio', menuOrder: 5 },
  quote: { label: 'Completa la Frase', menuOrder: 6 },
  chain: { label: 'Reazione a catena', menuOrder: 7 },
  labors: { label: 'Le Dieci Fatiche', menuOrder: 8 },
  guillotine: { label: 'Ghigliottina', menuOrder: 9 },
  sarabanda: { label: 'Sarabanda', menuOrder: 10 }
});

export const GAME_TYPES = new Set(Object.keys(GAME_DEFINITIONS));
export const GAME_LABELS = Object.fromEntries(Object.entries(GAME_DEFINITIONS).map(([type, definition]) => [type, definition.label]));
export const MENU_ORDER = Object.entries(GAME_DEFINITIONS)
  .sort(([, left], [, right]) => left.menuOrder - right.menuOrder)
  .map(([type]) => type);

const CATEGORY_ICONS = Object.freeze({ Anime: '✦', Cinema: '▣', 'Serie TV': '▢', Musica: '♫', Gaming: '☍' });

export function categoryIcon(name) {
  return CATEGORY_ICONS[name] || '✦';
}

export function createGameTemplates({ createId, alphabet }) {
  return {
    guess: () => ({ id: createId('game'), type: 'guess', title: 'Indovina il personaggio', menuTitle: 'INDOVINA IL PERSONAGGIO', rounds: [{ answer: 'Aizen', points: [1000, 500, 250, 50], clues: [{ label: '1000', image: 'public/assets/indovina-il-personaggio/anime/aizen-1.png' }, { label: '500', image: 'public/assets/indovina-il-personaggio/anime/aizen-2.png' }, { label: '250', image: 'public/assets/indovina-il-personaggio/anime/aizen-3.png' }, { label: '50', image: 'public/assets/indovina-il-personaggio/anime/aizen-4.png' }] }] }),
    bomb: () => ({ id: createId('game'), type: 'bomb', title: 'Schiva la Bomba', menuTitle: 'SCHIVA LA BOMBA!', question: 'Trova i 16 elementi collegati alla domanda ed evita le 4 bombe.', pointsPerCorrect: 50, items: Array.from({ length: 20 }, (_, index) => ({ label: `Elemento ${index + 1}`, image: '', isBomb: index >= 16 })) }),
    said: () => ({ id: createId('game'), type: 'said', title: "Chi l'ha detto", menuTitle: "CHI L'HA DETTO", points: 100, questions: [{ prompt: 'Ascolta l audio e indovina il personaggio.', audio: '', answer: 'Personaggio', media: '' }] }),
    detail: () => ({ id: createId('game'), type: 'detail', title: 'Occhio al dettaglio', menuTitle: 'OCCHIO AL DETTAGLIO', points: 200, questions: [{ detailImage: '', fullImage: '', answer: 'Contesto completo della scena' }] }),
    quote: () => ({ id: createId('game'), type: 'quote', title: 'Completa la Frase', menuTitle: 'COMPLETA LA FRASE', points: 200, questions: [{ partial: 'Io sono tuo...', answer: 'padre', source: 'Star Wars' }] }),
    chain: () => ({ id: createId('game'), type: 'chain', title: 'Reazione a catena', menuTitle: 'REAZIONE A CATENA', topic: 'Argomento', points: 50, questions: Array.from({ length: 20 }, (_, index) => ({ question: `Domanda sequenziale ${index + 1}`, answer: `Risposta ${index + 1}` })) }),
    labors: () => ({ id: createId('game'), type: 'labors', title: 'Le Dieci Fatiche', menuTitle: 'LE DIECI FATICHE', points: 100, questions: Array.from({ length: 10 }, (_, index) => ({ kind: ['risposta secca', 'risposta multipla', 'elenco', 'spiegazione'][index % 4], question: `Fatica ${index + 1}`, options: index % 4 === 1 ? ['A', 'B', 'C', 'D'] : [], answer: `Risposta ${index + 1}`, explanation: 'Spiegazione opzionale.' })) }),
    guillotine: () => ({ id: createId('game'), type: 'guillotine', title: 'Ghigliottina', menuTitle: 'GHIGLIOTTINA', points: 200, words: ['parola 1', 'parola 2', 'parola 3', 'parola 4', 'parola 5'], answer: 'Risposta collegata' }),
    pass: () => ({ id: createId('game'), type: 'pass', title: 'Passaparola', menuTitle: 'PASSAPAROLA', difficulty: 'facile', points: { facile: 5, medio: 10, difficile: 20 }, bonus: { facile: 200, medio: 500, difficile: 1000 }, questions: alphabet.map(letter => ({ letter, question: `Con la ${letter}: domanda`, answer: `Risposta con ${letter}` })) }),
    jeopardy: () => ({ id: createId('game'), type: 'jeopardy', title: 'Jeopardy', menuTitle: 'JEOPARDY', categories: ['Anime', 'Cinema', 'Serie TV', 'Musica', 'Gaming'].map(name => ({ name, clues: [100, 200, 300, 400, 500].map(value => ({ value, question: `Domanda ${name} da ${value}`, answer: `Risposta ${name} ${value}` })) })) }),
    sarabanda: () => ({ id: createId('game'), type: 'sarabanda', title: 'Sarabanda', menuTitle: 'SARABANDA', pointsTitle: 25, pointsArtist: 25, songs: [{ audio: '', title: 'Titolo brano', artist: 'Artista' }] })
  };
}
