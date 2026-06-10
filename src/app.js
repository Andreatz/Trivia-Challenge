const KEY = 'trivia-challenge-v2';
const LEGACY_KEY = 'trivia-challenge-v1';
const ABC = 'ABCDEFGHILMNOPQRSTUVZ'.split('');

const TYPES = {
  guess: 'Indovina il personaggio',
  bomb: 'Schiva la Bomba',
  said: "Chi l'ha detto",
  detail: 'Occhio al dettaglio',
  quote: 'Completa la Frase',
  chain: 'Reazione a catena',
  labors: 'Le Dieci Fatiche',
  guillotine: 'Ghigliottina',
  pass: 'Passaparola',
  jeopardy: 'Jeopardy',
  sarabanda: 'Sarabanda'
};

const MENU_ORDER = ['guess', 'bomb', 'jeopardy', 'pass', 'said', 'detail', 'quote', 'chain', 'labors', 'guillotine', 'sarabanda'];
const CATEGORY_ICONS = { Anime: '✦', Cinema: '▣', 'Serie TV': '▢', Musica: '♫', Gaming: '☍' };
const REFERENCE_IMAGES = [
  '1. Schermata Principale.png',
  '2. Lista Anime.png',
  '3. Schermata Poteri Giocatore 1.png',
  '4. Schermata Poteri Giocatore 2.png',
  '5. Schermata Poteri Giocatore 3.png',
  '6. Punti.png',
  '7. Schermata Minigioco 1.png',
  '8. Schermata Minigioco 2.png',
  '11. Schermata Minigioco 3.png',
  '12. Schermata Minigioco 4.png',
  '14. Schermata Minigioco 5.png',
  '17. Schermata Minigioco 6.png',
  '20. Schermata Minigioco 7.png',
  '25. Schermata Minigioco 8.png',
  '28. Schermata Minigioco 9.png',
  '33. Schermata Schermata Minigioco 10.png',
  '36. Schermata Minigioco 11.png'
];

const id = prefix => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
const clone = value => JSON.parse(JSON.stringify(value));

const animeList = [
  'Attack on Titans', 'Berserk', 'Bleach', 'Chainsaw Man', 'Code Geass', 'Death Note', 'Demon Slayer', 'Dragon Ball', 'Frieren', 'Hunter X Hunter', 'Jujutsu Kaisen', 'Made in Abyss', 'My Hero Academia', 'Naruto', 'One Piece', 'One Punch Man', 'Overlord', 'Pokemon', 'Seven Deadly Sins', 'Vinland Saga'
];

const powers = [
  { player: 'Livio', name: 'Mussolivio non vuole', text: 'Rendi nulla la risposta di un avversario e impediscigli di prendere punti. Massimo due utilizzi.' },
  { player: 'Livio', name: 'The Wolf of Avezzano', text: 'Se rispondi correttamente, ottieni un bonus extra deciso dal presentatore.' },
  { player: 'Melia', name: 'Don Meliadolf', text: 'Puoi aiutare un avversario rispondendo al posto suo: se la risposta è corretta, entrambi prendete punti.' },
  { player: 'Melia', name: 'Bodyguard personale', text: 'Una protezione speciale ti salva da una penalità o da un furto punti.' },
  { player: 'Maggi', name: 'In medio stat virtus', text: 'Se al termine di un minigioco sei esattamente secondo, ottieni 200 punti.' },
  { player: 'Maggi', name: 'Freebooter', text: 'Rubi una possibilità o un piccolo bonus a un avversario, a discrezione del presentatore.' }
];

