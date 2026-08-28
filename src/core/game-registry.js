export const GAME_DEFINITIONS = Object.freeze({
  guess: { label: 'Indovina il personaggio', menuOrder: 0 },
  clues: { label: 'Indovina il personaggio: Indizi', menuOrder: 0.5 },
  geoguessr: { label: 'Geoguessr', menuOrder: 0.75 },
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
    guess: () => ({ id: createId('game'), type: 'guess', title: 'Indovina il personaggio', menuTitle: 'INDOVINA IL PERSONAGGIO', rounds: [{ answer: 'Aizen', points: [1000, 500, 250, 50], clues: [{ label: '1000', image: 'public/assets/indovina-il-personaggio/anime/aizen-1.webp' }, { label: '500', image: 'public/assets/indovina-il-personaggio/anime/aizen-2.webp' }, { label: '250', image: 'public/assets/indovina-il-personaggio/anime/aizen-3.webp' }, { label: '50', image: 'public/assets/indovina-il-personaggio/anime/aizen-4.webp' }] }] }),
    clues: () => ({ id: createId('game'), type: 'clues', title: 'Indovina il personaggio: Indizi', menuTitle: 'INDOVINA IL PERSONAGGIO: INDIZI', questions: [{ answer: 'Nome personaggio', acceptedAnswers: [], clues: Array.from({ length: 10 }, (_, index) => `Indizio ${index + 1}`), points: [1000, 900, 750, 600, 400, 200, 100, 50, 20, 10] }] }),
    geoguessr: () => ({ id: createId('game'), type: 'geoguessr', title: 'Geoguessr', menuTitle: 'GEOGUESSR', points: 300, questions: [{ prompt: 'Su quale pianeta si trova questo luogo?', image: '', answer: 'Pianeta' }] }),
    bomb: () => ({ id: createId('game'), type: 'bomb', title: 'Schiva la Bomba', menuTitle: 'SCHIVA LA BOMBA!', question: 'Trova i 16 elementi collegati alla domanda ed evita le 4 bombe.', pointsPerCorrect: 50, items: Array.from({ length: 20 }, (_, index) => ({ label: `Elemento ${index + 1}`, image: index === 0 ? 'public/assets/schiva-la-bomba/Gilgamesh.png' : index === 1 ? 'public/assets/schiva-la-bomba/92d1690b591d42988322de6699e97474_1611356315530.png' : '', isBomb: index >= 16 })) }),
    said: () => ({ id: createId('game'), type: 'said', title: "Chi l'ha detto", menuTitle: "CHI L'HA DETTO", points: 100, questions: [{ prompt: "Ascolta l'audio e indovina il personaggio.", audio: 'public/assets/audio/demo-tone.wav', answer: 'Aizen', media: 'public/assets/indovina-il-personaggio/anime/aizen-1.webp' }] }),
    detail: () => ({ id: createId('game'), type: 'detail', title: 'Occhio al dettaglio', menuTitle: 'OCCHIO AL DETTAGLIO', points: 200, questions: [{ detailImage: 'public/assets/indovina-il-personaggio/anime/aizen-2.webp', fullImage: 'public/assets/indovina-il-personaggio/anime/aizen-3.webp', answer: 'Aizen' }] }),
    quote: () => ({ id: createId('game'), type: 'quote', title: 'Completa la Frase', menuTitle: 'COMPLETA LA FRASE', points: 200, questions: [{ partial: 'Io sono tuo...', answer: 'padre', source: 'Star Wars' }] }),
    chain: () => ({ id: createId('game'), type: 'chain', title: 'Reazione a catena', menuTitle: 'REAZIONE A CATENA', topic: 'Argomento', points: 50, questions: Array.from({ length: 20 }, (_, index) => ({ question: `Domanda sequenziale ${index + 1}`, answer: `Risposta ${index + 1}` })) }),
    labors: () => ({ id: createId('game'), type: 'labors', title: 'Le Dieci Fatiche', menuTitle: 'LE DIECI FATICHE', points: 100, questions: Array.from({ length: 10 }, (_, index) => ({ kind: ['risposta secca', 'risposta multipla', 'elenco', 'spiegazione'][index % 4], question: `Fatica ${index + 1}`, options: index % 4 === 1 ? ['A', 'B', 'C', 'D'] : [], answer: `Risposta ${index + 1}`, explanation: 'Spiegazione opzionale.' })) }),
    guillotine: () => ({ id: createId('game'), type: 'guillotine', title: 'Ghigliottina', menuTitle: 'GHIGLIOTTINA', points: 200, words: ['parola 1', 'parola 2', 'parola 3', 'parola 4', 'parola 5'], answer: 'Risposta collegata' }),
    pass: () => ({ id: createId('game'), type: 'pass', title: 'Passaparola', menuTitle: 'PASSAPAROLA', difficulty: 'facile', points: { facile: 5, medio: 10, difficile: 20 }, bonus: { facile: 200, medio: 500, difficile: 1000 }, questions: alphabet.map(letter => ({ letter, question: `Con la ${letter}: domanda`, answer: `Risposta con ${letter}` })) }),
    jeopardy: () => ({ id: createId('game'), type: 'jeopardy', title: 'Jeopardy', menuTitle: 'JEOPARDY', categories: ['Anime', 'Cinema', 'Serie TV', 'Musica', 'Gaming'].map(name => ({ name, clues: [100, 200, 300, 400, 500].map(value => ({ value, question: `Domanda ${name} da ${value}`, answer: `Risposta ${name} ${value}` })) })) }),
    sarabanda: () => ({ id: createId('game'), type: 'sarabanda', title: 'Sarabanda', menuTitle: 'SARABANDA', pointsTitle: 25, pointsArtist: 25, songs: [{ audio: 'public/assets/audio/demo-tone.wav', title: 'Tono demo', artist: 'Trivia Challenge' }] })
  };
}

export function createStarWarsGames({ alphabet }) {
  const cluePoints = [1000, 900, 750, 600, 400, 200, 100, 50, 20, 10];
  const jeopardyCategories = ['Star Wish', 'TripWarsvisor', 'Tinderata Galattica', 'LinkedIn Spaziale', 'Titoli Clickbait'];
  return [
    {
      id: 'star-wars-pixel',
      type: 'guess',
      variant: 'pixel',
      title: 'Indovina il personaggio: Pixel',
      menuTitle: 'INDOVINA IL PERSONAGGIO: PIXEL',
      rounds: [{
        answer: 'Qui-Gon Jinn',
        acceptedAnswers: ['Qui-Gon', 'Qui Gon', 'Maestro Qui-Gon'],
        points: [1000, 500, 250, 100],
        clues: [
          { label: '1000', image: 'public/assets/star-wars/pixel/qui-gon-1.png' },
          { label: '500', image: 'public/assets/star-wars/pixel/qui-gon-2.png' },
          { label: '250', image: 'public/assets/star-wars/pixel/qui-gon-3.png' },
          { label: '100', image: 'public/assets/star-wars/pixel/qui-gon-4.png' }
        ]
      }]
    },
    {
      id: 'star-wars-clues',
      type: 'clues',
      title: 'Indovina il personaggio: Indizi',
      menuTitle: 'INDOVINA IL PERSONAGGIO: INDIZI',
      questions: [{
        answer: 'Jango Fett',
        acceptedAnswers: ['Jango'],
        clues: ['66 BBY', 'Orlo Esterno', 'Maschio', '1,83 m', 'Trilogia prequel', 'Repubblica Galattica', 'Ucciso da Mace Windu', 'Jetpack', 'Cacciatore di taglie', 'Mandaloriano'],
        points: cluePoints
      }]
    },
    {
      id: 'star-wars-geoguessr',
      type: 'geoguessr',
      title: 'Geoguessr',
      menuTitle: 'GEOGUESSR',
      points: 300,
      questions: [{
        prompt: 'Su quale pianeta si trova questo luogo?',
        image: 'public/assets/star-wars/geoguessr/tatooine.svg',
        answer: 'Tatooine'
      }]
    },
    {
      id: 'star-wars-jeopardy',
      type: 'jeopardy',
      title: 'Jeopardy',
      menuTitle: 'JEOPARDY',
      categories: jeopardyCategories.map(name => ({
        name,
        clues: [100, 200, 300, 400, 500].map(value => ({
          value,
          question: `Domanda ${name} da ${value} punti`,
          answer: `Risposta ${name} ${value}`
        }))
      }))
    },
    {
      id: 'star-wars-pass',
      type: 'pass',
      title: 'Passaparola',
      menuTitle: 'PASSAPAROLA',
      difficulty: 'facile',
      points: { facile: 5, medio: 10, difficile: 20 },
      bonus: { facile: 200, medio: 500, difficile: 1000 },
      questions: alphabet.map(letter => ({
        letter,
        question: `Con la ${letter}: domanda a tema Star Wars`,
        answer: `Risposta con ${letter}`
      }))
    }
  ];
}