const templates = {
  guess: () => ({ id: id('game'), type: 'guess', title: 'Indovina il personaggio', menuTitle: 'INDOVINA IL PERSONAGGIO', rounds: [{ answer: 'Nome personaggio', points: [1000, 500, 250, 50], clues: [{ label: '1000', image: 'public/assets/personaggio-1.jpg' }, { label: '500', image: 'public/assets/personaggio-2.jpg' }, { label: '250', image: 'public/assets/personaggio-3.jpg' }, { label: '50', image: 'public/assets/personaggio-4.jpg' }] }] }),
  bomb: () => ({ id: id('game'), type: 'bomb', title: 'Schiva la Bomba', menuTitle: 'SCHIVA LA BOMBA!', question: 'Trova i 16 elementi collegati alla domanda ed evita le 4 bombe.', pointsPerCorrect: 50, items: Array.from({ length: 20 }, (_, i) => ({ label: `Elemento ${i + 1}`, image: '', isBomb: i >= 16 })) }),
  said: () => ({ id: id('game'), type: 'said', title: "Chi l'ha detto", menuTitle: "CHI L'HA DETTO", points: 100, questions: [{ prompt: 'Ascolta l audio e indovina il personaggio.', audio: 'public/assets/frase-1.mp3', answer: 'Personaggio', media: 'public/assets/risposta.jpg' }] }),
  detail: () => ({ id: id('game'), type: 'detail', title: 'Occhio al dettaglio', menuTitle: 'OCCHIO AL DETTAGLIO', points: 200, questions: [{ detailImage: 'public/assets/dettaglio.jpg', fullImage: 'public/assets/scena-completa.jpg', answer: 'Contesto completo della scena' }] }),
  quote: () => ({ id: id('game'), type: 'quote', title: 'Completa la Frase', menuTitle: 'COMPLETA LA FRASE', points: 200, questions: [{ partial: 'Io sono tuo...', answer: 'padre', source: 'Star Wars' }] }),
  chain: () => ({ id: id('game'), type: 'chain', title: 'Reazione a catena', menuTitle: 'REAZIONE A CATENA', topic: 'Argomento', points: 50, questions: Array.from({ length: 20 }, (_, i) => ({ question: `Domanda sequenziale ${i + 1}`, answer: `Risposta ${i + 1}` })) }),
  labors: () => ({ id: id('game'), type: 'labors', title: 'Le Dieci Fatiche', menuTitle: 'LE DIECI FATICHE', points: 100, questions: Array.from({ length: 10 }, (_, i) => ({ kind: ['risposta secca', 'risposta multipla', 'elenco', 'spiegazione'][i % 4], question: `Fatica ${i + 1}`, options: i % 4 === 1 ? ['A', 'B', 'C', 'D'] : [], answer: `Risposta ${i + 1}`, explanation: 'Spiegazione opzionale.' })) }),
  guillotine: () => ({ id: id('game'), type: 'guillotine', title: 'Ghigliottina', menuTitle: 'GHIGLIOTTINA', points: 200, words: ['parola 1', 'parola 2', 'parola 3', 'parola 4', 'parola 5'], answer: 'Risposta collegata' }),
  pass: () => ({ id: id('game'), type: 'pass', title: 'Passaparola', menuTitle: 'PASSAPAROLA', difficulty: 'facile', points: { facile: 5, medio: 10, difficile: 20 }, bonus: { facile: 200, medio: 500, difficile: 1000 }, questions: ABC.map(letter => ({ letter, question: `Con la ${letter}: domanda`, answer: `Risposta con ${letter}`, status: 'pending' })) }),
  jeopardy: () => ({ id: id('game'), type: 'jeopardy', title: 'Jeopardy', menuTitle: 'JEOPARDY', categories: ['Anime', 'Cinema', 'Serie TV', 'Musica', 'Gaming'].map(name => ({ name, clues: [100, 200, 300, 400, 500].map(value => ({ value, question: `Domanda ${name} da ${value}`, answer: `Risposta ${name} ${value}`, used: false })) })) }),
  sarabanda: () => ({ id: id('game'), type: 'sarabanda', title: 'Sarabanda', menuTitle: 'SARABANDA', pointsTitle: 25, pointsArtist: 25, songs: [{ audio: 'public/assets/canzone-1.mp3', title: 'Titolo brano', artist: 'Artista' }] })
};

const defaults = () => ({
  title: 'TRIVIA CHALLENGE',
  subtitle: 'ANIME EDITION',
  players: [{ id: id('p'), name: 'LIVIO', score: 0 }, { id: id('p'), name: 'MELIA', score: 0 }, { id: id('p'), name: 'MAGGI', score: 0 }],
  games: Object.values(templates).map(factory => factory()),
  library: animeList,
  powers,
  history: []
});

let state = load();
let view = 'show';
let gameId = state.games[0]?.id;
let playerId = state.players[0]?.id;
let cur = { screen: 'hub', i: 0, revealed: 0, answer: false, selected: [], jeo: null };
let editing = '';

function load() {
  for (const key of [KEY, LEGACY_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed.games?.length && parsed.players?.length) return hydrate(parsed);
    } catch (error) {
      console.warn(error);
    }
  }
  return defaults();
}

function hydrate(data) {
  data.title = data.title || 'TRIVIA CHALLENGE';
  data.subtitle = data.subtitle || 'ANIME EDITION';
  data.library = data.library?.length ? data.library : animeList;
  data.powers = data.powers?.length ? data.powers : powers;
  data.history = data.history || [];
  data.players = data.players?.length ? data.players.map(player => ({ ...player, name: String(player.name || 'PLAYER').toUpperCase(), score: Number(player.score || 0) })) : defaults().players;
  data.games = (data.games || []).map(game => ({ ...game, menuTitle: game.menuTitle || game.title || label(game.type) }));
  return data;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function $(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === false || value == null) return;
    if (key === 'class') node.className = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style') node.setAttribute('style', value);
    else if (key === 'value') node.value = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else node.setAttribute(key, value === true ? '' : value);
  });
  kids.flat(Infinity).forEach(child => {
    if (child != null && child !== false) node.append(child.nodeType ? child : document.createTextNode(child));
  });
  return node;
}

function game() { return state.games.find(item => item.id === gameId) || state.games[0]; }
function player() { return state.players.find(item => item.id === playerId) || state.players[0]; }
function label(type) { return TYPES[type] || type; }

function toast(message) {
  const node = $('div', { class: 'toast' }, message);
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 220);
  }, 2200);
}

function add(points, reason) {
  const active = player();
  if (!active) return toast('Crea un giocatore.');
  active.score = Number(active.score || 0) + Number(points || 0);
  state.history.unshift({ id: id('h'), playerName: active.name, points: Number(points || 0), reason, at: new Date().toISOString() });
  state.history = state.history.slice(0, 120);
  save();
  toast(`${active.name}: ${points > 0 ? '+' : ''}${points}`);
  render();
}

function media(src, alt = 'media') {
  if (!src) return $('span', { class: 'muted' }, 'Media non configurato');
  if (/\.(mp4|webm|mov)$/i.test(src)) return $('video', { src, controls: true, playsinline: true });
  return $('img', { src, alt, loading: 'lazy' });
}

function audio(src) {
  return src ? $('audio', { src, controls: true }) : $('span', { class: 'muted' }, 'Audio non configurato');
}

function top() {
  return $('header', { class: 'app-top' },
    $('div', {}, $('div', { class: 'kicker' }, 'Studio mode'), $('h1', {}, 'Trivia Challenge Studio')),
    $('nav', { class: 'app-nav' }, nav('show', 'Show'), nav('admin', 'Admin'), nav('scores', 'Punteggi'))
  );
}

function nav(targetView, text) {
  return $('button', { class: view === targetView ? 'active' : '', onclick: () => { view = targetView; render(); } }, text);
}

function render() {
  document.body.dataset.view = view;
  document.getElementById('app').replaceChildren(top(), view === 'show' ? show() : view === 'admin' ? admin() : scores());
}

function resetStage(screen = 'hub') {
  cur = { screen, i: 0, revealed: 0, answer: false, selected: [], jeo: null };
  render();
}

function selectGame() {
  const select = $('select', { onchange: event => { gameId = event.target.value; resetStage('game'); } });
  state.games.forEach(item => select.append($('option', { value: item.id, selected: item.id === gameId }, `${item.title} · ${label(item.type)}`)));
  return select;
}

function selectPlayer() {
  const select = $('select', { onchange: event => { playerId = event.target.value; render(); } });
  state.players.forEach(item => select.append($('option', { value: item.id, selected: item.id === playerId }, `${item.name} (${item.score} pt)`)));
  return select;
}

function show() {
  const content = cur.screen === 'hub' ? hub() : cur.screen === 'points' ? pointsScreen() : cur.screen === 'library' ? libraryScreen() : cur.screen === 'powers' ? powersScreen() : gameScreen();
  return $('main', { class: 'show-layout' }, stage(content));
}

function stage(content) {
  return $('section', { class: 'ppt-stage' }, stageToolbar(), $('div', { class: 'stage-content' }, content), bottomScores());
}

function stageToolbar() {
  return $('div', { class: 'stage-toolbar' },
    $('button', { class: 'gear-btn', title: 'Admin', onclick: () => { view = 'admin'; render(); } }, '⚙'),
    $('div', { class: 'stage-brand' },
      $('div', { class: 'edition-line' }, $('span', {}, state.subtitle || 'ANIME EDITION')),
      $('div', { class: 'main-logo' }, state.title || 'TRIVIA CHALLENGE')
    ),
    $('div', { class: 'stage-actions' },
      $('button', { class: 'top-action', onclick: () => resetStage('library') }, $('span', {}, '▣'), ' LISTA ANIME'),
      $('button', { class: 'top-action', onclick: () => resetStage('powers') }, $('span', {}, 'ϟ'), ' POTERI'),
      $('button', { class: 'top-action', onclick: () => resetStage('points') }, $('span', {}, '★'), ' PUNTI'),
      $('button', { class: 'top-action icon-only', title: 'Reset', onclick: () => { cur = { ...cur, i: 0, revealed: 0, answer: false, selected: [], jeo: null }; render(); } }, '↻')
    )
  );
}

function bottomScores() {
  return $('div', { class: 'bottom-scorebar' },
    ...state.players.map((item, index) => $('button', { class: `player-chip ${item.id === playerId ? 'selected' : ''} ${index === 0 ? 'leader' : ''}`, onclick: () => { playerId = item.id; render(); } },
      $('span', {}, item.name),
      $('strong', {}, item.score || 0)
    ))
  );
}

function hub() {
  const groups = MENU_ORDER.map(type => state.games.find(item => item.type === type)).filter(Boolean);
  return $('div', { class: 'hub-screen' },
    $('div', { class: 'game-ribbon wide' }, 'SELEZIONA MINIGIOCO'),
    $('div', { class: 'menu-board' },
      ...groups.map(item => $('button', { class: 'ppt-button menu-button', onclick: () => { gameId = item.id; resetStage('game'); } }, item.menuTitle || item.title))
    )
  );
}

function gameScreen() {
  const selected = game();
  if (!selected) return $('div', { class: 'intro-screen' }, $('h2', {}, 'Nessun minigioco'));
  return $('div', { class: 'game-shell' }, $('div', { class: 'game-ribbon' }, selected.menuTitle || label(selected.type)), renderGame(selected));
}

function pointsScreen() {
  const values = [-250, -100, -25, -5, 5, 10, 25, 50, 100, 250, 500, 1000];
  return $('div', { class: 'points-screen' },
    $('h2', {}, 'PUNTI'),
    $('div', { class: 'points-columns' },
      ...state.players.map(item => $('div', { class: 'points-card' },
        $('h3', {}, `${item.name}:`),
        $('div', { class: 'mega-score' }, item.score || 0),
        $('div', { class: 'score-buttons' },
          ...values.map(value => $('button', { class: `score-btn ${value > 0 ? 'plus' : 'minus'}`, onclick: () => { playerId = item.id; add(value, 'pannello punti'); } }, value > 0 ? `+${value}` : String(value)))
        ),
        $('button', { class: 'btn danger', onclick: () => { item.score = 0; save(); render(); } }, `Reset ${item.name}`)
      ))
    )
  );
}

function libraryScreen() {
  return $('div', { class: 'library-screen' }, $('h2', {}, 'LISTA ANIME'), $('div', { class: 'library-grid' }, ...state.library.map(item => $('button', { class: 'ppt-button library-tile' }, item))));
}

function powersScreen() {
  return $('div', { class: 'powers-screen' }, $('h2', {}, 'POTERI'), $('div', { class: 'power-grid' }, ...state.powers.map(item => $('article', { class: 'power-card' }, $('div', { class: 'power-owner' }, item.player), $('h3', {}, item.name), $('p', {}, item.text)))));
}

function answer(text) {
  return $('div', { class: `answer ${cur.answer ? 'on' : ''}` }, cur.answer ? $('strong', {}, text || 'Risposta non configurata') : 'Risposta nascosta');
}

function controls(g, ans, points, after) {
  return $('div', { class: 'host-actions' },
    $('button', { class: 'btn success', onclick: () => { after?.(); add(points, `${g.title}: risposta corretta`); } }, `Corretta · +${points}`),
    $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta'),
    answer(ans)
  );
}

function pager(total) {
  return $('div', { class: 'pager' },
    $('button', { class: 'btn', disabled: cur.i <= 0, onclick: () => { cur.i--; cur.answer = false; cur.revealed = 0; cur.jeo = null; render(); } }, '←'),
    $('span', {}, `${Math.min(cur.i + 1, total || 1)} / ${total || 1}`),
    $('button', { class: 'btn', disabled: cur.i >= total - 1, onclick: () => { cur.i++; cur.answer = false; cur.revealed = 0; cur.jeo = null; render(); } }, '→')
  );
}

function renderGame(g) {
  return ({ guess, bomb, said, detail, quote, chain, labors, guillotine, pass, jeopardy, sarabanda }[g.type] || unsupported)(g);
}

function unsupported(g) { return $('div', { class: 'intro-screen' }, $('h2', {}, `Tipo non supportato: ${g.type}`)); }

function guess(g) {
  const rounds = g.rounds || [];
  const round = rounds[cur.i] || rounds[0];
  if (!round) return $('div', { class: 'intro-screen' }, 'Nessun round.');
  const clues = (round.clues || []).map(item => typeof item === 'string' ? { label: '?', image: item } : item);
  const shown = Math.min(cur.revealed, clues.length);
  const pts = (round.points || [1000, 500, 250, 50])[Math.max(0, shown - 1)] || 0;
  return $('div', { class: 'guess-screen' },
    $('div', { class: 'guess-grid' },
      ...clues.map((clue, index) => $('button', { class: `guess-tile ${index < shown ? 'revealed' : 'covered'}`, onclick: () => { if (index >= shown) { cur.revealed = Math.max(cur.revealed, index + 1); render(); } } }, index < shown ? media(clue.image, `Indizio ${index + 1}`) : $('span', {}, clue.label || round.points?.[index] || '?')))
    ),
    $('div', { class: 'host-actions' },
      $('button', { class: 'btn primary', disabled: shown >= clues.length, onclick: () => { cur.revealed++; render(); } }, 'Rivela'),
      $('button', { class: 'btn success', disabled: shown === 0, onclick: () => add(pts, `${g.title}: ${shown} indizi`) }, `Corretta · +${pts}`),
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta')
    ),
    answer(round.answer),
    pager(rounds.length)
  );
}

function bomb(g) {
  const selected = new Set(cur.selected || []);
  const items = g.items || [];
  const ok = items.filter((item, index) => selected.has(index) && !item.isBomb).length;
  const bad = items.filter((item, index) => selected.has(index) && item.isBomb).length;
  return $('div', { class: 'bomb-screen' },
    $('div', { class: 'bomb-question' }, g.question || 'Evita le bombe.'),
    $('div', { class: 'bomb-grid' },
      ...items.map((item, index) => $('button', { class: `bomb-tile ${selected.has(index) ? (item.isBomb ? 'bomb' : 'ok') : ''}`, onclick: () => { selected.has(index) ? selected.delete(index) : selected.add(index); cur.selected = [...selected]; render(); } }, item.image ? media(item.image, item.label) : $('span', {}, item.label || `Elemento ${index + 1}`)))
    ),
    $('div', { class: 'host-actions' },
      $('span', { class: 'pill' }, `Corrette ${ok}`),
      $('span', { class: 'pill' }, `Bombe ${bad}`),
      $('button', { class: 'btn success', onclick: () => add(ok * (g.pointsPerCorrect || 50), `${g.title}: ${ok} elementi corretti`) }, `Assegna ${ok * (g.pointsPerCorrect || 50)} pt`),
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi bombe' : 'Mostra bombe')
    ),
    cur.answer ? $('div', { class: 'answer on' }, `Bombe: ${items.filter(item => item.isBomb).map(item => item.label).join(', ')}`) : null
  );
}

function linear(g, list, fn) {
  const q = list[cur.i] || list[0];
  return q ? $('div', { class: 'linear-screen' }, fn(q), pager(list.length)) : $('div', { class: 'intro-screen' }, 'Nessun contenuto.');
}

function said(g) { return linear(g, g.questions || [], q => $('div', { class: 'audio-screen' }, $('h2', {}, q.prompt || 'Ascolta e indovina'), audio(q.audio), cur.answer ? $('div', { class: 'answer-media' }, media(q.media, q.answer)) : null, controls(g, q.answer, g.points || 100))); }
function detail(g) { return linear(g, g.questions || [], q => $('div', { class: 'detail-screen' }, $('h2', {}, 'OCCHIO AL DETTAGLIO'), $('div', { class: 'detail-media' }, media(cur.answer ? q.fullImage : q.detailImage, q.answer)), controls(g, q.answer, g.points || 200))); }
function quote(g) { return linear(g, g.questions || [], q => $('div', { class: 'quote-screen' }, $('div', { class: 'quote-mark' }, `“${q.partial || 'Citazione parziale'}”`), q.source ? $('p', { class: 'muted' }, q.source) : null, controls(g, q.answer, g.points || 200))); }
function chain(g) { return linear(g, g.questions || [], q => $('div', { class: 'chain-screen' }, $('div', { class: 'topic' }, g.topic || 'Argomento'), $('h2', {}, q.question), controls(g, q.answer, g.points || 50))); }
function labors(g) { return linear(g, g.questions || [], q => $('div', { class: 'labor-screen' }, $('div', { class: 'topic' }, q.kind || 'tipologia'), $('h2', {}, q.question), q.options?.length ? $('div', { class: 'option-grid' }, ...q.options.map(option => $('div', { class: 'ppt-button' }, option))) : null, controls(g, `${q.answer || ''}${q.explanation ? ' · ' + q.explanation : ''}`, g.points || 100))); }
function guillotine(g) { return $('div', { class: 'guillotine-screen' }, $('h2', {}, 'GHIGLIOTTINA'), $('div', { class: 'word-cloud' }, ...(g.words || []).map(word => $('div', { class: 'ppt-button word' }, word))), controls(g, g.answer, g.points || 200)); }

function pass(g) {
  const questions = g.questions || [];
  const q = questions[cur.i] || questions[0];
  const difficulty = g.difficulty || 'facile';
  const pts = g.points?.[difficulty] ?? 5;
  const bonus = g.bonus?.[difficulty] ?? 0;
  const allCorrect = questions.length && questions.every(item => item.status === 'correct');
  if (!q) return $('div', { class: 'intro-screen' }, 'Nessuna domanda.');
  return $('div', { class: 'pass-screen' },
    $('div', { class: 'pass-wheel' },
      ...questions.map((item, index) => {
        const angle = (360 / questions.length) * index - 90;
        return $('button', { class: `pass-letter ${item.status === 'correct' ? 'ok' : item.status === 'wrong' ? 'wrong' : item.status === 'pass' ? 'passed' : ''} ${index === cur.i ? 'current' : ''}`, style: `--angle:${angle}deg`, onclick: () => { cur.i = index; cur.answer = false; render(); } }, item.letter);
      }),
      $('div', { class: 'wheel-core' }, $('strong', {}, q.letter), $('span', {}, difficulty.toUpperCase()))
    ),
    $('div', { class: 'pass-question' },
      $('div', { class: 'timer-box' }, '00:50'),
      $('h2', {}, q.question),
      $('div', { class: 'host-actions' },
        $('button', { class: 'btn success', onclick: () => { q.status = 'correct'; add(pts, `${g.title}: lettera ${q.letter}`); } }, `Corretta · +${pts}`),
        $('button', { class: 'btn danger', onclick: () => { q.status = 'wrong'; save(); render(); } }, 'Sbagliata'),
        $('button', { class: 'btn warn', onclick: () => { q.status = 'pass'; save(); render(); } }, 'Passo'),
        allCorrect ? $('button', { class: 'btn primary', onclick: () => add(bonus, `${g.title}: bonus ${difficulty}`) }, `Bonus · +${bonus}`) : null,
        $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Risposta')
      ),
      answer(q.answer)
    )
  );
}

function jeopardy(g) {
  const categories = g.categories || [];
  if (cur.jeo) {
    const category = categories[cur.jeo.c];
    const clue = category?.clues?.[cur.jeo.q];
    if (clue) return $('div', { class: 'jeopardy-question' }, $('div', { class: 'topic' }, `${category.name} · ${clue.value} punti`), $('h2', {}, clue.question), controls(g, clue.answer, clue.value, () => { clue.used = true; cur.jeo = null; save(); }), $('button', { class: 'btn ghost', onclick: () => { cur.jeo = null; render(); } }, 'Torna al tabellone'));
  }
  return $('div', { class: 'jeopardy-board' },
    ...categories.map((category, categoryIndex) => $('div', { class: 'jeopardy-col' },
      $('div', { class: 'jeopardy-cat' }, $('span', { class: 'cat-icon' }, CATEGORY_ICONS[category.name] || '✦'), $('strong', {}, category.name)),
      ...(category.clues || []).map((clue, clueIndex) => $('button', { class: `jeopardy-cell ${clue.used ? 'used' : ''}`, disabled: clue.used, onclick: () => { cur.jeo = { c: categoryIndex, q: clueIndex }; cur.answer = false; render(); } }, clue.value))
    ))
  );
}

function sarabanda(g) { return linear(g, g.songs || [], song => $('div', { class: 'sarabanda-screen' }, $('h2', {}, 'SARABANDA'), audio(song.audio), $('div', { class: 'host-actions' }, $('button', { class: 'btn success', onclick: () => add(g.pointsTitle || 25, `${g.title}: titolo`) }, `Titolo · +${g.pointsTitle || 25}`), $('button', { class: 'btn success', onclick: () => add(g.pointsArtist || 25, `${g.title}: autore`) }, `Autore · +${g.pointsArtist || 25}`), $('button', { class: 'btn primary', onclick: () => add((g.pointsTitle || 25) + (g.pointsArtist || 25), `${g.title}: completa`) }, 'Completa · +50'), $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta')), answer(`${song.title || 'Titolo'} · ${song.artist || 'Artista'}`))); }

function history() {
  return $('section', { class: 'history-box' }, $('h3', {}, 'Storico'), ...(state.history.length ? state.history.slice(0, 7).map(item => $('div', { class: 'history-row' }, $('span', {}, item.playerName), $('small', {}, item.reason), $('strong', {}, `${item.points > 0 ? '+' : ''}${item.points}`))) : [$('p', { class: 'muted' }, 'Nessun punto assegnato.')]));
}

function admin() {
  const typeSelect = $('select', { id: 'type', onchange: preview });
  Object.entries(TYPES).forEach(([value, text]) => typeSelect.append($('option', { value }, text)));
  const titleInput = $('input', { id: 'title', value: 'Nuovo minigioco', oninput: () => { if (!editing) preview(); } });
  const jsonArea = $('textarea', { id: 'json' });
  setTimeout(preview);
  return $('main', { class: 'grid two' },
    $('section', { class: 'panel stack' },
      $('h2', {}, 'Admin contenuti'),
      $('p', { class: 'muted' }, 'Tema show in stile anime neon game. Da qui gestisci contenuti, giocatori, lista anime e poteri.'),
      $('div', { class: 'grid two' },
        $('label', {}, 'Titolo evento', $('input', { value: state.title || '', onchange: event => { state.title = event.target.value; save(); render(); } })),
        $('label', {}, 'Sottotitolo', $('input', { value: state.subtitle || '', onchange: event => { state.subtitle = event.target.value; save(); render(); } }))
      ),
      $('div', { class: 'grid two' }, $('label', {}, 'Tipo minigioco', typeSelect), $('label', {}, 'Titolo', titleInput)),
      $('label', {}, 'Contenuto JSON', jsonArea),
      $('div', { class: 'row' },
        $('button', { class: 'btn primary', onclick: saveEditor }, editing ? 'Salva modifiche' : 'Crea minigioco'),
        $('button', { class: 'btn', onclick: () => { editing = ''; preview(); } }, 'Nuovo da template'),
        $('button', { class: 'btn', onclick: exportData }, 'Esporta JSON'),
        $('label', { class: 'btn ghost' }, 'Importa JSON', $('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: importData }))
      ),
      playersAdmin(), libraryAdmin(), powersAdmin()
    ),
    $('aside', { class: 'panel stack' },
      $('h3', {}, 'Minigiochi salvati'),
      ...state.games.map(item => $('div', { class: 'saved-game' }, $('div', {}, $('strong', {}, item.title), $('small', {}, label(item.type))), $('div', { class: 'row' }, $('button', { class: 'btn small', onclick: () => edit(item.id) }, 'Modifica'), $('button', { class: 'btn small', onclick: () => dup(item.id) }, 'Duplica'), $('button', { class: 'btn small danger', onclick: () => del(item.id) }, 'Elimina')))),
      $('h3', {}, 'Immagini riferimento repo'),
      $('div', { class: 'reference-grid' }, ...REFERENCE_IMAGES.map(name => $('a', { href: `public/reference-images/${encodeURIComponent(name)}`, target: '_blank', class: 'ref-thumb' }, $('img', { src: `public/reference-images/${encodeURIComponent(name)}`, alt: name }), $('span', {}, name.replace(/^\d+\.\s*/, '').replace('.png', '')))))
    )
  );
}

function preview() {
  const type = document.getElementById('type')?.value || 'guess';
  const title = document.getElementById('title')?.value || 'Nuovo minigioco';
  const jsonArea = document.getElementById('json');
  if (!jsonArea) return;
  const item = templates[type]();
  item.title = title;
  item.menuTitle = title.toUpperCase();
  jsonArea.value = JSON.stringify(item, null, 2);
}

function saveEditor() {
  try {
    const item = JSON.parse(document.getElementById('json').value);
    item.id = item.id || id('game');
    item.title = document.getElementById('title').value.trim() || item.title;
    item.menuTitle = item.menuTitle || item.title?.toUpperCase();
    const index = state.games.findIndex(game => game.id === (editing || item.id));
    index >= 0 ? state.games[index] = item : state.games.unshift(item);
    gameId = item.id;
    editing = '';
    save();
    toast('Minigioco salvato');
    render();
  } catch (error) {
    toast(`JSON non valido: ${error.message}`);
  }
}

function edit(gid) {
  const item = state.games.find(game => game.id === gid);
  if (!item) return;
  editing = gid;
  render();
  document.getElementById('type').value = item.type;
  document.getElementById('title').value = item.title || '';
  document.getElementById('json').value = JSON.stringify(item, null, 2);
}

function dup(gid) {
  const item = clone(state.games.find(game => game.id === gid));
  item.id = id('game');
  item.title += ' copia';
  item.menuTitle = `${item.menuTitle || item.title} COPIA`;
  state.games.unshift(item);
  save();
  render();
}

function del(gid) {
  const item = state.games.find(game => game.id === gid);
  if (!item || !confirm(`Eliminare “${item.title}”?`)) return;
  state.games = state.games.filter(game => game.id !== gid);
  gameId = state.games[0]?.id;
  save();
  render();
}

function playersAdmin() {
  return $('section', { class: 'stack' },
    $('h3', {}, 'Giocatori'),
    $('div', { class: 'row' }, $('input', { id: 'pname', placeholder: 'Nome squadra o giocatore' }), $('button', { class: 'btn success', onclick: () => { const value = document.getElementById('pname').value.trim(); if (!value) return toast('Inserisci un nome.'); const newPlayer = { id: id('p'), name: value.toUpperCase(), score: 0 }; state.players.push(newPlayer); playerId = newPlayer.id; save(); render(); } }, 'Aggiungi')),
    ...state.players.map(item => $('div', { class: 'score-card' }, $('input', { value: item.name, onchange: event => { item.name = event.target.value.toUpperCase(); save(); render(); } }), $('input', { type: 'number', value: item.score || 0, onchange: event => { item.score = Number(event.target.value || 0); save(); render(); } }), $('button', { class: 'btn danger', onclick: () => { if (state.players.length < 2) return toast('Deve restare almeno un giocatore.'); state.players = state.players.filter(player => player.id !== item.id); playerId = state.players[0]?.id; save(); render(); } }, 'Rimuovi')))
  );
}

function libraryAdmin() { return $('section', { class: 'stack' }, $('h3', {}, 'Lista Anime / Argomenti'), $('textarea', { value: state.library.join('\n'), style: 'min-height:160px', onchange: event => { state.library = event.target.value.split('\n').map(item => item.trim()).filter(Boolean); save(); render(); } })); }
function powersAdmin() { return $('section', { class: 'stack' }, $('h3', {}, 'Poteri'), $('textarea', { value: JSON.stringify(state.powers, null, 2), style: 'min-height:180px', onchange: event => { try { state.powers = JSON.parse(event.target.value); save(); toast('Poteri aggiornati'); } catch { toast('JSON poteri non valido'); } } })); }
function scores() { return $('main', { class: 'grid two' }, $('section', { class: 'panel stack' }, $('h2', {}, 'Gestione manuale punteggi'), pointsScreen(), $('div', { class: 'row' }, $('button', { class: 'btn danger', onclick: () => { if (confirm('Azzerare tutti i punteggi?')) { state.players.forEach(item => item.score = 0); state.history = []; save(); render(); } } }, 'Azzera tutto'), $('button', { class: 'btn', onclick: () => { state.history = []; save(); render(); } }, 'Svuota storico'))), $('aside', { class: 'panel' }, history())); }
function exportData() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = $('a', { href: url, download: `trivia-challenge-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function importData(event) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = hydrate(JSON.parse(reader.result)); if (!data.games?.length || !data.players?.length) throw Error('Il file deve contenere games e players.'); state = data; gameId = state.games[0].id; playerId = state.players[0].id; save(); render(); toast('Dati importati'); } catch (error) { toast(`Import fallito: ${error.message}`); } }; reader.readAsText(file); }

render();
