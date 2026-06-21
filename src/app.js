import {
  calculateBombScore,
  guessPointsForReveal,
  nextPassIndex,
  passBonusForDifficulty,
  passPointsForDifficulty,
  passSummary
} from './core/game-rules.js';
import { CURRENT_SCHEMA_VERSION, prepareDocument, serializeDocument } from './core/schema.js';
import { formatTimer, pauseTimer, resetTimer, startTimer, timerRemaining } from './core/timer.js';
import { categoryIcon, createGameTemplates, GAME_LABELS } from './core/game-registry.js';
import { createGameContracts } from './core/game-contracts.js';
import { backupDocument, readFirstValid, writeDocument } from './core/storage.js';

const KEY = 'trivia-challenge-v3';
const LEGACY_KEYS = ['trivia-challenge-v2', 'trivia-challenge-v1'];
const BACKUP_KEY = 'trivia-challenge-backup';
const ABC = 'ABCDEFGHILMNOPQRSTUVZ'.split('');

const TYPES = GAME_LABELS;
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
  '33. Schermata Minigioco 10.png',
  '36. Schermata Minigioco 11.png'
];

const id = prefix => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
const clone = value => JSON.parse(JSON.stringify(value));
const SCORE_VALUES = [-250, -100, -25, -5, 5, 10, 25, 50, 100, 250, 500, 1000];
const DEFAULT_HOME_LAYOUT = {
  titleX: 50,
  titleY: 7,
  titleW: 66,
  titleSize: 82,
  subtitleX: 50,
  subtitleY: 4,
  subtitleW: 44,
  subtitleSize: 18,
  menuX: 50,
  menuY: 17,
  menuW: 38,
  toolbarButtonW: 146,
  toolbarButtonH: 56,
  toolbarButtonFont: 0.78,
  toolbarGap: 12
};
const UNDO_LIMIT = 20;
const SNAP_THRESHOLD = 1.4;
const SAVE_DEBOUNCE_MS = 350;

const animeList = [
  'Attack on Titan', 'Berserk', 'Bleach', 'Chainsaw Man', 'Code Geass', 'Death Note', 'Demon Slayer', 'Dragon Ball', 'Frieren', 'Hunter X Hunter', 'Jujutsu Kaisen', 'Made in Abyss', 'My Hero Academia', 'Naruto', 'One Piece', 'One Punch Man', 'Overlord', 'Pokemon', 'Seven Deadly Sins', 'Vinland Saga'
];

const powers = [
  { player: 'Livio', name: 'Mussolivio non vuole', text: 'Rendi nulla la risposta di un avversario e impediscigli di prendere punti. Massimo due utilizzi.' },
  { player: 'Livio', name: 'The Wolf of Avezzano', text: 'Se rispondi correttamente, ottieni un bonus extra deciso dal presentatore.' },
  { player: 'Melia', name: 'Don Meliadolf', text: 'Puoi aiutare un avversario rispondendo al posto suo: se la risposta è corretta, entrambi prendete punti.' },
  { player: 'Melia', name: 'Bodyguard personale', text: 'Una protezione speciale ti salva da una penalità o da un furto punti.' },
  { player: 'Maggi', name: 'In medio stat virtus', text: 'Se al termine di un minigioco sei esattamente secondo, ottieni 200 punti.' },
  { player: 'Maggi', name: 'Freebooter', text: 'Rubi una possibilità o un piccolo bonus a un avversario, a discrezione del presentatore.' }
];

const templates = createGameTemplates({ createId: id, alphabet: ABC });
const gameContracts = createGameContracts(
  Object.fromEntries(Object.entries(TYPES).map(([type, gameLabel]) => [type, { label: gameLabel }])),
  { guess, bomb, said, detail, quote, chain, labors, guillotine, pass, jeopardy, sarabanda }
);

const defaults = () => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  title: 'TRIVIA CHALLENGE',
  subtitle: 'ANIME EDITION',
  homeLayout: { ...DEFAULT_HOME_LAYOUT },
  players: [{ id: id('p'), name: 'LIVIO', score: 0 }, { id: id('p'), name: 'MELIA', score: 0 }, { id: id('p'), name: 'MAGGI', score: 0 }],
  games: Object.values(templates).map(factory => factory()),
  library: animeList,
  powers,
  settings: { soundsEnabled: true, alertsEnabled: true },
  history: [],
  session: { games: {} }
});

let state = load();
const restoredNavigation = state.session?.navigation || {};
let view = ['show', 'admin', 'scores'].includes(restoredNavigation.view) ? restoredNavigation.view : 'show';
let gameId = state.games.some(item => item.id === restoredNavigation.gameId) ? restoredNavigation.gameId : state.games[0]?.id;
let playerId = state.players[0]?.id;
let cur = {
  screen: ['hub', 'game', 'points', 'library', 'powers'].includes(restoredNavigation.screen) ? restoredNavigation.screen : 'hub',
  i: Number(restoredNavigation.i || 0),
  revealed: Number(restoredNavigation.revealed || 0),
  answer: false, selected: [], jeo: null
};
let editing = '';
let selectedElementId = '';
let directEdit = false;
let directEditPanel = 'layers';
let scorePanelPlayerId = '';
let undoStack = [];
let lastSavedSnapshot = JSON.stringify(serializeDocument(state));
let lastSavedContentSnapshot = JSON.stringify(editorialSnapshot(state));
let saveStatus = 'saved';
let pendingSave = null;
let timerInterval = null;
let localAssets = [];
let localThumbnails = {};
let audienceMode = false;
let helpOpen = false;

function load() {
  const result = readFirstValid(localStorage, [KEY, ...LEGACY_KEYS], prepareDocument);
  result.errors.forEach(({ key, error }) => console.warn(`Salvataggio ${key} ignorato:`, error));
  return result.document ? hydrate(result.document) : defaults();
}

function hydrate(data) {
  const content = data.content && typeof data.content === 'object' ? data.content : data;
  const persistedSession = data.session && typeof data.session === 'object' ? data.session : { games: {} };
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: content.title || 'TRIVIA CHALLENGE',
    subtitle: content.subtitle || 'ANIME EDITION',
    homeLayout: { ...DEFAULT_HOME_LAYOUT, ...(content.homeLayout || {}) },
    library: content.library?.length ? content.library : animeList,
    powers: content.powers?.length ? content.powers : powers,
    settings: data.settings && typeof data.settings === 'object' ? data.settings : { soundsEnabled: true, alertsEnabled: true },
    history: Array.isArray(data.history) ? data.history : [],
    session: {
      ...persistedSession,
      games: persistedSession.games && typeof persistedSession.games === 'object' ? persistedSession.games : {}
    },
    players: persistedSession.players?.length
      ? persistedSession.players.map(player => ({ ...player, name: String(player.name || 'PLAYER').toUpperCase(), score: Number(player.score || 0) }))
      : defaults().players,
    games: (content.games || []).map(game => gameContracts[game.type]?.normalize(game) || game)
  };
}

function editorialSnapshot(source) {
  return {
    title: source.title,
    subtitle: source.subtitle,
    homeLayout: clone(source.homeLayout || {}),
    games: clone(source.games || []),
    library: clone(source.library || []),
    powers: clone(source.powers || []),
    settings: clone(source.settings || {})
  };
}

function setSaveStatus(status) {
  saveStatus = status;
  const indicator = document.querySelector('[data-save-status]');
  if (!indicator) return;
  indicator.className = `save-status ${status}`;
  indicator.textContent = status === 'pending'
    ? 'Modifiche in corso'
    : status === 'failed'
      ? 'Salvataggio fallito'
      : 'Salvato';
}

function save() {
  clearTimeout(pendingSave);
  pendingSave = null;
  state.session.navigation = { view, screen: cur.screen, gameId, i: cur.i, revealed: cur.revealed };
  const nextSnapshot = JSON.stringify(serializeDocument(state));
  const nextContentSnapshot = JSON.stringify(editorialSnapshot(state));
  try {
    writeDocument(localStorage, KEY, nextSnapshot);
    if (nextContentSnapshot !== lastSavedContentSnapshot) {
      undoStack.push(lastSavedContentSnapshot);
      if (undoStack.length > UNDO_LIMIT) undoStack.shift();
      lastSavedContentSnapshot = nextContentSnapshot;
    }
    lastSavedSnapshot = nextSnapshot;
    setSaveStatus('saved');
    return true;
  } catch (error) {
    setSaveStatus('failed');
    toast(`Salvataggio non riuscito: ${error.message}`);
    return false;
  }
}

function scheduleSave() {
  clearTimeout(pendingSave);
  setSaveStatus('pending');
  pendingSave = setTimeout(save, SAVE_DEBOUNCE_MS);
}

function undoLastChange() {
  const snapshot = undoStack.pop();
  if (!snapshot) return toast('Nessuna modifica da annullare.');
  try {
    const editorial = JSON.parse(snapshot);
    Object.assign(state, editorial);
    if (!state.games.some(item => item.id === gameId)) gameId = state.games[0]?.id;
    if (!state.players.some(item => item.id === playerId)) playerId = state.players[0]?.id;
    if (!state.players.some(item => item.id === scorePanelPlayerId)) scorePanelPlayerId = '';
    lastSavedContentSnapshot = snapshot;
    lastSavedSnapshot = JSON.stringify(serializeDocument(state));
    writeDocument(localStorage, KEY, lastSavedSnapshot);
    toast('Modifica editoriale annullata');
    render();
  } catch (error) {
    toast(`Undo non riuscito: ${error.message}`);
  }
}

function handleUndoShortcut(event) {
  const active = document.activeElement;
  const isTextEditing = active && (active.matches?.('input, textarea, select') || active.isContentEditable);
  if (isTextEditing || !event.ctrlKey || event.shiftKey || event.altKey || event.metaKey || event.key.toLowerCase() !== 'z') return;
  event.preventDefault();
  undoLastChange();
}

function currentQuestionCount(item = game()) {
  if (!item) return 0;
  if (item.type === 'guess') return item.rounds?.length || 0;
  if (['said', 'detail', 'quote', 'chain', 'labors', 'pass'].includes(item.type)) return item.questions?.length || 0;
  if (item.type === 'sarabanda') return item.songs?.length || 0;
  return 0;
}

function handleHostShortcut(event) {
  const active = document.activeElement;
  const isTextEditing = active && (active.matches?.('input, textarea, select') || active.isContentEditable);
  if (isTextEditing || event.ctrlKey || event.altKey || event.metaKey) return;

  if (event.key.toLowerCase() === 'h' && view === 'show') {
    event.preventDefault();
    audienceMode = !audienceMode;
    render();
    toast(audienceMode ? 'Vista pubblico attiva' : 'Controlli host attivi');
    return;
  }

  if (view !== 'show' || cur.screen !== 'game' || directEdit) return;
  if (event.key === 'Escape' && helpOpen) {
    helpOpen = false;
    render();
    return;
  }
  if (event.key === '?') {
    event.preventDefault();
    helpOpen = !helpOpen;
    render();
    return;
  }
  const total = currentQuestionCount();
  if (total > 0 && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    cur.i = clamp(cur.i + (event.key === 'ArrowRight' ? 1 : -1), 0, total - 1);
    cur.answer = false;
    cur.revealed = 0;
    cur.jeo = null;
    render();
  }
  if (event.key === ' ' && cur.timer) {
    event.preventDefault();
    cur.timer.running ? pauseTimer(cur.timer) : startTimer(cur.timer);
    syncTimerLoop();
  }
  const shortcut = event.key.toLowerCase();
  const buttonPattern = shortcut === 'r'
    ? /mostra (risposta|bombe)|rivela/i
    : shortcut === 'c'
      ? /corretta|conferma \+/i
      : shortcut === 'x'
        ? /sbagliata|errata|nessun punto/i
        : shortcut === 'p'
          ? /^passo$/i
          : null;
  if (buttonPattern) {
    const target = [...document.querySelectorAll('.game-live-area button:not(:disabled)')]
      .find(button => buttonPattern.test(button.textContent.trim()));
    if (target) {
      event.preventDefault();
      target.click();
    }
  }
}

function $(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  if (tag === 'button' && attrs.type == null) node.type = 'button';
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
function scorePanelPlayer() { return state.players.find(item => item.id === scorePanelPlayerId); }
function activePlayer() { return state.players.find(item => item.id === playerId); }
function label(type) { return TYPES[type] || type; }

function gameProgress(item = game()) {
  state.session ||= { games: {} };
  state.session.games ||= {};
  if (!item) return {};
  return state.session.games[item.id] ||= {};
}

function progressEntry(item, group, key) {
  const progress = gameProgress(item);
  progress[group] ||= {};
  return progress[group][key] ||= {};
}

function toast(message) {
  const node = $('div', { class: 'toast', role: 'status', 'aria-live': 'polite' }, message);
  document.body.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 220);
  }, 2200);
}

function add(points, reason, targetPlayerId = scorePanelPlayerId || playerId) {
  if (arguments.length < 3 && view === 'show' && cur.screen === 'game' && !scorePanelPlayerId) {
    toast('Clicca un giocatore in basso per assegnare i punti.');
    return;
  }
  const active = state.players.find(item => item.id === targetPlayerId) || player();
  if (!active) return toast('Crea un giocatore.');
  active.score = Number(active.score || 0) + Number(points || 0);
  state.history.unshift({ id: id('h'), playerId: active.id, playerName: active.name, points: Number(points || 0), reason, at: new Date().toISOString() });
  state.history = state.history.slice(0, 120);
  save();
  toast(`${active.name}: ${points > 0 ? '+' : ''}${points}`);
  render();
}

function mediaStyle(options = {}) {
  const fit = ['cover', 'contain', 'fill'].includes(options.fit) ? options.fit : null;
  const x = safeNumber(options.positionX, 50, 0, 100);
  const y = safeNumber(options.positionY, 50, 0, 100);
  const zoom = safeNumber(options.zoom, 1, 1, 3);
  const effectiveZoom = zoom === 1 && (x !== 50 || y !== 50) ? 1.5 : zoom;
  const panX = (50 - x) * Math.max(effectiveZoom - 1, 0);
  const panY = (50 - y) * Math.max(effectiveZoom - 1, 0);
  const rules = [
    `--media-fit:${fit || 'var(--guess-fit,cover)'}`,
    `--media-x:${x}%`,
    `--media-y:${y}%`,
    `--media-zoom:${effectiveZoom}`,
    `--media-pan-x:${panX}%`,
    `--media-pan-y:${panY}%`,
    fit ? `object-fit:${fit} !important` : null,
    `object-position:${x}% ${y}% !important`,
    `transform:translate(${panX}%,${panY}%) scale(${effectiveZoom}) !important`,
    `transform-origin:center center !important`
  ];
  return rules.filter(Boolean).join(';');
}

function media(src, alt = 'media', options = {}) {
  if (!src) return $('span', { class: 'muted' }, 'Media non configurato');
  const attrs = {
    class: options.class || null,
    style: mediaStyle(options),
  };
  const handleError = event => showMediaError(event.currentTarget, src);
  if (/\.(mp4|webm)$/i.test(src)) return $('video', { ...attrs, src, controls: true, playsinline: true, preload: 'metadata', onerror: handleError });
  return $('img', { ...attrs, src, alt, loading: options.eager ? 'eager' : 'lazy', decoding: 'async', onerror: handleError });
}

function showMediaError(element, src) {
  element.replaceWith($('div', { class: 'media-error', role: 'alert' },
    $('strong', {}, 'Media non disponibile'),
    $('small', {}, src || 'Percorso non configurato')
  ));
}

async function loadAssetManifest() {
  try {
    const [assetResponse, thumbnailResponse] = await Promise.all([
      fetch('public/assets-manifest.json'),
      fetch('public/thumbnails-manifest.json')
    ]);
    if (!assetResponse.ok) throw new Error(`HTTP ${assetResponse.status}`);
    const manifest = await assetResponse.json();
    localAssets = Array.isArray(manifest.assets) ? manifest.assets : [];
    if (thumbnailResponse.ok) {
      const thumbnails = await thumbnailResponse.json();
      localThumbnails = Object.fromEntries((thumbnails.thumbnails || []).map(entry => [entry.source, entry.thumbnail]));
    }
    if (view === 'admin') render();
  } catch (error) {
    console.warn('Manifest asset locali non disponibile:', error);
  }
}

function assetDatalist() {
  return $('datalist', { id: 'local-assets' },
    ...localAssets.map(asset => $('option', { value: asset.path }, `${asset.type} · ${(Number(asset.bytes || 0) / 1024).toFixed(0)} KB`))
  );
}

const GUESS_BOX_ASSETS = {
  '1000': 'public/assets/box-1000.png',
  '500': 'public/assets/box-500.png',
  '250': 'public/assets/box-250.png',
  '50': 'public/assets/box-50.png'
};
const GUESS_BOX_ASPECT = 1655 / 917;
const DEFAULT_GUESS_POINTS = [1000, 500, 250, 50];

function guessBoxAsset(value) {
  return GUESS_BOX_ASSETS[String(value ?? '').trim()] || '';
}

function guessBoxCover(value) {
  const src = guessBoxAsset(value);
  return src ? $('img', { class: 'guess-box-art', src, alt: String(value), draggable: false }) : $('span', {}, value);
}

function guessClueMediaOptions(clue) {
  return {
    class: 'guess-crop-media',
    fit: clue.fit,
    positionX: clue.positionX,
    positionY: clue.positionY,
    zoom: clue.zoom
  };
}

function guessClueMedia(clue, alt) {
  return $('span', { class: 'guess-crop-frame' }, media(clue.image, alt, guessClueMediaOptions(clue)));
}

function refreshGuessCluePreview(row, clue, index) {
  const preview = row?.querySelector?.('.clue-preview');
  if (!preview) return;
  preview.replaceChildren(
    clue.image
      ? guessClueMedia(clue, `Anteprima box ${index + 1}`)
      : $('span', { class: 'muted' }, 'Anteprima immagine')
  );
}

function audio(src) {
  return src ? $('audio', { src, controls: true, preload: 'metadata', onerror: event => showMediaError(event.currentTarget, src) }) : $('span', { class: 'muted' }, 'Audio non configurato');
}

function top() {
  return $('header', { class: 'app-top' },
    $('div', {}, $('div', { class: 'kicker' }, 'Studio mode'), $('h1', {}, 'Trivia Challenge Studio')),
    $('nav', { class: 'app-nav' },
      $('span', { class: `save-status ${saveStatus}`, 'data-save-status': '', role: 'status', 'aria-live': 'polite' }, saveStatus === 'pending' ? 'Modifiche in corso' : saveStatus === 'failed' ? 'Salvataggio fallito' : 'Salvato'),
      nav('show', 'Show'), nav('admin', 'Admin'), nav('scores', 'Punteggi'))
  );
}

function nav(targetView, text) {
  return $('button', { class: view === targetView ? 'active' : '', onclick: () => { view = targetView; render(); } }, text);
}

function render() {
  const renderState = captureRenderState();
  clearInterval(timerInterval);
  timerInterval = null;
  document.body.dataset.view = view;
  document.body.dataset.audience = audienceMode ? 'public' : 'host';
  document.getElementById('app').replaceChildren(top(), view === 'show' ? show() : view === 'admin' ? admin() : scores());
  restoreRenderState(renderState);
  syncTimerLoop();
}

function captureRenderState() {
  if (view !== 'admin') return null;
  const keyedScroll = {};
  document.querySelectorAll('[data-scroll-key]').forEach(element => keyedScroll[element.dataset.scrollKey] = element.scrollTop);
  return {
    view,
    x: window.scrollX,
    y: window.scrollY,
    keyedScroll,
    scrollTops: [...document.querySelectorAll('.panel,.content-editor,.direct-inspector')].map(element => element.scrollTop)
  };
}

function restoreRenderState(renderState) {
  if (!renderState || renderState.view !== view) return;
  const restore = () => {
    [...document.querySelectorAll('.panel,.content-editor,.direct-inspector')].forEach((element, index) => {
      if (renderState.scrollTops[index] != null) element.scrollTop = renderState.scrollTops[index];
    });
    document.querySelectorAll('[data-scroll-key]').forEach(element => {
      const value = renderState.keyedScroll?.[element.dataset.scrollKey];
      if (value != null) element.scrollTop = value;
    });
    window.scrollTo(renderState.x, renderState.y);
  };
  restore();
  requestAnimationFrame(restore);
  setTimeout(restore, 0);
  requestAnimationFrame(() => requestAnimationFrame(restore));
}

function resetStage(screen = 'hub') {
  directEdit = false;
  selectedElementId = '';
  directEditPanel = 'layers';
  scorePanelPlayerId = '';
  helpOpen = false;
  cur = { screen, i: 0, revealed: 0, answer: false, selected: [], jeo: null, laborOpen: false, guillotine: null };
  save();
  render();
}

function award(points, reason, complete) {
  const active = activePlayer();
  if (!active) {
    toast('Seleziona prima un giocatore dalla barra in basso.');
    return false;
  }
  if (typeof complete === 'function') complete();
  add(points, reason, active.id);
  return true;
}

function show() {
  const content = cur.screen === 'hub' ? hub() : cur.screen === 'points' ? pointsScreen() : cur.screen === 'library' ? libraryScreen() : cur.screen === 'powers' ? powersScreen() : gameScreen();
  return $('main', { class: 'show-layout' }, stage(content));
}

function stage(content) {
  const selected = cur.screen === 'game' ? game() : null;
  const editableHome = cur.screen === 'hub';
  return $('section', { class: `ppt-stage ${directEdit && (selected || editableHome) ? 'direct-editing' : ''}` },
    stageToolbar(),
    editableHome ? homeSubtitleLayer(directEdit) : null,
    editableHome ? homeTitleLayer(directEdit) : null,
    editableHome ? homeMenuRibbonLayer(directEdit) : null,
    $('div', { class: 'stage-content' }, content),
    bottomScores(),
    selected ? slideLayer(selected, directEdit) : null,
    directEdit && selected ? directEditTools(selected) : null,
    directEdit && editableHome ? homeEditTools() : null,
    helpOpen ? keyboardHelp() : null
  );
}

function stageToolbar() {
  const canEdit = cur.screen === 'game' || cur.screen === 'hub';
  return $('div', { class: 'stage-toolbar' },
    $('button', { class: 'gear-btn home-btn', title: 'Home', 'aria-label': 'Home', onclick: () => resetStage('hub') }, homeIcon()),
    $('div', { class: 'stage-brand stage-brand-placeholder' }),
    $('div', { class: `stage-actions ${selectedElementId === 'toolbar-buttons' ? 'toolbar-selected' : ''}`, style: toolbarActionsStyle() },
      toolbarAction({ icon: '▣', label: 'LISTA ANIME', onclick: () => resetStage('library') }),
      toolbarAction({ icon: 'ϟ', label: 'POTERI', onclick: () => resetStage('powers') }),
      toolbarAction({ icon: '★', label: 'PUNTI', onclick: () => resetStage('points') }),
      toolbarAction({
        icon: '',
        label: audienceMode ? 'HOST' : 'PUBBLICO',
        className: `public-toggle ${audienceMode ? 'active' : ''}`,
        title: 'Alterna controlli host e vista pubblico (H)',
        onclick: () => { audienceMode = !audienceMode; render(); }
      }),
      toolbarAction({
        icon: '',
        label: directEdit ? 'FINE MODIFICA' : 'MODIFICA',
        className: `edit-action ${directEdit ? 'active' : ''}`,
        onclick: () => {
          if (!canEdit) return toast('Apri la Home o un minigioco per modificare la slide.');
          directEdit = !directEdit;
          selectedElementId = directEdit ? selectedElementId : '';
          directEditPanel = cur.screen === 'hub' ? 'home' : 'layers';
          render();
        }
      }),
      toolbarAction({ icon: '', label: 'ADMIN', className: 'admin-action', onclick: () => { directEdit = false; selectedElementId = ''; view = 'admin'; render(); } }),
      toolbarAction({ icon: '', label: 'AIUTO', className: 'help-action', title: 'Scorciatoie host (?)', onclick: () => { helpOpen = !helpOpen; render(); } }),
      toolbarAction({
        label: cur.screen === 'game' ? 'RESET DOMANDA' : 'RESET',
        className: 'icon-only',
        title: 'Reset',
        onclick: cur.screen === 'game' ? resetCurrentQuestion : () => { cur = { ...cur, i: 0, revealed: 0, answer: false, selected: [], jeo: null, laborOpen: false, guillotine: null }; render(); }
      }),
      cur.screen === 'game' ? toolbarAction({ label: 'RESET GIOCO', className: 'icon-only danger', title: 'Azzera il minigioco corrente', onclick: resetCurrentGame }) : null
    )
  );
}

function keyboardHelp() {
  const rows = [
    ['R', 'Rivela o mostra risposta'], ['C', 'Segna corretta'], ['X', 'Segna errata o nessun punto'],
    ['P', 'Passa'], ['← / →', 'Domanda precedente o successiva'], ['Spazio', 'Avvia o mette in pausa il timer'],
    ['H', 'Alterna vista host/pubblico'], ['?', 'Apre o chiude questo aiuto'], ['Esc', 'Chiude il pannello']
  ];
  const panel = $('section', { class: 'keyboard-help', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'keyboard-help-title', tabindex: '-1', onkeydown: event => {
    if (event.key !== 'Tab') return;
    const focusable = [...event.currentTarget.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const target = event.shiftKey ? focusable.at(-1) : focusable[0];
    if ((event.shiftKey && document.activeElement === focusable[0]) || (!event.shiftKey && document.activeElement === focusable.at(-1))) {
      event.preventDefault();
      target.focus();
    }
  } },
    $('div', { class: 'row keyboard-help-head' },
      $('h2', { id: 'keyboard-help-title' }, 'Scorciatoie host'),
      $('button', { class: 'btn small', onclick: () => { helpOpen = false; render(); } }, 'Chiudi')
    ),
    ...rows.map(([key, action]) => $('div', { class: 'shortcut-row' }, $('kbd', {}, key), $('span', {}, action)))
  );
  requestAnimationFrame(() => panel.focus());
  return panel;
}

function toolbarAction({ icon = '', label, className = '', title = '', onclick }) {
  return $('button', { class: `top-action ${className}`, title, onclick },
    icon ? $('span', {}, icon) : null,
    icon ? ` ${label}` : label,
    directEdit ? $('span', {
      class: 'resize-handle toolbar-resize-handle',
      title: 'Ridimensiona pulsanti superiori',
      onpointerdown: startToolbarButtonResize,
      onclick: event => event.stopPropagation()
    }) : null
  );
}

function toolbarActionsStyle() {
  const layout = ensureHomeLayout();
  return [
    `--toolbar-button-w:${layout.toolbarButtonW}px`,
    `--toolbar-button-h:${layout.toolbarButtonH}px`,
    `--toolbar-button-font:${layout.toolbarButtonFont}rem`,
    `--toolbar-gap:${layout.toolbarGap}px`
  ].join(';');
}

function bottomScores() {
  const quickPlayer = scorePanelPlayer();
  return $('div', { class: 'bottom-scorebar', 'aria-label': 'Punteggi giocatori' },
    ...state.players.map(item => $('button', {
      class: `player-chip ${item.id === playerId ? 'selected' : ''} ${item.id === scorePanelPlayerId ? 'panel-open' : ''}`,
      'aria-pressed': item.id === playerId ? 'true' : 'false',
      onclick: () => { playerId = item.id; scorePanelPlayerId = scorePanelPlayerId === item.id ? '' : item.id; refreshBottomScores(); }
    },
      $('span', {}, item.name),
      $('strong', { 'aria-live': 'polite' }, item.score || 0)
    )),
    quickPlayer ? quickScorePanel(quickPlayer) : null
  );
}

function refreshBottomScores() {
  const current = document.querySelector('.bottom-scorebar');
  if (current) current.replaceWith(bottomScores());
}

function quickScorePanel(item) {
  return $('div', { class: 'quick-score-panel' },
    $('div', { class: 'quick-score-head' },
      $('div', {}, $('span', {}, 'Punti rapidi'), $('strong', {}, `${item.name}: ${item.score || 0}`)),
      $('button', { class: 'btn small ghost', title: 'Chiudi', 'aria-label': 'Chiudi punti rapidi', onclick: event => { event.stopPropagation(); scorePanelPlayerId = ''; refreshBottomScores(); } }, 'X')
    ),
    $('div', { class: 'quick-score-buttons' },
      ...SCORE_VALUES.map(value => $('button', {
        class: `score-btn ${value > 0 ? 'plus' : 'minus'}`,
        onclick: event => { event.stopPropagation(); add(value, 'pannello rapido', item.id); }
      }, value > 0 ? `+${value}` : String(value)))
    )
  );
}

function hub() {
  const groups = state.games.filter(item => item.showOnHome !== false);
  const freeform = directEdit || hasHomeMenuButtonLayouts();
  if (freeform) ensureHomeMenuButtonLayouts(groups);
  return $('div', { class: `hub-screen ${freeform ? 'home-freeform' : ''}` },
    groups.length
      ? $('div', { class: 'menu-board' },
          ...groups.map((item, index) => $('button', {
            class: `ppt-button menu-button ${directEdit ? 'editable' : ''} ${selectedElementId === `home-menu-${item.id}` ? 'native-selected' : ''}`,
            style: freeform ? homeMenuButtonStyle(item) : null,
            'data-home-button-id': item.id,
            onclick: () => {
              if (directEdit) {
                selectedElementId = `home-menu-${item.id}`;
                render();
                return;
              }
              gameId = item.id;
              resetStage('game');
            },
            onpointerdown: directEdit ? event => startHomeMenuButtonDrag(event, item, index, false) : null
          },
            item.menuTitle || item.title,
            directEdit ? $('span', {
              class: 'resize-handle native-resize-handle',
              title: 'Ridimensiona bottone',
              onpointerdown: event => startHomeMenuButtonDrag(event, item, index, true)
            }) : null
          ))
        )
      : $('div', { class: 'hub-empty' }, 'Nessun minigioco selezionato per la Home')
  );
}

function gameScreen() {
  const selected = game();
  if (!selected) return $('div', { class: 'intro-screen' }, $('h2', {}, 'Nessun minigioco'));
  syncNextMediaPreloads(selected);
  const ribbonFreeform = directEdit || hasGameRibbonLayout(selected);
  if (ribbonFreeform) ensureGameRibbonLayout(selected);
  const result = gameContracts[selected.type].getResult(gameProgress(selected));
  return $('div', { class: 'game-shell', style: gameLayoutStyle(selected), 'data-game-result': result.status },
    gameRibbonLayer(selected, ribbonFreeform),
    $('div', { class: 'game-live-area' }, renderGame(selected))
  );
}

function resetCurrentQuestion() {
  const selected = game();
  if (!selected) return;
  const progress = gameProgress(selected);
  const group = selected.type === 'guess' ? 'rounds' : selected.type === 'sarabanda' ? 'songs' : 'questions';
  if (progress[group]) delete progress[group][cur.i];
  if (selected.type === 'jeopardy' && cur.jeo && progress.clues) delete progress.clues[`${cur.jeo.c}:${cur.jeo.q}`];
  cur = { ...cur, revealed: 0, answer: false, selected: [], jeo: null, laborOpen: false, guillotine: null };
  save();
  render();
  toast(selected.type === 'guess' ? 'Round corrente ripristinato' : 'Domanda corrente ripristinata');
}

function resetCurrentGame() {
  const selected = game();
  if (!selected || !confirm(`Azzerare tutti i progressi di “${selected.title}”?`)) return;
  state.session.games[selected.id] = gameContracts[selected.type].reset();
  cur = { ...cur, i: 0, revealed: 0, answer: false, selected: [], jeo: null, laborOpen: false, guillotine: null };
  save();
  render();
  toast('Minigioco ripristinato');
}

function syncNextMediaPreloads(item) {
  document.head.querySelectorAll('link[data-round-preload]').forEach(link => link.remove());
  const collection = item.type === 'guess' ? item.rounds : item.type === 'sarabanda' ? item.songs : item.questions;
  const next = Array.isArray(collection) ? collection[cur.i + 1] : null;
  if (!next) return;
  const paths = [];
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    Object.entries(value).forEach(([key, entry]) => {
      if (['image', 'audio', 'media', 'detailImage', 'fullImage', 'src', 'art'].includes(key) && typeof entry === 'string' && entry) paths.push(entry);
      visit(entry);
    });
  };
  visit(next);
  [...new Set(paths)].slice(0, 4).forEach(path => {
    const extension = path.split('.').pop()?.toLowerCase();
    const as = ['mp3', 'wav', 'ogg', 'm4a'].includes(extension) ? 'audio' : ['mp4', 'webm'].includes(extension) ? 'video' : 'image';
    document.head.append($('link', { rel: 'preload', href: path, as, 'data-round-preload': '' }));
  });
}

function pointsScreen() {
  return $('div', { class: 'points-screen' },
    $('h2', {}, 'PUNTI'),
    $('div', { class: 'points-columns' },
      ...state.players.map(item => $('div', { class: 'points-card' },
        $('h3', {}, `${item.name}:`),
        $('div', { class: 'mega-score' }, item.score || 0),
        $('div', { class: 'score-buttons' },
          ...SCORE_VALUES.map(value => $('button', { class: `score-btn ${value > 0 ? 'plus' : 'minus'}`, onclick: () => add(value, 'pannello punti', item.id) }, value > 0 ? `+${value}` : String(value)))
        ),
        $('button', { class: 'btn danger', onclick: () => { item.score = 0; save(); render(); } }, `Reset ${item.name}`)
      ))
    )
  );
}

function libraryScreen() {
  return $('div', { class: 'library-screen' }, $('h2', {}, 'LISTA ANIME'), state.library.length
    ? $('div', { class: 'library-grid' }, ...state.library.map(item => $('button', { class: 'ppt-button library-tile' }, item)))
    : emptyState('Nessun argomento', 'Aggiungi anime o argomenti dalla sezione Admin.'));
}

function emptyState(title, message) {
  return $('div', { class: 'empty-state', role: 'status' }, $('h3', {}, title), $('p', { class: 'muted' }, message));
}

function initials(value) {
  return String(value || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || '?';
}

function powerHp(item, index) {
  return item.hp || 300 - (index % 3) * 40;
}

function powerType(item) {
  return item.type || item.rarity || 'Speciale';
}

function powerArtwork(item) {
  return item.image || item.art || '';
}

function powersScreen() {
  return $('div', { class: 'powers-screen pokemon-power-screen' },
    $('h2', {}, 'POTERI'),
    !state.powers.length ? emptyState('Nessun potere', 'Configura almeno un potere dalla sezione Admin.') : null,
    $('div', { class: 'power-grid pokemon-power-grid' },
      ...state.powers.map((item, index) => $('div', { class: 'wrapper' },
        $('div', { class: 'card' },
          powerArtwork(item)
            ? $('img', { src: powerArtwork(item), alt: item.name || 'Potere', loading: 'lazy', onerror: event => showMediaError(event.currentTarget, powerArtwork(item)) })
            : $('div', { class: 'power-card-fallback' }, $('span', {}, initials(item.player)), $('small', {}, item.player || 'Player')),
          $('div', { class: 'tophead' },
            $('div', { class: 'facts' },
              $('h6', {}, powerType(item))
            ),
            $('h2', { class: 'headtext' }, item.name || 'Potere'),
            $('h3', {}, 'HP'),
            $('h2', { class: 'hp' }, powerHp(item, index)),
            $('div', { class: 'circle' })
          ),
          $('div', { class: 'description' },
            $('div', { class: 'desc_facts' },
              $('h6', { class: 'ability' }, item.abilityLabel || 'Ability'),
              $('h3', { class: 'recover' }, item.ability || item.name || 'Potere')
            ),
            $('p', { class: 'recover_desc' }, item.text || 'Descrizione potere non configurata.'),
            $('div', { class: 'desc_facts' },
              $('h3', { class: 'slash' }, item.attack || item.player || 'Bonus')
            ),
            $('p', { class: 'slash_desc' }, item.attackText || item.effect || 'Usa questo potere nel momento indicato dal presentatore.'),
            $('hr', { class: 'divide' }),
            $('div', { class: 'dark_gx' },
              $('h3', { class: 'nova' }, item.gx || 'Power GX')
            ),
            $('p', { class: 'gx_attack' }, item.gxText || 'Questo effetto speciale puo essere usato una volta durante la partita.')
          ),
          $('div', { class: 'g', 'aria-hidden': 'true' }, 'G'),
          $('div', { class: 'X', 'aria-hidden': 'true' }, 'X')
        )
      ))
    )
  );
}

function answer(text) {
  return $('div', { class: `answer ${cur.answer ? 'on' : ''}` }, cur.answer ? $('strong', {}, text || 'Risposta non configurata') : 'Risposta nascosta');
}

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback, min, max) {
  const number = Number(value);
  return clamp(Number.isFinite(number) ? number : fallback, min, max);
}

function snapValue(value, guides) {
  let best = value;
  let bestDistance = SNAP_THRESHOLD;
  guides.forEach(guide => {
    const distance = Math.abs(value - guide);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = guide;
    }
  });
  return best;
}

function snapBox(rect, candidates, resize = false) {
  const verticalGuides = [0, 50, 100];
  const horizontalGuides = [0, 50, 100];
  candidates.forEach(item => {
    const x = Number(item.x || 0);
    const y = Number(item.y || 0);
    const w = Number(item.w || 0);
    const h = Number(item.h || 0);
    verticalGuides.push(x, x + w / 2, x + w);
    horizontalGuides.push(y, y + h / 2, y + h);
  });
  if (resize) {
    const snappedRight = snapValue(rect.x + rect.w, verticalGuides);
    const snappedBottom = snapValue(rect.y + rect.h, horizontalGuides);
    rect.w = clamp(snappedRight - rect.x, 5, 100 - rect.x);
    rect.h = clamp(snappedBottom - rect.y, 5, 100 - rect.y);
    return rect;
  }
  const left = snapValue(rect.x, verticalGuides);
  const centerX = snapValue(rect.x + rect.w / 2, verticalGuides);
  const right = snapValue(rect.x + rect.w, verticalGuides);
  const top = snapValue(rect.y, horizontalGuides);
  const centerY = snapValue(rect.y + rect.h / 2, horizontalGuides);
  const bottom = snapValue(rect.y + rect.h, horizontalGuides);
  const xOptions = [
    { value: left, x: left },
    { value: centerX, x: centerX - rect.w / 2 },
    { value: right, x: right - rect.w }
  ].map(option => ({ ...option, distance: Math.abs(option.x - rect.x) }));
  const yOptions = [
    { value: top, y: top },
    { value: centerY, y: centerY - rect.h / 2 },
    { value: bottom, y: bottom - rect.h }
  ].map(option => ({ ...option, distance: Math.abs(option.y - rect.y) }));
  const bestX = xOptions.sort((a, b) => a.distance - b.distance)[0];
  const bestY = yOptions.sort((a, b) => a.distance - b.distance)[0];
  rect.x = clamp(bestX.distance < SNAP_THRESHOLD ? bestX.x : rect.x, 0, 100 - rect.w);
  rect.y = clamp(bestY.distance < SNAP_THRESHOLD ? bestY.y : rect.y, 0, 100 - rect.h);
  return rect;
}

function ensureSlideElements(item) {
  item.customElements ||= [];
  return item.customElements;
}

function ensureLayout(item) {
  item.layout ||= {};
  return item.layout;
}

function ensureGuessTileLayouts(item, count = 4) {
  const layout = ensureLayout(item);
  layout.guessTiles ||= [];
  const defaults = [
    { x: 10, y: 12, w: 36, h: 35 },
    { x: 54, y: 12, w: 36, h: 35 },
    { x: 10, y: 51, w: 36, h: 35 },
    { x: 54, y: 51, w: 36, h: 35 }
  ];
  if (layout.guessTileCoordinateSpace !== 'stage-v2') {
    layout.guessTiles = Array.from({ length: Math.max(count, 4) }, (_, index) => ({
      ...(defaults[index] || { x: 10 + (index % 2) * 44, y: 12 + Math.floor(index / 2) * 39, w: 36, h: 35 })
    }));
    layout.guessTileCoordinateSpace = 'stage-v2';
  }
  for (let index = 0; index < count; index++) {
    const fallback = defaults[index] || { x: 10 + (index % 2) * 44, y: 12 + Math.floor(index / 2) * 39, w: 36, h: 35 };
    const current = layout.guessTiles[index] || fallback;
    const unusable = Number(current.w) < 12 || Number(current.h) < 18 || Number(current.x) > 92 || Number(current.y) > 86;
    const source = unusable ? fallback : current;
    layout.guessTiles[index] = {
      x: safeNumber(source.x, fallback.x, 0, 92),
      y: safeNumber(source.y, fallback.y, 0, 86),
      w: safeNumber(source.w, fallback.w, 12, 96),
      h: safeNumber(source.h, fallback.h, 18, 80)
    };
    layout.guessTiles[index].w = Math.min(layout.guessTiles[index].w, 100 - layout.guessTiles[index].x);
    layout.guessTiles[index].h = Math.min(layout.guessTiles[index].h, 100 - layout.guessTiles[index].y);
  }
  return layout.guessTiles;
}

function ensureGuessControlLayouts(item) {
  const layout = ensureLayout(item);
  const defaults = {
    answerButton: { x: 7, y: 81, w: 14, h: 5, label: 'Mostra risposta' },
    answerBox: { x: 26, y: 75, w: 48, h: 6, label: 'Risposta nascosta' },
    pager: { x: 76, y: 91, w: 16, h: 6, label: 'Selettore slide' }
  };
  layout.guessControls ||= {};
  Object.entries(defaults).forEach(([key, fallback]) => {
    const current = layout.guessControls[key] || fallback;
    layout.guessControls[key] = {
      x: safeNumber(current.x, fallback.x, 0, 92),
      y: safeNumber(current.y, fallback.y, 0, 92),
      w: safeNumber(current.w, fallback.w, 8, 96),
      h: safeNumber(current.h, fallback.h, 5, 50),
      label: fallback.label
    };
    layout.guessControls[key].w = Math.min(layout.guessControls[key].w, 100 - layout.guessControls[key].x);
    layout.guessControls[key].h = Math.min(layout.guessControls[key].h, 100 - layout.guessControls[key].y);
  });
  return layout.guessControls;
}

function hasGuessTileLayouts(item) {
  return Array.isArray(item.layout?.guessTiles) && item.layout.guessTiles.some(Boolean);
}

function hasGuessControlLayouts(item) {
  return !!item.layout?.guessControls && Object.keys(item.layout.guessControls).length > 0;
}

function guessTileStyle(item, index) {
  const tile = ensureGuessTileLayouts(item, index + 1)[index];
  return [
    `left:${Number(tile.x ?? 10)}%`,
    `top:${Number(tile.y ?? 5)}%`,
    `width:${Number(tile.w ?? 38)}%`,
    `height:${Number(tile.h ?? 31)}%`
  ].join(';');
}

function guessControlStyle(item, key) {
  const control = ensureGuessControlLayouts(item)[key];
  return [
    `left:${Number(control.x ?? 0)}%`,
    `top:${Number(control.y ?? 0)}%`,
    `width:${Number(control.w ?? 20)}%`,
    `height:${Number(control.h ?? 8)}%`
  ].join(';');
}

function ensureGameRibbonLayout(item) {
  const layout = ensureLayout(item);
  const fallback = { x: 31, y: 16, w: 38, h: 5.4, label: 'Titolo minigioco' };
  const current = layout.gameRibbon || fallback;
  layout.gameRibbon = {
    x: safeNumber(current.x, fallback.x, 0, 92),
    y: safeNumber(current.y, fallback.y, 0, 92),
    w: safeNumber(current.w, fallback.w, 16, 96),
    h: safeNumber(current.h, fallback.h, 4, 20),
    label: fallback.label
  };
  layout.gameRibbon.w = Math.min(layout.gameRibbon.w, 100 - layout.gameRibbon.x);
  layout.gameRibbon.h = Math.min(layout.gameRibbon.h, 100 - layout.gameRibbon.y);
  return layout.gameRibbon;
}

function hasGameRibbonLayout(item) {
  return !!item.layout?.gameRibbon;
}

function gameRibbonStyle(item) {
  const ribbon = ensureGameRibbonLayout(item);
  return [
    `left:${Number(ribbon.x ?? 31)}%`,
    `top:${Number(ribbon.y ?? 16)}%`,
    `width:${Number(ribbon.w ?? 38)}%`,
    `height:${Number(ribbon.h ?? 5.4)}%`
  ].join(';');
}

function gameLayoutStyle(item) {
  const layout = ensureLayout(item);
  const guessFit = layout.guessFit || 'cover';
  return [
    `--guess-grid-width:${Number(layout.guessGridWidth ?? 76)}vw`,
    `--guess-grid-max:${Number(layout.guessGridMax ?? 1180)}px`,
    `--guess-gap-x:${Number(layout.guessGapX ?? 24)}px`,
    `--guess-gap-y:${Number(layout.guessGapY ?? 18)}px`,
    `--guess-radius:${Number(layout.guessRadius ?? 14)}px`,
    `--guess-border:${Number(layout.guessBorder ?? 2)}px`,
    `--guess-font:${Number(layout.guessFont ?? 64)}px`,
    `--guess-box-aspect:${Number(layout.guessBoxAspect ?? GUESS_BOX_ASPECT)}`,
    `--guess-fit:${guessFit}`
  ].join(';');
}

function gameRibbonLayer(item, freeform = false) {
  const attrs = {
    class: `game-ribbon ${freeform ? 'game-ribbon-freeform' : ''} ${directEdit ? 'editable' : ''} ${selectedElementId === 'game-ribbon' ? 'native-selected' : ''}`,
    style: freeform ? gameRibbonStyle(item) : null,
    'data-native-id': 'game-ribbon'
  };
  const text = item.menuTitle || label(item.type);
  if (!directEdit) return $('div', attrs, text);
  return $('button', {
    ...attrs,
    title: 'Trascina per spostare il titolo del minigioco',
    onclick: () => { selectedElementId = 'game-ribbon'; render(); },
    onpointerdown: event => startGameRibbonDrag(event, item, false)
  }, text, $('span', {
    class: 'resize-handle native-resize-handle',
    title: 'Ridimensiona titolo',
    onpointerdown: event => startGameRibbonDrag(event, item, true)
  }));
}

function ensureHomeLayout() {
  const layout = { ...DEFAULT_HOME_LAYOUT, ...(state.homeLayout || {}) };
  layout.titleX = safeNumber(layout.titleX, DEFAULT_HOME_LAYOUT.titleX, 4, 96);
  layout.titleY = safeNumber(layout.titleY, DEFAULT_HOME_LAYOUT.titleY, 0, 78);
  layout.titleW = safeNumber(layout.titleW, DEFAULT_HOME_LAYOUT.titleW, 28, 96);
  layout.titleSize = safeNumber(layout.titleSize, DEFAULT_HOME_LAYOUT.titleSize, 34, 150);
  layout.subtitleX = safeNumber(layout.subtitleX, DEFAULT_HOME_LAYOUT.subtitleX, 4, 96);
  layout.subtitleY = safeNumber(layout.subtitleY, DEFAULT_HOME_LAYOUT.subtitleY, 0, 78);
  layout.subtitleW = safeNumber(layout.subtitleW, DEFAULT_HOME_LAYOUT.subtitleW, 18, 96);
  layout.subtitleSize = safeNumber(layout.subtitleSize, DEFAULT_HOME_LAYOUT.subtitleSize, 10, 52);
  layout.menuX = safeNumber(layout.menuX, DEFAULT_HOME_LAYOUT.menuX, 4, 96);
  layout.menuY = safeNumber(layout.menuY, DEFAULT_HOME_LAYOUT.menuY, 4, 82);
  layout.menuW = safeNumber(layout.menuW, DEFAULT_HOME_LAYOUT.menuW, 18, 76);
  layout.toolbarButtonW = safeNumber(layout.toolbarButtonW, DEFAULT_HOME_LAYOUT.toolbarButtonW, 72, 260);
  layout.toolbarButtonH = safeNumber(layout.toolbarButtonH, DEFAULT_HOME_LAYOUT.toolbarButtonH, 38, 96);
  layout.toolbarButtonFont = safeNumber(layout.toolbarButtonFont, DEFAULT_HOME_LAYOUT.toolbarButtonFont, 0.55, 1.2);
  layout.toolbarGap = safeNumber(layout.toolbarGap, DEFAULT_HOME_LAYOUT.toolbarGap, 4, 28);
  if (layout.titleY > 38 || layout.titleSize > 132) {
    layout.titleX = DEFAULT_HOME_LAYOUT.titleX;
    layout.titleY = DEFAULT_HOME_LAYOUT.titleY;
    layout.titleW = DEFAULT_HOME_LAYOUT.titleW;
    layout.titleSize = DEFAULT_HOME_LAYOUT.titleSize;
  }
  state.homeLayout = layout;
  return layout;
}

function homeTitleStyle() {
  const layout = ensureHomeLayout();
  return [
    `left:${Number(layout.titleX ?? 50)}%`,
    `top:${Number(layout.titleY ?? 4)}%`,
    `width:${Number(layout.titleW ?? 66)}%`,
    `--home-title-size:${Number(layout.titleSize ?? 82)}px`
  ].join(';');
}

function homeSubtitleStyle() {
  const layout = ensureHomeLayout();
  return [
    `left:${Number(layout.subtitleX ?? 50)}%`,
    `top:${Number(layout.subtitleY ?? 4)}%`,
    `width:${Number(layout.subtitleW ?? 44)}%`,
    `--home-subtitle-size:${Number(layout.subtitleSize ?? 18)}px`
  ].join(';');
}

function homeSubtitleLayer(editable = false) {
  const attrs = {
    class: `home-subtitle-block edition-line ${editable ? 'editable selected' : ''}`,
    style: homeSubtitleStyle()
  };
  const body = $('span', {}, state.subtitle || 'ANIME EDITION');
  if (!editable) return $('div', attrs, body);
  return $('button', {
    ...attrs,
    title: 'Trascina per spostare il sottotitolo',
    onpointerdown: event => startHomeElementDrag(event, 'subtitle', false)
  }, body, $('span', {
    class: 'resize-handle',
    title: 'Ridimensiona sottotitolo',
    onpointerdown: event => startHomeElementDrag(event, 'subtitle', true)
  }));
}

function homeTitleLayer(editable = false) {
  const body = $('div', { class: 'main-logo' }, state.title || 'TRIVIA CHALLENGE');
  const attrs = {
    class: `home-title-block ${editable ? 'editable selected' : ''}`,
    style: homeTitleStyle()
  };
  if (!editable) return $('div', attrs, body);
  return $('button', {
    ...attrs,
    title: 'Trascina per spostare il titolo',
    onpointerdown: event => startHomeTitleDrag(event, false)
  }, body, $('span', {
    class: 'resize-handle',
    title: 'Ridimensiona titolo',
    onpointerdown: event => startHomeTitleDrag(event, true)
  }));
}

function homeMenuRibbonStyle() {
  const layout = ensureHomeLayout();
  return [
    `left:${Number(layout.menuX ?? 50)}%`,
    `top:${Number(layout.menuY ?? 17)}%`,
    `width:${Number(layout.menuW ?? 38)}%`
  ].join(';');
}

function homeMenuRibbonLayer(editable = false) {
  const attrs = {
    class: `home-menu-ribbon-block game-ribbon wide ${editable ? 'editable selected' : ''}`,
    style: homeMenuRibbonStyle()
  };
  if (!editable) return $('div', attrs, 'SELEZIONA MINIGIOCO');
  return $('button', {
    ...attrs,
    title: 'Trascina per spostare la selezione minigioco',
    onpointerdown: event => startHomeElementDrag(event, 'menu', false)
  }, 'SELEZIONA MINIGIOCO', $('span', {
    class: 'resize-handle',
    title: 'Ridimensiona',
    onpointerdown: event => startHomeElementDrag(event, 'menu', true)
  }));
}

function defaultHomeMenuButtonBox(index) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: 6 + col * 23, y: 30 + row * 13, w: 20, h: 9 };
}

function ensureHomeMenuButtonLayouts(items = []) {
  const layout = ensureHomeLayout();
  layout.menuButtons ||= {};
  items.forEach((item, index) => {
    const fallback = defaultHomeMenuButtonBox(index);
    const current = layout.menuButtons[item.id] || fallback;
    layout.menuButtons[item.id] = {
      x: safeNumber(current.x, fallback.x, 0, 92),
      y: safeNumber(current.y, fallback.y, 0, 92),
      w: safeNumber(current.w, fallback.w, 10, 96),
      h: safeNumber(current.h, fallback.h, 6, 40)
    };
    layout.menuButtons[item.id].w = Math.min(layout.menuButtons[item.id].w, 100 - layout.menuButtons[item.id].x);
    layout.menuButtons[item.id].h = Math.min(layout.menuButtons[item.id].h, 100 - layout.menuButtons[item.id].y);
  });
  Object.keys(layout.menuButtons).forEach(key => {
    if (!items.some(item => item.id === key)) delete layout.menuButtons[key];
  });
  return layout.menuButtons;
}

function hasHomeMenuButtonLayouts() {
  return !!state.homeLayout?.menuButtons && Object.keys(state.homeLayout.menuButtons).length > 0;
}

function homeMenuButtonStyle(item) {
  const box = ensureHomeLayout().menuButtons?.[item.id];
  if (!box) return '';
  return [`left:${box.x}%`, `top:${box.y}%`, `width:${box.w}%`, `height:${box.h}%`].join(';');
}

function resetHomeMenuButtons() {
  const groups = state.games.filter(item => item.showOnHome !== false);
  const layout = ensureHomeLayout();
  layout.menuButtons = {};
  groups.forEach((item, index) => layout.menuButtons[item.id] = defaultHomeMenuButtonBox(index));
  save();
  render();
}

function resetToolbarButtons() {
  const layout = ensureHomeLayout();
  layout.toolbarButtonW = DEFAULT_HOME_LAYOUT.toolbarButtonW;
  layout.toolbarButtonH = DEFAULT_HOME_LAYOUT.toolbarButtonH;
  layout.toolbarButtonFont = DEFAULT_HOME_LAYOUT.toolbarButtonFont;
  layout.toolbarGap = DEFAULT_HOME_LAYOUT.toolbarGap;
  save();
  render();
}

function captureDragPointer(event) {
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  } catch (error) {
    console.warn('Pointer capture non disponibile:', error);
  }
}

function startToolbarButtonResize(event) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = 'toolbar-buttons';
  const layout = ensureHomeLayout();
  const node = event.currentTarget.closest('.stage-actions');
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    w: Number(layout.toolbarButtonW ?? DEFAULT_HOME_LAYOUT.toolbarButtonW),
    h: Number(layout.toolbarButtonH ?? DEFAULT_HOME_LAYOUT.toolbarButtonH),
    font: Number(layout.toolbarButtonFont ?? DEFAULT_HOME_LAYOUT.toolbarButtonFont)
  };
  const move = moveEvent => {
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;
    layout.toolbarButtonW = clamp(original.w + dx, 72, 260);
    layout.toolbarButtonH = clamp(original.h + dy, 38, 96);
    layout.toolbarButtonFont = clamp(original.font + dy * 0.008, 0.55, 1.2);
    if (node) {
      node.style.setProperty('--toolbar-button-w', `${layout.toolbarButtonW}px`);
      node.style.setProperty('--toolbar-button-h', `${layout.toolbarButtonH}px`);
      node.style.setProperty('--toolbar-button-font', `${layout.toolbarButtonFont}rem`);
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function startHomeMenuButtonDrag(event, item, index, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = `home-menu-${item.id}`;
  const groups = state.games.filter(entry => entry.showOnHome !== false);
  const layouts = ensureHomeMenuButtonLayouts(groups);
  const box = layouts[item.id];
  const surface = event.currentTarget.closest('.hub-screen');
  if (!box || !surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = { x: Number(box.x || 0), y: Number(box.y || 0), w: Number(box.w || 20), h: Number(box.h || 9) };
  const snapCandidates = Object.entries(layouts).filter(([key]) => key !== item.id).map(([, value]) => value);
  const node = surface.querySelector(`[data-home-button-id="${CSS.escape(item.id)}"]`) || event.currentTarget.closest('.menu-button');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    const next = { ...original };
    if (resize) {
      next.w = clamp(original.w + dx, 10, 100 - original.x);
      next.h = clamp(original.h + dy, 6, 100 - original.y);
    } else {
      next.x = clamp(original.x + dx, 0, 100 - original.w);
      next.y = clamp(original.y + dy, 0, 100 - original.h);
    }
    snapBox(next, snapCandidates, resize);
    box.x = next.x;
    box.y = next.y;
    box.w = clamp(next.w, 10, 100 - next.x);
    box.h = clamp(next.h, 6, 100 - next.y);
    if (node) {
      node.style.left = `${box.x}%`;
      node.style.top = `${box.y}%`;
      node.style.width = `${box.w}%`;
      node.style.height = `${box.h}%`;
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function startHomeTitleDrag(event, resize) {
  startHomeElementDrag(event, 'title', resize);
}

function startHomeElementDrag(event, target, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  const layout = ensureHomeLayout();
  const surface = event.currentTarget.closest('.ppt-stage');
  if (!surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    x: Number(layout.titleX ?? 50),
    y: Number(layout.titleY ?? 4),
    w: Number(layout.titleW ?? 66),
    size: Number(layout.titleSize ?? 82),
    menuX: Number(layout.menuX ?? 50),
    menuY: Number(layout.menuY ?? 17),
    menuW: Number(layout.menuW ?? 38),
    subtitleX: Number(layout.subtitleX ?? 50),
    subtitleY: Number(layout.subtitleY ?? 4),
    subtitleW: Number(layout.subtitleW ?? 44),
    subtitleSize: Number(layout.subtitleSize ?? 18)
  };
  const node = event.currentTarget.closest(target === 'menu' ? '.home-menu-ribbon-block' : target === 'subtitle' ? '.home-subtitle-block' : '.home-title-block');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    if (target === 'menu') {
      if (resize) {
        layout.menuW = clamp(original.menuW + dx, 18, 76);
      } else {
        layout.menuX = clamp(original.menuX + dx, 4, 96);
        layout.menuY = clamp(original.menuY + dy, 4, 82);
      }
    } else if (target === 'subtitle') {
      if (resize) {
        layout.subtitleW = clamp(original.subtitleW + dx, 18, 96);
        layout.subtitleSize = clamp(original.subtitleSize + dy * 1.2, 10, 52);
      } else {
        layout.subtitleX = clamp(original.subtitleX + dx, 4, 96);
        layout.subtitleY = clamp(original.subtitleY + dy, 0, 78);
      }
    } else if (resize) {
      layout.titleW = clamp(original.w + dx, 28, 96);
      layout.titleSize = clamp(original.size + dy * 1.4, 34, 150);
    } else {
      layout.titleX = clamp(original.x + dx, 4, 96);
      layout.titleY = clamp(original.y + dy, 0, 78);
    }
    if (node) {
      if (target === 'menu') {
        node.style.left = `${layout.menuX}%`;
        node.style.top = `${layout.menuY}%`;
        node.style.width = `${layout.menuW}%`;
      } else if (target === 'subtitle') {
        node.style.left = `${layout.subtitleX}%`;
        node.style.top = `${layout.subtitleY}%`;
        node.style.width = `${layout.subtitleW}%`;
        node.style.setProperty('--home-subtitle-size', `${layout.subtitleSize}px`);
      } else {
        node.style.left = `${layout.titleX}%`;
        node.style.top = `${layout.titleY}%`;
        node.style.width = `${layout.titleW}%`;
        node.style.setProperty('--home-title-size', `${layout.titleSize}px`);
      }
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function updateHomeLayout(mutate) {
  mutate(ensureHomeLayout());
  scheduleSave();
  render();
}

function globalTitlePanel() {
  const layout = ensureHomeLayout();
  return $('div', { class: 'stack native-content-panel' },
    $('h3', {}, 'Titolo globale'),
    $('p', { class: 'muted' }, 'Questo titolo mantiene la stessa posizione in tutte le pagine. Trascinalo direttamente sulla slide oppure usa questi valori.'),
    $('div', { class: 'game-basics direct-basics' },
      editorInput('Titolo', state.title || '', value => { state.title = value; scheduleSave(); render(); }),
      editorInput('Sottotitolo', state.subtitle || '', value => { state.subtitle = value; scheduleSave(); render(); })
    ),
    $('section', { class: 'content-editor layout-editor' },
      $('h3', {}, 'Titolo - posizione e dimensione'),
      $('div', { class: 'compact-list layout-controls' },
        $('div', { class: 'mini-row wide' },
          editorInput('X %', layout.titleX ?? 50, value => updateHomeLayout(target => target.titleX = clamp(value, 4, 96)), { type: 'number' }),
          editorInput('Y %', layout.titleY ?? 4, value => updateHomeLayout(target => target.titleY = clamp(value, 0, 78)), { type: 'number' })
        ),
        $('div', { class: 'mini-row wide' },
          editorInput('Larghezza %', layout.titleW ?? 66, value => updateHomeLayout(target => target.titleW = clamp(value, 28, 96)), { type: 'number' }),
          editorInput('Font titolo', layout.titleSize ?? 82, value => updateHomeLayout(target => target.titleSize = clamp(value, 34, 150)), { type: 'number' })
        )
      )
    ),
    $('section', { class: 'content-editor layout-editor' },
      $('h3', {}, 'Sottotitolo - posizione e dimensione'),
      $('div', { class: 'compact-list layout-controls' },
        $('div', { class: 'mini-row wide' },
          editorInput('X %', layout.subtitleX ?? 50, value => updateHomeLayout(target => target.subtitleX = clamp(value, 4, 96)), { type: 'number' }),
          editorInput('Y %', layout.subtitleY ?? 4, value => updateHomeLayout(target => target.subtitleY = clamp(value, 0, 78)), { type: 'number' })
        ),
        $('div', { class: 'mini-row wide' },
          editorInput('Larghezza %', layout.subtitleW ?? 44, value => updateHomeLayout(target => target.subtitleW = clamp(value, 18, 96)), { type: 'number' }),
          editorInput('Font sottotitolo', layout.subtitleSize ?? 18, value => updateHomeLayout(target => target.subtitleSize = clamp(value, 10, 52)), { type: 'number' })
        )
      )
    )
  );
}

function homeEditTools() {
  const layout = ensureHomeLayout();
  return $('div', { class: 'direct-edit-tools' },
    $('div', { class: 'direct-toolbar' },
      $('span', { class: 'edit-badge' }, 'MODIFICA HOME'),
      $('button', { class: 'btn ghost', onclick: () => { directEdit = false; render(); } }, 'Chiudi strumenti')
    ),
    $('aside', { class: 'direct-inspector wide' },
      $('div', { class: 'stack native-content-panel' },
        globalTitlePanel(),
        $('section', { class: 'content-editor layout-editor' },
          $('h3', {}, 'Selezione minigioco'),
          $('div', { class: 'compact-list layout-controls' },
            $('div', { class: 'mini-row wide' },
              editorInput('X %', layout.menuX ?? 50, value => updateHomeLayout(target => target.menuX = clamp(value, 4, 96)), { type: 'number' }),
              editorInput('Y %', layout.menuY ?? 17, value => updateHomeLayout(target => target.menuY = clamp(value, 4, 82)), { type: 'number' })
            ),
            $('div', { class: 'mini-row wide' },
              editorInput('Larghezza %', layout.menuW ?? 38, value => updateHomeLayout(target => target.menuW = clamp(value, 18, 76)), { type: 'number' })
            )
          )
        ),
        $('section', { class: 'content-editor home-games-editor' },
          $('h3', {}, 'Minigiochi visibili in Home'),
          $('div', { class: 'compact-list' },
            ...state.games.map(item => $('label', { class: 'check-field game-visibility-row' },
              $('input', {
                type: 'checkbox',
                checked: item.showOnHome !== false,
                onchange: event => { item.showOnHome = event.target.checked; save(); render(); }
              }),
              $('span', {}, item.menuTitle || item.title),
              $('small', {}, label(item.type))
            ))
          )
        ),
        $('section', { class: 'content-editor layout-editor' },
          $('h3', {}, 'Bottoni schermata principale'),
          $('p', { class: 'muted' }, 'Trascina i bottoni direttamente nella Home. Usa la maniglia in basso a destra per ridimensionarli.'),
          $('button', { class: 'btn', onclick: resetHomeMenuButtons }, 'Disponi bottoni in griglia')
        ),
        $('section', { class: 'content-editor layout-editor' },
          $('h3', {}, 'Pulsanti superiori'),
          $('p', { class: 'muted' }, 'Trascina la maniglia su un pulsante superiore per ridimensionare tutta la toolbar.'),
          $('div', { class: 'compact-list layout-controls' },
            $('div', { class: 'mini-row wide' },
              editorInput('Larghezza px', layout.toolbarButtonW ?? DEFAULT_HOME_LAYOUT.toolbarButtonW, value => updateHomeLayout(target => target.toolbarButtonW = clamp(value, 72, 260)), { type: 'number' }),
              editorInput('Altezza px', layout.toolbarButtonH ?? DEFAULT_HOME_LAYOUT.toolbarButtonH, value => updateHomeLayout(target => target.toolbarButtonH = clamp(value, 38, 96)), { type: 'number' })
            ),
            $('div', { class: 'mini-row wide' },
              editorInput('Font rem', layout.toolbarButtonFont ?? DEFAULT_HOME_LAYOUT.toolbarButtonFont, value => updateHomeLayout(target => target.toolbarButtonFont = clamp(value, 0.55, 1.2)), { type: 'number', step: '0.05' }),
              editorInput('Spazio px', layout.toolbarGap ?? DEFAULT_HOME_LAYOUT.toolbarGap, value => updateHomeLayout(target => target.toolbarGap = clamp(value, 4, 28)), { type: 'number' })
            )
          ),
          $('button', { class: 'btn', onclick: resetToolbarButtons }, 'Reset pulsanti superiori')
        ),
        $('button', { class: 'btn', onclick: () => { state.homeLayout = { ...DEFAULT_HOME_LAYOUT }; save(); render(); } }, 'Reset layout Home')
      )
    )
  );
}

function slideLayer(item, editable = false) {
  const elements = ensureSlideElements(item);
  if (!elements.length && !editable) return null;
  return $('div', { class: `slide-layer ${editable ? 'editable' : ''}` },
    ...elements.map(element => slideObject(item, element, editable))
  );
}

function slideObject(item, element, editable = false) {
  const style = [
    `left:${Number(element.x ?? 10)}%`,
    `top:${Number(element.y ?? 10)}%`,
    `width:${Number(element.w ?? 24)}%`,
    `height:${Number(element.h ?? 12)}%`,
    `z-index:${Number(element.z ?? 1)}`,
    `--slide-color:${element.color || '#ffd21a'}`,
    `--slide-bg:${element.bg || 'rgba(5,18,48,.72)'}`,
    `--slide-border:${element.border || 'rgba(0,231,255,.85)'}`,
    `font-size:${Number(element.size || 32)}px`
  ].join(';');
  const body = element.type === 'image'
    ? (element.src ? $('img', { src: element.src, alt: element.text || 'Elemento immagine' }) : $('span', { class: 'muted' }, 'Immagine'))
    : element.type === 'shape'
      ? $('span', { class: 'slide-shape-label' }, element.text || '')
      : $('span', { class: 'slide-text-content' }, element.text || 'Testo');
  const attrs = {
    class: `slide-object ${editable ? 'editable' : ''} ${selectedElementId === element.id ? 'selected' : ''} slide-${element.type || 'text'} shape-${element.shape || 'rect'}`,
    style,
    'data-slide-id': element.id
  };
  if (!editable) return $('div', attrs, body);
  return $('button', {
    ...attrs,
    title: 'Trascina per spostare',
    onclick: () => { selectedElementId = element.id; render(); },
    onpointerdown: event => startSlideDrag(event, item, element.id, false)
  }, body, $('span', {
    class: 'resize-handle',
    title: 'Ridimensiona',
    onpointerdown: event => startSlideDrag(event, item, element.id, true)
  }));
}

function startSlideDrag(event, item, elementId, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = elementId;
  const element = ensureSlideElements(item).find(entry => entry.id === elementId);
  const surface = event.currentTarget.closest('.slide-canvas,.ppt-stage');
  if (!element || !surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    x: Number(element.x ?? 10),
    y: Number(element.y ?? 10),
    w: Number(element.w ?? 24),
    h: Number(element.h ?? 12)
  };
  const snapCandidates = ensureSlideElements(item).filter(entry => entry.id !== elementId);
  const node = surface.querySelector(`[data-slide-id="${CSS.escape(elementId)}"]`) || event.currentTarget.closest('.slide-object');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    const next = { ...original };
    if (resize) {
      next.w = clamp(original.w + dx, 5, 96 - original.x);
      next.h = clamp(original.h + dy, 5, 96 - original.y);
    } else {
      next.x = clamp(original.x + dx, 0, 100 - original.w);
      next.y = clamp(original.y + dy, 0, 100 - original.h);
    }
    snapBox(next, snapCandidates, resize);
    element.x = next.x;
    element.y = next.y;
    element.w = next.w;
    element.h = next.h;
    if (node) {
      node.style.left = `${element.x}%`;
      node.style.top = `${element.y}%`;
      node.style.width = `${element.w}%`;
      node.style.height = `${element.h}%`;
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function startGuessTileDrag(event, item, index, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = `guess-tile-${index}`;
  const tiles = ensureGuessTileLayouts(item, Math.max(index + 1, 4));
  const tile = tiles[index];
  const surface = event.currentTarget.closest('.ppt-stage');
  if (!tile || !surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    x: Number(tile.x ?? 10),
    y: Number(tile.y ?? 5),
    w: Number(tile.w ?? 38),
    h: Number(tile.h ?? 31)
  };
  const snapCandidates = tiles.filter((_, candidateIndex) => candidateIndex !== index);
  const node = surface.querySelector(`[data-native-id="guess-tile-${index}"]`) || event.currentTarget.closest('.guess-tile');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    const next = { ...original };
    if (resize) {
      next.w = clamp(original.w + dx, 12, 100 - original.x);
      next.h = clamp(original.h + dy, 18, 100 - original.y);
    } else {
      next.x = clamp(original.x + dx, 0, 100 - original.w);
      next.y = clamp(original.y + dy, 0, 100 - original.h);
    }
    snapBox(next, snapCandidates, resize);
    tile.x = next.x;
    tile.y = next.y;
    tile.w = clamp(next.w, 12, 100 - next.x);
    tile.h = clamp(next.h, 18, 100 - next.y);
    if (node) {
      node.style.left = `${tile.x}%`;
      node.style.top = `${tile.y}%`;
      node.style.width = `${tile.w}%`;
      node.style.height = `${tile.h}%`;
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function startGuessControlDrag(event, item, key, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = `guess-control-${key}`;
  const controls = ensureGuessControlLayouts(item);
  const control = controls[key];
  const surface = event.currentTarget.closest('.ppt-stage');
  if (!control || !surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    x: Number(control.x ?? 0),
    y: Number(control.y ?? 0),
    w: Number(control.w ?? 20),
    h: Number(control.h ?? 8)
  };
  const tileCandidates = item.type === 'guess' ? ensureGuessTileLayouts(item, 4) : [];
  const controlCandidates = Object.entries(controls).filter(([candidateKey]) => candidateKey !== key).map(([, candidate]) => candidate);
  const node = document.querySelector(`[data-native-id="guess-control-${key}"]`) || event.currentTarget.closest('.guess-control');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    const next = { ...original };
    if (resize) {
      next.w = clamp(original.w + dx, 8, 100 - original.x);
      next.h = clamp(original.h + dy, 5, 100 - original.y);
    } else {
      next.x = clamp(original.x + dx, 0, 100 - original.w);
      next.y = clamp(original.y + dy, 0, 100 - original.h);
    }
    snapBox(next, [...tileCandidates, ...controlCandidates], resize);
    control.x = next.x;
    control.y = next.y;
    control.w = clamp(next.w, 8, 100 - next.x);
    control.h = clamp(next.h, 5, 100 - next.y);
    if (node) {
      node.style.left = `${control.x}%`;
      node.style.top = `${control.y}%`;
      node.style.width = `${control.w}%`;
      node.style.height = `${control.h}%`;
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function startGameRibbonDrag(event, item, resize) {
  if (event.button != null && event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  captureDragPointer(event);
  selectedElementId = 'game-ribbon';
  const ribbon = ensureGameRibbonLayout(item);
  const surface = event.currentTarget.closest('.ppt-stage');
  if (!ribbon || !surface) return;
  const rect = surface.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {
    x: Number(ribbon.x ?? 31),
    y: Number(ribbon.y ?? 16),
    w: Number(ribbon.w ?? 38),
    h: Number(ribbon.h ?? 5.4)
  };
  const node = document.querySelector('[data-native-id="game-ribbon"]') || event.currentTarget.closest('.game-ribbon');
  const move = moveEvent => {
    const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
    const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
    const next = { ...original };
    if (resize) {
      next.w = clamp(original.w + dx, 16, 100 - original.x);
      next.h = clamp(original.h + dy, 4, 100 - original.y);
    } else {
      next.x = clamp(original.x + dx, 0, 100 - original.w);
      next.y = clamp(original.y + dy, 0, 100 - original.h);
    }
    snapBox(next, [], resize);
    ribbon.x = next.x;
    ribbon.y = next.y;
    ribbon.w = clamp(next.w, 16, 100 - next.x);
    ribbon.h = clamp(next.h, 4, 100 - next.y);
    if (node) {
      node.style.left = `${ribbon.x}%`;
      node.style.top = `${ribbon.y}%`;
      node.style.width = `${ribbon.w}%`;
      node.style.height = `${ribbon.h}%`;
    }
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
    render();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, { once: true });
}

function homeIcon() {
  return $('span', { class: 'home-icon', 'aria-hidden': 'true' }, $('span', { class: 'home-roof' }), $('span', { class: 'home-body' }));
}

function controlNearestMedia(event, action) {
  const scope = event.currentTarget.closest('.game-live-area') || document;
  const element = scope.querySelector('audio, video');
  if (!element) return toast('Nessun media configurato in questa schermata.');
  if (action === 'restart') {
    element.pause();
    element.currentTime = 0;
  }
  if (action === 'pause') element.pause();
  if (action === 'play') element.play().catch(() => toast('Riproduzione non disponibile.'));
}

function mediaControls() {
  return $('div', { class: 'ppt-media-controls' },
    $('button', { class: 'media-btn', title: 'Torna all’inizio', 'aria-label': 'Torna all’inizio', onclick: event => controlNearestMedia(event, 'restart') }, '<<'),
    $('button', { class: 'media-btn', title: 'Pausa', 'aria-label': 'Pausa', onclick: event => controlNearestMedia(event, 'pause') }, '||'),
    $('button', { class: 'media-btn', title: 'Riproduci', 'aria-label': 'Riproduci', onclick: event => controlNearestMedia(event, 'play') }, '>')
  );
}

function ensureGameTimer(duration = 50) {
  const key = `${gameId || 'screen'}:${cur.screen}:${cur.i}`;
  if (!cur.timer || cur.timer.key !== key) {
    cur.timer = { key, duration, remaining: duration, startedAt: null, running: false, expired: false };
  }
  return cur.timer;
}

function syncTimerLoop() {
  clearInterval(timerInterval);
  timerInterval = null;
  const timer = cur.timer;
  const value = document.querySelector('[data-timer-value]');
  if (!timer || !value) return;

  const update = () => {
    const remaining = timerRemaining(timer);
    value.textContent = formatTimer(remaining);
    value.closest('.game-timer')?.classList.toggle('expired', remaining <= 0);
    if (remaining > 0 || !timer.running) return;
    pauseTimer(timer);
    timer.expired = true;
    clearInterval(timerInterval);
    timerInterval = null;
    toast('Tempo scaduto');
    playLocalAlert();
  };

  update();
  if (timer.running) timerInterval = setInterval(update, 200);
}

function playLocalAlert() {
  if (state.settings?.alertsEnabled !== false) {
    document.body.classList.add('alert-flash');
    setTimeout(() => document.body.classList.remove('alert-flash'), 700);
  }
  if (state.settings?.soundsEnabled === false) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener('ended', () => context.close());
  } catch (error) {
    console.warn('Avviso sonoro non disponibile:', error);
  }
}

function gameTimer(duration = 50) {
  const timer = ensureGameTimer(duration);
  return $('div', { class: `game-timer ${timer.expired ? 'expired' : ''}` },
    $('strong', { class: 'chain-timer', 'data-timer-value': '', role: 'timer', 'aria-live': 'polite' }, formatTimer(timerRemaining(timer))),
    $('div', { class: 'timer-actions' },
      $('button', { class: 'btn small', onclick: () => { startTimer(timer); syncTimerLoop(); } }, 'Avvia'),
      $('button', { class: 'btn small', onclick: () => { pauseTimer(timer); syncTimerLoop(); } }, 'Pausa'),
      $('button', { class: 'btn small ghost', onclick: () => { resetTimer(timer, duration); syncTimerLoop(); } }, 'Reset')
    )
  );
}

function outcomeButtons(g, points, after, options = {}) {
  const completed = !!options.completed;
  const reason = options.reason || g.title || label(g.type);
  const wrongPoints = Number(options.wrongPoints || 0);
  if (!cur.answer) return [];
  return [
    $('button', {
      class: 'btn success',
      disabled: completed,
      onclick: () => award(Number(points || 0), reason, () => after?.('correct'))
    }, completed ? 'Completata' : `Corretta +${Number(points || 0)}`),
    $('button', {
      class: wrongPoints < 0 ? 'btn danger' : 'btn ghost',
      disabled: completed,
      onclick: () => award(wrongPoints, reason, () => after?.('wrong'))
    }, wrongPoints < 0 ? `Errata ${wrongPoints}` : 'Nessun punto')
  ];
}

function controls(g, ans, points, after, options = {}) {
  return $('div', { class: 'host-actions' },
    $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta'),
    ...outcomeButtons(g, points, after, options),
    answer(ans)
  );
}

function renderGame(g) {
  return gameContracts[g.type]?.render(g) || unsupported(g);
}

function unsupported(g) { return $('div', { class: 'intro-screen' }, $('h2', {}, `Tipo non supportato: ${g.type}`)); }

function chooseGuessRound(index, total) {
  cur.i = clamp(Number(index || 0), 0, Math.max(total - 1, 0));
  cur.answer = false;
  cur.revealed = 0;
  cur.jeo = null;
  save();
  render();
}

function guess(g) {
  const rounds = g.rounds || [];
  const round = rounds[cur.i] || rounds[0];
  if (!round) return $('div', { class: 'intro-screen' }, 'Nessun round.');
  const clues = (round.clues || []).map(item => typeof item === 'string' ? { label: '?', image: item } : item);
  const shown = Math.min(cur.revealed, clues.length);
  const roundProgress = progressEntry(g, 'rounds', cur.i);
  const freeform = directEdit || hasGuessTileLayouts(g) || hasGuessControlLayouts(g);
  if (freeform) ensureGuessTileLayouts(g, clues.length);
  if (freeform) ensureGuessControlLayouts(g);
  const controlAttrs = key => ({
    class: `guess-control native-control ${directEdit ? 'editable' : ''} ${selectedElementId === `guess-control-${key}` ? 'native-selected' : ''}`,
    style: freeform ? guessControlStyle(g, key) : null,
    'data-native-id': `guess-control-${key}`,
    onpointerdown: directEdit ? event => startGuessControlDrag(event, g, key, false) : null
  });
  const resizeHandle = key => directEdit ? $('span', {
    class: 'resize-handle native-resize-handle',
    title: 'Ridimensiona controllo',
    onpointerdown: event => startGuessControlDrag(event, g, key, true)
  }) : null;
  const availablePoints = guessPointsForReveal(round, shown);
  const roundCompleted = ['correct', 'wrong'].includes(roundProgress.status);
  return $('div', { class: `guess-screen ${freeform ? 'guess-freeform' : ''}` },
    $('div', { class: 'guess-grid' },
      ...clues.map((clue, index) => {
        const coverValue = clue.label || round.points?.[index] || '?';
        const hasBoxAsset = index >= shown && !!guessBoxAsset(coverValue);
        const attrs = {
          class: `guess-tile ${index < shown ? 'revealed' : 'covered'} ${hasBoxAsset ? 'asset-covered' : ''} ${selectedElementId === `guess-tile-${index}` ? 'native-selected' : ''}`,
          style: freeform ? guessTileStyle(g, index) : null,
          'data-native-id': `guess-tile-${index}`,
          onclick: () => {
            if (directEdit) {
              selectedElementId = `guess-tile-${index}`;
              render();
              return;
            }
            if (index >= shown) {
              cur.revealed = Math.max(cur.revealed, index + 1);
              save();
              render();
            }
          }
        };
        if (directEdit) attrs.onpointerdown = event => startGuessTileDrag(event, g, index, false);
        return $('button', attrs,
          index < shown ? guessClueMedia(clue, `Indizio ${index + 1}`) : guessBoxCover(coverValue),
          directEdit ? $('span', {
            class: 'resize-handle native-resize-handle',
            title: 'Ridimensiona box',
            onpointerdown: event => startGuessTileDrag(event, g, index, true)
          }) : null
        );
      })
    ),
    $('div', { ...controlAttrs('answerButton'), class: `${controlAttrs('answerButton').class} host-actions guess-answer-control` },
      $('button', { class: 'btn', onclick: () => { if (directEdit) return; cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta'),
      cur.answer ? $('button', {
        class: 'btn success',
        disabled: directEdit || roundCompleted,
        onclick: () => award(availablePoints, `${g.title}: ${round.answer || `round ${cur.i + 1}`}`, () => roundProgress.status = 'correct')
      }, roundCompleted ? 'Round completato' : `Corretta +${availablePoints}`) : null,
      cur.answer ? $('button', {
        class: 'btn ghost',
        disabled: directEdit || roundCompleted,
        onclick: () => award(0, `${g.title}: nessun punto`, () => roundProgress.status = 'wrong')
      }, 'Nessun punto') : null,
      resizeHandle('answerButton')
    ),
    $('div', { ...controlAttrs('answerBox'), class: `${controlAttrs('answerBox').class} answer guess-answer-box ${cur.answer ? 'on' : ''}` },
      cur.answer ? $('strong', {}, round.answer || 'Risposta non configurata') : 'Risposta nascosta',
      resizeHandle('answerBox')
    ),
    $('div', { ...controlAttrs('pager'), class: `${controlAttrs('pager').class} pager guess-pager-control` },
      $('button', { class: 'btn', disabled: cur.i <= 0, onclick: () => { if (directEdit) return; chooseGuessRound(cur.i - 1, rounds.length); } }, '←'),
      $('label', { class: 'slide-select-label' },
        $('span', { class: 'sr-only' }, 'Scegli slide'),
        $('select', {
          class: 'slide-select',
          value: String(cur.i),
          disabled: directEdit || rounds.length <= 1,
          onchange: event => { if (directEdit) return; chooseGuessRound(event.target.value, rounds.length); }
        },
          ...rounds.map((_, index) => $('option', { value: String(index), selected: index === cur.i },
            `Slide ${index + 1} / ${rounds.length}`
          ))
        )
      ),
      $('button', { class: 'btn', disabled: cur.i >= rounds.length - 1, onclick: () => { if (directEdit) return; chooseGuessRound(cur.i + 1, rounds.length); } }, '→'),
      resizeHandle('pager')
    )
  );
}

function bomb(g) {
  const selected = new Set(cur.selected || []);
  const items = g.items || [];
  const result = calculateBombScore(items, cur.selected, g.pointsPerCorrect);
  const progress = gameProgress(g);
  return $('div', { class: 'bomb-screen' },
    $('div', { class: 'bomb-question' }, g.question || 'Evita le bombe.'),
    $('div', { class: 'bomb-grid' },
      ...items.map((item, index) => $('button', { class: `bomb-tile ${selected.has(index) ? (item.isBomb ? 'bomb' : 'ok') : ''}`, 'aria-label': `${item.label || `Elemento ${index + 1}`}${selected.has(index) ? item.isBomb ? ', bomba selezionata' : ', risposta selezionata' : ''}`, onclick: () => { selected.has(index) ? selected.delete(index) : selected.add(index); cur.selected = [...selected]; render(); } }, item.image ? media(item.image, item.label) : $('span', {}, item.label || `Elemento ${index + 1}`)))
    ),
    $('div', { class: 'host-actions' },
      $('span', { class: 'pill' }, `Corrette ${result.correct}`),
      $('span', { class: 'pill' }, `Bombe ${result.bombs}`),
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi bombe' : 'Mostra bombe'),
      cur.answer ? $('button', {
        class: 'btn success',
        disabled: !!progress.completed,
        onclick: () => award(result.score, `${g.title}: ${result.correct} corrette, ${result.bombs} bombe`, () => { progress.completed = true; progress.result = result; })
      }, progress.completed ? 'Completata' : `Conferma ${result.score >= 0 ? '+' : ''}${result.score}`) : null
    ),
    cur.answer ? $('div', { class: 'answer on' }, `Bombe: ${items.filter(item => item.isBomb).map(item => item.label).join(', ')}`) : null
  );
}

function said(g) {
  const questions = Array.from({ length: 10 }, (_, index) => g.questions?.[index] || { prompt: `Audio ${index + 1}`, audio: '', answer: '' });
  const q = questions[cur.i] || questions[0];
  const questionProgress = progressEntry(g, 'questions', cur.i);
  return $('div', { class: 'said-board-screen' },
    $('div', { class: 'said-audio-board' },
      ...questions.map((item, index) => $('div', { class: `said-audio-row ${index === cur.i ? 'current' : ''}` },
        $('button', { class: 'said-index', onclick: () => { cur.i = index; cur.answer = false; render(); } }, index + 1),
        $('div', { class: 'said-audio-card' }, item.audio ? audio(item.audio) : $('button', { onclick: () => { cur.i = index; cur.answer = false; render(); } }, 'AUDIO'))
      ))
    ),
    $('aside', { class: 'said-side' },
      $('div', { class: 'said-answer-card' }, cur.answer ? cleanText(q.answer, 'RISPOSTA') : '?'),
      cur.answer && q.media ? $('div', { class: 'answer-media' }, media(q.media, q.answer)) : null,
      $('div', { class: 'said-number-grid' }, ...questions.map((_, index) => $('button', { class: index === cur.i ? 'current' : '', onclick: () => { cur.i = index; cur.answer = false; render(); } }, index + 1))),
      $('div', { class: 'host-actions' },
        $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Mostra risposta'),
        ...outcomeButtons(g, g.points || 100, status => { questionProgress.status = status; }, {
          completed: ['correct', 'wrong'].includes(questionProgress.status),
          reason: `${g.title}: audio ${cur.i + 1}`
        })
      )
    ),
    $('div', { class: 'said-footer' }, gameTimer(Number(g.duration || 50)), mediaControls())
  );
}

function detail(g) {
  const questions = Array.from({ length: 5 }, (_, index) => g.questions?.[index] || { detailImage: '', fullImage: '', answer: `Dettaglio ${index + 1}` });
  const q = questions[cur.i] || questions[0];
  const questionProgress = progressEntry(g, 'questions', cur.i);
  return $('div', { class: 'detail-board-screen' },
    $('div', { class: 'detail-side-index' }, ...questions.map((_, index) => $('button', { class: index === cur.i ? 'current' : '', onclick: () => { cur.i = index; cur.answer = false; render(); } }, index + 1))),
    $('div', { class: 'detail-frame' }, media(cur.answer ? q.fullImage : q.detailImage, q.answer)),
    $('aside', { class: 'detail-side' },
      $('div', { class: 'detail-answer-card' }, cur.answer ? cleanText(q.answer, 'RISPOSTA') : '?'),
      gameTimer(Number(g.duration || 50)),
      mediaControls(),
      $('div', { class: 'host-actions' },
        $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Mostra risposta'),
        ...outcomeButtons(g, g.points || 200, status => { questionProgress.status = status; }, {
          completed: ['correct', 'wrong'].includes(questionProgress.status),
          reason: `${g.title}: dettaglio ${cur.i + 1}`
        })
      )
    )
  );
}

function quote(g) {
  const questions = g.questions?.length ? g.questions : templates.quote().questions;
  const rows = Array.from({ length: Math.max(5, questions.length) }, (_, index) => questions[index] || { partial: `Citazione ${index + 1}`, answer: '' });
  const q = rows[cur.i] || rows[0];
  const questionProgress = progressEntry(g, 'questions', cur.i);
  return $('div', { class: 'quote-board-screen' },
    $('div', { class: 'quote-board' },
      ...rows.map((row, index) => $('button', { class: `quote-card ${index === cur.i ? 'current' : ''}`, onclick: () => { cur.i = index; cur.answer = false; render(); } },
        cur.answer && index === cur.i ? cleanText(row.answer, 'RISPOSTA') : cleanText(row.partial, `CITAZIONE ${index + 1}`)
      ))
    ),
    controls(g, q.answer, g.points || 200, status => { questionProgress.status = status; }, {
      completed: ['correct', 'wrong'].includes(questionProgress.status),
      reason: `${g.title}: domanda ${cur.i + 1}`
    })
  );
}

function chain(g) {
  const source = g.questions?.length ? g.questions : templates.chain().questions;
  const steps = Array.from({ length: 20 }, (_, index) => source[index] || { question: `Domanda ${index + 1}`, answer: '' });
  const progress = gameProgress(g);
  progress.lives = Number.isFinite(Number(progress.lives)) ? Number(progress.lives) : 3;
  const questionProgress = progressEntry(g, 'questions', cur.i);
  const row = (item, index) => {
    const active = index === cur.i;
    const status = progressEntry(g, 'questions', index).status;
    const revealed = status === 'correct' || (active && cur.answer);
    const text = revealed ? cleanText(item.answer, item.question) : active ? cleanText(item.question, '') : '';
    return $('button', { class: `chain-step ${active ? 'current' : ''} ${revealed ? 'revealed' : ''} ${status || 'pending'}`, onclick: () => { cur.i = index; cur.answer = false; render(); } },
      $('span', { class: 'chain-number' }, String(index + 1)),
      $('span', { class: 'chain-text' }, text),
      index < 19 ? $('span', { class: 'chain-arrow' }, 'v') : null
    );
  };
  return $('div', { class: 'chain-board-screen' },
    $('div', { class: 'chain-columns' },
      $('div', { class: 'chain-column' }, ...steps.slice(0, 10).map((item, index) => row(item, index))),
      $('div', { class: 'chain-turn' }, '<'),
      $('div', { class: 'chain-column' }, ...steps.slice(10, 20).map((item, index) => row(item, index + 10)))
    ),
    $('div', { class: 'chain-footer' }, gameTimer(Number(g.duration || 60)), mediaControls(), $('div', { class: 'chain-lives', 'aria-label': `${progress.lives} vite rimaste` },
      ...Array.from({ length: 3 }, (_, index) => $('span', { class: index < progress.lives ? '' : 'spent' }, 'X'))
    )),
    $('div', { class: 'host-actions' },
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Rivela'),
      ...outcomeButtons(g, g.points || 50, status => {
        questionProgress.status = status;
        if (status === 'wrong') progress.lives = Math.max(0, progress.lives - 1);
        if (cur.i < steps.length - 1) cur.i += 1;
        cur.answer = false;
      }, {
        completed: ['correct', 'wrong'].includes(questionProgress.status),
        reason: `${g.title}: domanda ${cur.i + 1}`
      }),
      $('button', { class: 'btn warn', onclick: () => { questionProgress.status = 'pass'; if (cur.i < steps.length - 1) cur.i += 1; cur.answer = false; save(); render(); } }, 'Passo'),
      $('button', { class: 'btn', disabled: cur.i <= 0, onclick: () => { cur.i--; cur.answer = false; render(); } }, '<'),
      $('button', { class: 'btn', disabled: cur.i >= steps.length - 1, onclick: () => { cur.i++; cur.answer = false; render(); } }, '>')
    )
  );
}

function labors(g) {
  const questions = g.questions?.length ? g.questions : templates.labors().questions;
  const items = Array.from({ length: 10 }, (_, index) => questions[index] || { question: `Fatica ${index + 1}`, options: [], answer: '' });
  if (!cur.laborOpen) return $('div', { class: 'labors-board-screen' },
    $('div', { class: 'labors-prompt-card' }, g.topic || g.title || 'LE DIECI FATICHE'),
    $('div', { class: 'labors-number-grid' }, ...items.map((item, index) => $('button', { class: `labors-number ${progressEntry(g, 'questions', index).status === 'correct' ? 'done' : ''}`, onclick: () => { cur.i = index; cur.laborOpen = true; cur.answer = false; cur.laborChoice = null; render(); } }, index + 1)))
  );
  const q = items[cur.i] || items[0];
  const questionProgress = progressEntry(g, 'questions', cur.i);
  return $('div', { class: 'labors-question-screen' },
    $('div', { class: 'labors-question-card' }, q.question),
    q.options?.length ? $('div', { class: 'labors-options' }, ...q.options.map((option, index) => $('button', {
      class: `ppt-row-card ${cur.laborChoice === index ? 'current' : ''}`,
      onclick: () => { cur.laborChoice = index; render(); }
    }, `${String.fromCharCode(65 + index)}: ${option}`))) : null,
    $('div', { class: 'host-actions' },
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Risposta'),
      ...outcomeButtons(g, g.points || 100, status => { questionProgress.status = status; }, {
        completed: ['correct', 'wrong'].includes(questionProgress.status),
        reason: `${g.title}: fatica ${cur.i + 1}`
      }),
      $('button', { class: 'btn ghost', onclick: () => { cur.laborOpen = false; cur.answer = false; render(); } }, 'Torna alle fatiche')
    ),
    answer(`${q.answer || ''}${q.explanation ? ' - ' + q.explanation : ''}`)
  );
}

function guillotine(g) {
  const words = Array.from({ length: 5 }, (_, index) => g.words?.[index] || `Indizio ${index + 1}`);
  const progress = gameProgress(g);
  const basePoints = Number(g.points || 200);
  const availablePoints = Math.max(50, basePoints - Math.max(0, cur.revealed - 1) * 25);
  return $('div', { class: 'guillotine-final-screen' },
    $('div', { class: 'guillotine-clues' },
      ...words.map((word, index) => $('button', {
        class: `guillotine-clue ${index < cur.revealed ? 'revealed' : ''}`,
        onclick: () => { cur.revealed = Math.max(cur.revealed, index + 1); render(); }
      }, index < cur.revealed ? cleanText(word, `INDIZIO ${index + 1}`) : `INDIZIO ${index + 1}`))
    ),
    $('div', { class: `guillotine-answer-card ${cur.answer ? 'revealed' : ''}` }, cur.answer ? cleanText(g.answer, 'RISPOSTA') : '?'),
    $('div', { class: 'host-actions' },
      $('button', { class: 'btn primary', disabled: cur.revealed >= words.length, onclick: () => { cur.revealed++; render(); } }, 'Rivela indizio'),
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta'),
      ...outcomeButtons(g, availablePoints, status => { progress.status = status; progress.cluesUsed = cur.revealed; }, {
        completed: ['correct', 'wrong'].includes(progress.status),
        reason: `${g.title}: ${cur.revealed} indizi`
      })
    )
  );
}

function pass(g) {
  const questions = (g.questions || []).map((question, index) => ({
    ...question,
    status: progressEntry(g, 'questions', index).status || 'pending'
  }));
  const q = questions[cur.i] || questions[0];
  const difficulty = g.difficulty || 'facile';
  if (!q) return $('div', { class: 'intro-screen' }, 'Nessuna domanda.');
  const summary = passSummary(questions);
  const questionPoints = passPointsForDifficulty(g);
  const advance = status => {
    progressEntry(g, 'questions', cur.i).status = status;
    questions[cur.i].status = status;
    const next = nextPassIndex(questions, cur.i);
    if (next >= 0) cur.i = next;
    cur.answer = false;
  };
  const markWithoutPoints = status => {
    advance(status);
    save();
    render();
  };
  const markCorrect = () => {
    const wasPerfect = summary.perfect;
    award(questionPoints, `${g.title}: lettera ${q.letter}`, () => {
      advance('correct');
      const nextSummary = passSummary(questions);
      const progress = gameProgress(g);
      if (!wasPerfect && nextSummary.perfect && !progress.bonusAwarded) {
        const bonus = passBonusForDifficulty(g);
        progress.bonusAwarded = true;
        const active = activePlayer();
        if (active && bonus) {
          active.score = Number(active.score || 0) + bonus;
          state.history.unshift({ id: id('h'), playerId: active.id, playerName: active.name, points: bonus, reason: `${g.title}: bonus perfect`, at: new Date().toISOString() });
        }
      }
    });
  };
  return $('div', { class: 'pass-screen' },
    $('div', { class: 'pass-wheel' },
      ...questions.map((item, index) => {
        const angle = (360 / questions.length) * index - 90;
        const statusLabel = item.status === 'correct' ? 'corretta' : item.status === 'wrong' ? 'errata' : item.status === 'pass' ? 'passata' : 'in attesa';
        return $('button', { class: `pass-letter ${item.status === 'correct' ? 'ok' : item.status === 'wrong' ? 'wrong' : item.status === 'pass' ? 'passed' : ''} ${index === cur.i ? 'current' : ''}`, style: `--angle:${angle}deg`, 'aria-label': `${item.letter}: ${statusLabel}`, onclick: () => { cur.i = index; cur.answer = false; render(); } }, item.letter);
      }),
      $('div', { class: 'wheel-core' }, $('strong', {}, q.letter), $('span', {}, difficulty.toUpperCase()))
    ),
    $('div', { class: 'pass-question' },
      gameTimer(Number(g.duration || 50)),
      $('h2', {}, q.question),
      $('div', { class: 'host-actions' },
        $('button', { class: 'btn success', disabled: q.status === 'correct', onclick: markCorrect }, `Corretta +${questionPoints}`),
        $('button', { class: 'btn danger', onclick: () => markWithoutPoints('wrong') }, 'Sbagliata'),
        $('button', { class: 'btn warn', onclick: () => markWithoutPoints('pass') }, 'Passo'),
        $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi' : 'Risposta')
      ),
      $('div', { class: 'pill' }, summary.complete ? `Completato · ${summary.correct}/${summary.total} corrette` : `Corrette ${summary.correct}/${summary.total} · Passate ${summary.pass}`),
      answer(q.answer)
    )
  );
}

function jeopardy(g) {
  const categories = g.categories || [];
  if (cur.jeo) {
    const category = categories[cur.jeo.c];
    const clue = category?.clues?.[cur.jeo.q];
    const clueProgress = progressEntry(g, 'clues', `${cur.jeo.c}:${cur.jeo.q}`);
    if (clue) return $('div', { class: 'jeopardy-question' }, $('div', { class: 'topic' }, `${category.name} · ${clue.value} punti`), $('h2', {}, clue.question), controls(g, clue.answer, clue.value, status => { clueProgress.used = true; clueProgress.status = status; cur.jeo = null; }, { completed: clueProgress.used, reason: `${g.title}: ${category.name} ${clue.value}`, wrongPoints: -Number(clue.value || 0) }), $('button', { class: 'btn ghost', onclick: () => { cur.jeo = null; render(); } }, 'Torna al tabellone'));
  }
  return $('div', { class: 'jeopardy-board' },
    ...categories.map((category, categoryIndex) => $('div', { class: 'jeopardy-col' },
      $('div', { class: 'jeopardy-cat' }, $('span', { class: 'cat-icon' }, categoryIcon(category.name)), $('strong', {}, category.name)),
      ...(category.clues || []).map((clue, clueIndex) => {
        const clueProgress = progressEntry(g, 'clues', `${categoryIndex}:${clueIndex}`);
        return $('button', { class: `jeopardy-cell ${clueProgress.used ? 'used' : ''}`, onclick: () => {
          if (clueProgress.used) {
            if (!confirm(`Riaprire la domanda ${category.name} da ${clue.value} punti?`)) return;
            delete gameProgress(g).clues[`${categoryIndex}:${clueIndex}`];
            save();
            render();
            return;
          }
          cur.jeo = { c: categoryIndex, q: clueIndex };
          cur.answer = false;
          render();
        } }, clue.value);
      })
    ))
  );
}

function sarabanda(g) {
  const songs = Array.from({ length: 12 }, (_, index) => g.songs?.[index] || { audio: '', title: `Titolo ${index + 1}`, artist: 'Artista' });
  const song = songs[cur.i] || songs[0];
  const songProgress = progressEntry(g, 'songs', cur.i);
  return $('div', { class: 'sarabanda-board-screen' },
    $('div', { class: 'sarabanda-grid' },
      ...songs.map((item, index) => $('button', { class: `sarabanda-audio-card ${index === cur.i ? 'current' : ''}`, onclick: () => { cur.i = index; cur.answer = false; render(); } }, item.audio ? audio(item.audio) : 'AUDIO'))
    ),
    $('div', { class: 'sarabanda-answer-strip' }, cur.answer ? `${cleanText(song.title, 'Titolo')} - ${cleanText(song.artist, 'Artista')}` : 'Risposta nascosta'),
    $('div', { class: 'host-actions' },
      $('button', { class: 'btn', onclick: () => { cur.answer = !cur.answer; render(); } }, cur.answer ? 'Nascondi risposta' : 'Mostra risposta'),
      cur.answer ? $('button', {
        class: 'btn success',
        disabled: !!songProgress.titleAwarded,
        onclick: () => award(g.pointsTitle || 25, `${g.title}: titolo ${cur.i + 1}`, () => songProgress.titleAwarded = true)
      }, songProgress.titleAwarded ? 'Titolo assegnato' : `Titolo +${g.pointsTitle || 25}`) : null,
      cur.answer ? $('button', {
        class: 'btn success',
        disabled: !!songProgress.artistAwarded,
        onclick: () => award(g.pointsArtist || 25, `${g.title}: artista ${cur.i + 1}`, () => songProgress.artistAwarded = true)
      }, songProgress.artistAwarded ? 'Artista assegnato' : `Artista +${g.pointsArtist || 25}`) : null,
      cur.answer ? $('button', {
        class: 'btn primary',
        disabled: !!songProgress.titleAwarded || !!songProgress.artistAwarded,
        onclick: () => award(Number(g.pointsTitle || 25) + Number(g.pointsArtist || 25), `${g.title}: risposta completa ${cur.i + 1}`, () => { songProgress.titleAwarded = true; songProgress.artistAwarded = true; })
      }, 'Risposta completa') : null
    )
  );
}

function undoLastScore() {
  const entry = state.history.shift();
  if (!entry) return toast('Nessun punteggio da annullare.');
  const target = state.players.find(item => item.id === entry.playerId)
    || state.players.find(item => item.name === entry.playerName);
  if (!target) {
    state.history.unshift(entry);
    return toast('Giocatore dello storico non trovato.');
  }
  target.score = Number(target.score || 0) - Number(entry.points || 0);
  save();
  toast(`Annullato ${entry.points > 0 ? '+' : ''}${entry.points} a ${target.name}`);
  render();
}

function history() {
  return $('section', { class: 'history-box' },
    $('div', { class: 'row history-head' },
      $('h3', {}, 'Storico'),
      $('button', { class: 'btn small', disabled: !state.history.length, onclick: undoLastScore }, 'Annulla ultimo punteggio')
    ),
    ...(state.history.length
      ? state.history.slice(0, 7).map(item => $('div', { class: 'history-row' }, $('span', {}, item.playerName), $('small', {}, item.reason), $('strong', {}, `${item.points > 0 ? '+' : ''}${item.points}`)))
      : [$('p', { class: 'muted' }, 'Nessun punto assegnato.')])
  );
}

function admin() {
  const activeEdit = editing ? state.games.find(item => item.id === editing) : null;
  const typeSelect = $('select', { id: 'type', onchange: preview });
  Object.entries(TYPES).forEach(([value, text]) => typeSelect.append($('option', { value, selected: value === (activeEdit?.type || 'guess') }, text)));
  const draft = activeEdit || { ...templates[typeSelect.value || 'guess'](), title: 'Nuovo minigioco', menuTitle: 'NUOVO MINIGIOCO' };
  const titleInput = $('input', { id: 'title', value: draft.title || 'Nuovo minigioco', oninput: () => { if (!editing) preview(); } });
  const jsonStatus = $('small', { id: 'json-sync-status', class: 'muted', role: 'status' }, 'JSON sincronizzato con l’editor visuale.');
  const jsonArea = $('textarea', { id: 'json', value: JSON.stringify(draft, null, 2), oninput: event => {
    event.currentTarget.dataset.dirty = 'true';
    jsonStatus.className = 'asset-field-feedback invalid';
    jsonStatus.textContent = 'JSON modificato: sincronizzazione visuale sospesa fino al salvataggio.';
  } });
  return $('main', { class: 'grid two' },
    assetDatalist(),
    $('section', { class: 'panel stack' },
      $('h2', {}, 'Admin contenuti'),
      $('p', { class: 'muted' }, 'Gestisci i contenuti in modo visuale. Il JSON resta disponibile come modalità avanzata.'),
      $('div', { class: 'grid two' },
        $('label', {}, 'Titolo evento', $('input', { value: state.title || '', onchange: event => { state.title = event.target.value; scheduleSave(); render(); } })),
        $('label', {}, 'Sottotitolo', $('input', { value: state.subtitle || '', onchange: event => { state.subtitle = event.target.value; scheduleSave(); render(); } }))
      ),
      $('div', { class: 'grid two' }, $('label', {}, 'Tipo minigioco', typeSelect), $('label', {}, 'Titolo', titleInput)),
      activeEdit ? slideDesigner(activeEdit) : $('div', { class: 'slide-empty panel-lite' }, 'Premi "Modifica" su un minigioco salvato per aprire l editor diapositiva. Per crearne uno nuovo puoi partire dal template qui sotto.'),
      $('details', { class: 'json-details' },
        $('summary', {}, 'JSON avanzato'),
        $('p', { class: 'muted' }, 'Le modifiche JSON sono applicate solo con Salva. Se il form visuale cambia nel frattempo, viene mostrato un conflitto.'),
        $('label', {}, 'Contenuto JSON', jsonArea),
        jsonStatus,
        $('button', { class: 'btn small', onclick: () => {
          const current = editing ? state.games.find(item => item.id === editing) : draft;
          jsonArea.value = JSON.stringify(current, null, 2);
          delete jsonArea.dataset.dirty;
          jsonStatus.className = 'muted';
          jsonStatus.textContent = 'JSON risincronizzato dal form visuale.';
        } }, 'Risincronizza dal visuale')
      ),
      $('div', { id: 'editor-validation', class: 'editor-validation', role: 'alert', hidden: true }),
      $('div', { class: 'row' },
        $('button', { class: 'btn primary', onclick: () => saveEditor(false) }, editing ? 'Salva modifiche' : 'Crea minigioco'),
        $('button', { class: 'btn success', onclick: () => saveEditor(true) }, 'Salva e prova'),
        $('button', { class: 'btn', onclick: () => { editing = ''; selectedElementId = ''; render(); } }, 'Nuovo da template'),
        $('button', { class: 'btn', onclick: exportData }, 'Esporta JSON'),
        $('label', { class: 'btn ghost' }, 'Importa JSON', $('input', { type: 'file', accept: 'application/json', style: 'display:none', onchange: importData }))
      ),
      playersAdmin(), settingsAdmin(), libraryAdmin(), powersAdmin()
    ),
    $('aside', { class: 'panel stack' },
      $('h3', {}, 'Minigiochi salvati'),
      ...state.games.map(item => $('div', { class: 'saved-game' }, $('div', {}, $('strong', {}, item.title), $('small', {}, label(item.type))), $('div', { class: 'row' },
        $('label', { class: 'check-field home-toggle' }, $('input', { type: 'checkbox', checked: item.showOnHome !== false, onchange: event => { item.showOnHome = event.target.checked; save(); render(); } }), 'Home'),
        $('button', { class: 'btn small', onclick: () => edit(item.id) }, 'Modifica'),
        $('button', { class: 'btn small', onclick: () => dup(item.id) }, 'Duplica'),
        $('button', { class: 'btn small danger', onclick: () => del(item.id) }, 'Elimina')
      ))),
      $('h3', {}, 'Immagini riferimento repo'),
      $('div', { class: 'reference-grid' }, ...REFERENCE_IMAGES.map(name => $('a', { href: `public/reference-images/${encodeURIComponent(name)}`, target: '_blank', class: 'ref-thumb' }, $('img', { src: `public/reference-images/${encodeURIComponent(name)}`, alt: name }), $('span', {}, name.replace(/^\d+\.\s*/, '').replace('.png', '')))))
    )
  );
}

function updateGame(item, mutate, shouldRender = true) {
  mutate(item);
  item.menuTitle = item.menuTitle || (item.title || label(item.type)).toUpperCase();
  scheduleSave();
  const jsonArea = document.getElementById('json');
  if (jsonArea && editing === item.id) {
    const status = document.getElementById('json-sync-status');
    if (jsonArea.dataset.dirty === 'true') {
      status.className = 'asset-field-feedback invalid';
      status.textContent = 'Conflitto: il visuale e il JSON contengono modifiche diverse.';
    } else {
      jsonArea.value = JSON.stringify(item, null, 2);
      if (status) status.textContent = 'JSON sincronizzato con l’editor visuale.';
    }
  }
  if (shouldRender) render();
}

function editorInput(labelText, value, onChange, attrs = {}) {
  const usesLocalAsset = attrs.type == null && /immagine|audio|media|percorso/i.test(labelText);
  const input = $('input', {
    value: value ?? '',
    ...(usesLocalAsset ? { list: 'local-assets' } : {}),
    ...attrs,
    onchange: event => onChange(attrs.type === 'number' ? Number(event.target.value || 0) : event.target.value, event)
  });
  if (!usesLocalAsset) return $('label', { class: 'editor-field' }, labelText, input);
  const feedback = $('small', { class: 'asset-field-feedback', role: 'status' });
  const preview = $('div', { class: 'asset-field-preview' });
  const refresh = () => refreshAssetField(input.value, labelText, feedback, preview);
  input.addEventListener('input', refresh);
  requestAnimationFrame(refresh);
  return $('label', { class: 'editor-field asset-editor-field' }, labelText, input, feedback, preview);
}

function refreshAssetField(path, labelText, feedback, preview) {
  const normalized = String(path || '').trim().replaceAll('\\', '/');
  preview.replaceChildren();
  if (!normalized) {
    feedback.className = 'asset-field-feedback muted';
    feedback.textContent = 'Nessun file selezionato.';
    return;
  }
  const extension = normalized.split('.').pop()?.toLowerCase();
  const expected = /audio/i.test(labelText) ? ['mp3', 'wav', 'ogg', 'm4a'] : /video/i.test(labelText) ? ['mp4', 'webm'] : ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'mp4', 'webm'];
  const exists = localAssets.some(asset => asset.path === normalized);
  const validRoot = normalized.startsWith('public/assets/') && !normalized.includes('../');
  const validFormat = expected.includes(extension);
  const valid = validRoot && validFormat && (!localAssets.length || exists);
  feedback.className = `asset-field-feedback ${valid ? 'valid' : 'invalid'}`;
  feedback.textContent = !validRoot ? 'Il percorso deve essere locale sotto public/assets/.'
    : !validFormat ? `Formato .${extension || '?'} non supportato in questo campo.`
      : !exists && localAssets.length ? 'File locale non trovato nel manifest.' : 'File locale valido.';
  if (!valid) return;
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) preview.append(audio(normalized));
  else if (['mp4', 'webm'].includes(extension)) preview.append(media(normalized, `Anteprima ${labelText}`));
  else preview.append(media(localThumbnails[normalized] || normalized, `Anteprima ${labelText}`));
}

function editorArea(labelText, value, onChange) {
  return $('label', { class: 'editor-field' }, labelText, $('textarea', {
    value: value ?? '',
    style: 'min-height:82px',
    onchange: event => onChange(event.target.value)
  }));
}

function addSlideElement(item, type, options = {}) {
  const element = {
    id: id('el'),
    type,
    shape: options.shape || 'rect',
    text: type === 'image' ? '' : type === 'shape' ? '' : 'Nuovo testo',
    src: '',
    x: options.x ?? 12,
    y: options.y ?? 14,
    w: options.w ?? (type === 'image' ? 28 : type === 'shape' ? 22 : 32),
    h: options.h ?? (type === 'image' ? 24 : type === 'shape' ? 16 : 12),
    size: type === 'image' ? 24 : 34,
    color: '#ffd21a',
    bg: type === 'shape' ? 'rgba(0,231,255,.18)' : 'rgba(5,18,48,.72)',
    border: 'rgba(0,231,255,.85)',
    z: ensureSlideElements(item).length + 1
  };
  ensureSlideElements(item).push(element);
  selectedElementId = element.id;
  save();
  render();
}

function elementLabel(element) {
  if (element.type === 'image') return 'Immagine';
  if (element.type === 'shape') return element.shape === 'circle' ? 'Cerchio' : 'Rettangolo';
  return 'Testo';
}

function moveElementLayer(item, element, delta) {
  const elements = ensureSlideElements(item);
  const current = Number(element.z || 1);
  element.z = clamp(current + delta, 1, Math.max(elements.length + 4, 8));
  save();
  render();
}

function duplicateElement(item, element) {
  const copy = { ...clone(element), id: id('el'), x: clamp(Number(element.x || 0) + 3, 0, 92), y: clamp(Number(element.y || 0) + 3, 0, 92), z: ensureSlideElements(item).length + 1 };
  ensureSlideElements(item).push(copy);
  selectedElementId = copy.id;
  save();
  render();
}

function selectedEditableBox(item) {
  if (selectedElementId === 'game-ribbon') {
    return { kind: 'game-ribbon', label: 'Titolo minigioco', box: ensureGameRibbonLayout(item) };
  }
  const custom = ensureSlideElements(item).find(element => element.id === selectedElementId);
  if (custom) return { kind: 'custom', label: elementLabel(custom), box: custom };
  const nativeMatch = /^guess-tile-(\d+)$/.exec(selectedElementId);
  if (item.type === 'guess' && nativeMatch) {
    const index = Number(nativeMatch[1]);
    const tile = ensureGuessTileLayouts(item, Math.max(index + 1, 4))[index];
    if (tile) return { kind: 'guess', label: `Box ${index + 1}`, box: tile };
  }
  const controlMatch = /^guess-control-(\w+)$/.exec(selectedElementId);
  if (item.type === 'guess' && controlMatch) {
    const key = controlMatch[1];
    const control = ensureGuessControlLayouts(item)[key];
    if (control) return { kind: 'guess-control', label: control.label || 'Controllo', box: control };
  }
  return null;
}

function alignSelectedElement(item, mode) {
  const target = selectedEditableBox(item);
  if (!target) return toast('Seleziona un oggetto o un box da allineare.');
  const box = target.box;
  if (mode === 'left') box.x = 0;
  if (mode === 'center-x') box.x = (100 - Number(box.w || 0)) / 2;
  if (mode === 'right') box.x = 100 - Number(box.w || 0);
  if (mode === 'top') box.y = 0;
  if (mode === 'center-y') box.y = (100 - Number(box.h || 0)) / 2;
  if (mode === 'bottom') box.y = 100 - Number(box.h || 0);
  box.x = clamp(Number(box.x || 0), 0, 100 - Number(box.w || 0));
  box.y = clamp(Number(box.y || 0), 0, 100 - Number(box.h || 0));
  save();
  render();
}

function resetGuessTileGrid(item) {
  if (item.type !== 'guess') return toast('La griglia box e disponibile in Indovina il personaggio.');
  ensureLayout(item).guessTiles = [
    { x: 10, y: 12, w: 36, h: 35 },
    { x: 54, y: 12, w: 36, h: 35 },
    { x: 10, y: 51, w: 36, h: 35 },
    { x: 54, y: 51, w: 36, h: 35 }
  ];
  save();
  render();
}

function resetGuessControls(item) {
  if (item.type !== 'guess') return toast('I controlli sono disponibili in Indovina il personaggio.');
  delete ensureLayout(item).guessControls;
  ensureGuessControlLayouts(item);
  save();
  render();
}

function resetGameRibbon(item) {
  delete ensureLayout(item).gameRibbon;
  ensureGameRibbonLayout(item);
  selectedElementId = 'game-ribbon';
  save();
  render();
}

function alignPanel(item) {
  const target = selectedEditableBox(item);
  return $('div', { class: 'stack align-panel' },
    $('h3', {}, 'Allinea'),
    $('p', { class: 'muted' }, target ? `Oggetto selezionato: ${target.label}` : 'Seleziona un oggetto o un box sulla slide.'),
    $('div', { class: 'align-grid' },
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'left') }, 'Sinistra'),
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'center-x') }, 'Centro X'),
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'right') }, 'Destra'),
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'top') }, 'Alto'),
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'center-y') }, 'Centro Y'),
      $('button', { class: 'btn small', onclick: () => alignSelectedElement(item, 'bottom') }, 'Basso')
    ),
    item.type === 'guess' ? $('div', { class: 'row' },
      $('button', { class: 'btn', onclick: () => resetGuessTileGrid(item) }, 'Disponi box 2x2'),
      $('button', { class: 'btn', onclick: () => resetGuessControls(item) }, 'Reset controlli')
    ) : null,
    $('button', { class: 'btn', onclick: () => resetGameRibbon(item) }, 'Reset titolo minigioco')
  );
}

function directEditTools(item) {
  const selected = ensureSlideElements(item).find(element => element.id === selectedElementId) || ensureSlideElements(item)[0];
  return $('div', { class: 'direct-edit-tools' },
    $('div', { class: 'direct-toolbar' },
      $('span', { class: 'edit-badge' }, 'MODIFICA SLIDE'),
      $('button', { class: 'btn success', onclick: () => addSlideElement(item, 'text') }, 'Testo'),
      $('button', { class: 'btn', onclick: () => addSlideElement(item, 'image') }, 'Immagine'),
      $('button', { class: 'btn', onclick: () => addSlideElement(item, 'shape', { shape: 'rect' }) }, 'Rettangolo'),
      $('button', { class: 'btn', onclick: () => addSlideElement(item, 'shape', { shape: 'circle', w: 16, h: 16 }) }, 'Cerchio'),
      $('button', { class: `btn ${directEditPanel === 'layers' ? 'primary' : ''}`, onclick: () => { directEditPanel = 'layers'; render(); } }, 'Layer'),
      $('button', { class: `btn ${directEditPanel === 'content' ? 'primary' : ''}`, onclick: () => { directEditPanel = 'content'; render(); } }, 'Contenuto'),
      $('button', { class: `btn ${directEditPanel === 'align' ? 'primary' : ''}`, onclick: () => { directEditPanel = 'align'; render(); } }, 'Allinea'),
      $('button', { class: 'btn ghost', onclick: () => { directEdit = false; selectedElementId = ''; render(); } }, 'Chiudi strumenti')
    ),
    $('aside', { class: `direct-inspector ${directEditPanel === 'content' ? 'wide' : ''}` },
      directEditPanel === 'content'
        ? nativeContentPanel(item)
        : directEditPanel === 'align'
        ? alignPanel(item)
        : selected ? elementInspector(item, selected) : $('p', { class: 'muted' }, 'Aggiungi o seleziona un oggetto sulla pagina.')
    )
  );
}

function nativeContentPanel(item) {
  return $('div', { class: 'stack native-content-panel' },
    $('h3', {}, 'Elementi del minigioco'),
    $('p', { class: 'muted' }, 'Questi elementi appartengono al layout del gioco: qui puoi modificarne contenuti, immagini, audio, risposte e dimensioni. Per oggetti completamente liberi usa i layer.'),
    $('div', { class: 'game-basics direct-basics' },
      editorInput('Titolo', item.title || '', value => updateGame(item, target => target.title = value, false)),
      editorInput('Titolo menu', item.menuTitle || '', value => updateGame(item, target => target.menuTitle = value.toUpperCase(), false)),
      pointsEditor(item)
    ),
    layoutEditor(item),
    visualContentEditor(item)
  );
}

function layoutEditor(item) {
  if (item.type !== 'guess') return null;
  const layout = ensureLayout(item);
  const setLayout = (key, value, min, max) => updateGame(item, () => layout[key] = clamp(Number(value || 0), min, max), false);
  return $('section', { class: 'content-editor layout-editor' },
    $('h3', {}, 'Dimensioni e stile dei box'),
    $('div', { class: 'compact-list layout-controls' },
      $('div', { class: 'mini-row wide' },
        editorInput('Larghezza griglia (vw)', layout.guessGridWidth ?? 76, value => setLayout('guessGridWidth', value, 35, 96), { type: 'number' }),
        editorInput('Larghezza massima (px)', layout.guessGridMax ?? 1180, value => setLayout('guessGridMax', value, 520, 1600), { type: 'number' })
      ),
      $('div', { class: 'mini-row wide' },
        editorInput('Spazio orizzontale', layout.guessGapX ?? 24, value => setLayout('guessGapX', value, 0, 80), { type: 'number' }),
        editorInput('Spazio verticale', layout.guessGapY ?? 18, value => setLayout('guessGapY', value, 0, 80), { type: 'number' })
      ),
      $('div', { class: 'mini-row wide' },
        editorInput('Raggio angoli', layout.guessRadius ?? 14, value => setLayout('guessRadius', value, 0, 40), { type: 'number' }),
        editorInput('Spessore bordo', layout.guessBorder ?? 2, value => setLayout('guessBorder', value, 0, 12), { type: 'number' })
      ),
      $('div', { class: 'mini-row wide' },
        editorInput('Dimensione testo', layout.guessFont ?? 64, value => setLayout('guessFont', value, 24, 120), { type: 'number' }),
        $('label', { class: 'editor-field' }, 'Adattamento immagine',
          $('select', { onchange: event => updateGame(item, () => layout.guessFit = event.target.value, false) },
            $('option', { value: 'cover', selected: (layout.guessFit || 'cover') === 'cover' }, 'Riempi box'),
            $('option', { value: 'contain', selected: layout.guessFit === 'contain' }, 'Mostra intera'),
            $('option', { value: 'fill', selected: layout.guessFit === 'fill' }, 'Stira')
          )
        )
      )
    )
  );
}

function slideDesigner(item) {
  const selected = ensureSlideElements(item).find(element => element.id === selectedElementId) || ensureSlideElements(item)[0];
  return $('section', { class: 'slide-designer' },
    $('div', { class: 'designer-head' },
      $('div', {}, $('h3', {}, 'Editor diapositiva'), $('p', { class: 'muted' }, 'Trascina gli elementi nella lavagna. Usa il quadratino in basso a destra per ridimensionarli.')),
      $('div', { class: 'row' },
        $('button', { class: 'btn success', onclick: () => addSlideElement(item, 'text') }, 'Aggiungi testo'),
        $('button', { class: 'btn', onclick: () => addSlideElement(item, 'image') }, 'Aggiungi immagine')
      )
    ),
    $('div', { class: 'game-basics' },
      editorInput('Titolo', item.title || '', value => updateGame(item, target => target.title = value, false)),
      editorInput('Titolo menu', item.menuTitle || '', value => updateGame(item, target => target.menuTitle = value.toUpperCase(), false)),
      pointsEditor(item)
    ),
    visualContentEditor(item),
    $('div', { class: 'slide-workbench' },
      $('div', { class: 'slide-canvas-wrap' },
        $('div', { class: 'slide-canvas' },
          $('div', { class: 'slide-canvas-bg' },
            $('div', { class: 'game-ribbon mock' }, item.menuTitle || item.title || label(item.type)),
            $('div', { class: 'slide-placeholder' }, label(item.type))
          ),
          slideLayer(item, true)
        )
      ),
      $('aside', { class: 'slide-inspector' }, selected ? elementInspector(item, selected) : $('p', { class: 'muted' }, 'Aggiungi un testo o una immagine per personalizzare la pagina.'))
    )
  );
}

function elementInspector(item, element) {
  const elements = ensureSlideElements(item);
  return $('div', { class: 'stack' },
    $('h3', {}, 'Oggetto selezionato'),
    $('div', { class: 'row' }, ...elements.map(entry => $('button', {
      class: `btn small ${entry.id === element.id ? 'primary' : ''}`,
      onclick: () => { selectedElementId = entry.id; render(); }
    }, elementLabel(entry)))),
    element.type === 'image'
      ? editorInput('Percorso immagine', element.src || '', value => updateGame(item, () => element.src = value, false))
      : element.type === 'shape'
        ? $('div', { class: 'grid two' },
            $('label', { class: 'editor-field' }, 'Forma', $('select', { value: element.shape || 'rect', onchange: event => updateGame(item, () => element.shape = event.target.value, false) },
              $('option', { value: 'rect', selected: (element.shape || 'rect') === 'rect' }, 'Rettangolo'),
              $('option', { value: 'circle', selected: element.shape === 'circle' }, 'Cerchio')
            )),
            editorInput('Etichetta', element.text || '', value => updateGame(item, () => element.text = value, false))
          )
        : editorArea('Testo', element.text || '', value => updateGame(item, () => element.text = value, false)),
    $('div', { class: 'row' },
      $('button', { class: 'btn small', onclick: () => moveElementLayer(item, element, 1) }, 'Avanti'),
      $('button', { class: 'btn small', onclick: () => moveElementLayer(item, element, -1) }, 'Indietro'),
      $('button', { class: 'btn small', onclick: () => duplicateElement(item, element) }, 'Duplica')
    ),
    $('div', { class: 'grid two' },
      editorInput('X %', element.x, value => updateGame(item, () => element.x = clamp(value, 0, 100), false), { type: 'number' }),
      editorInput('Y %', element.y, value => updateGame(item, () => element.y = clamp(value, 0, 100), false), { type: 'number' }),
      editorInput('Larghezza %', element.w, value => updateGame(item, () => element.w = clamp(value, 5, 100), false), { type: 'number' }),
      editorInput('Altezza %', element.h, value => updateGame(item, () => element.h = clamp(value, 5, 100), false), { type: 'number' }),
      editorInput('Font px', element.size || 32, value => updateGame(item, () => element.size = clamp(value, 10, 120), false), { type: 'number' }),
      editorInput('Livello', element.z || 1, value => updateGame(item, () => element.z = value, false), { type: 'number' })
    ),
    $('div', { class: 'grid two' },
      editorInput('Colore testo', element.color || '#ffd21a', value => updateGame(item, () => element.color = value, false), { type: 'color' }),
      editorInput('Sfondo', element.bg || '#051230', value => updateGame(item, () => element.bg = value, false), { type: 'color' }),
      editorInput('Bordo', element.border || '#00e7ff', value => updateGame(item, () => element.border = value, false), { type: 'color' })
    ),
    $('button', { class: 'btn danger', onclick: () => { item.customElements = elements.filter(entry => entry.id !== element.id); selectedElementId = item.customElements[0]?.id || ''; save(); render(); } }, 'Elimina oggetto')
  );
}

function ensureList(item, key, length, factory) {
  item[key] ||= [];
  while (item[key].length < length) item[key].push(factory(item[key].length));
  return item[key];
}

function pointsEditor(item) {
  const set = (key, value) => updateGame(item, target => target[key] = Number(value || 0), false);
  if (item.type === 'pass') {
    item.points ||= { facile: 5, medio: 10, difficile: 20 };
    item.bonus ||= { facile: 200, medio: 500, difficile: 1000 };
    return $('div', { class: 'points-editor stack' },
      $('strong', {}, 'Punti per difficoltà'),
      $('div', { class: 'grid two' },
        ...['facile', 'medio', 'difficile'].map(level => editorInput(`Punti ${level}`, item.points[level] ?? 0, value => updateGame(item, () => item.points[level] = Number(value || 0), false), { type: 'number' })),
        ...['facile', 'medio', 'difficile'].map(level => editorInput(`Bonus ${level}`, item.bonus[level] ?? 0, value => updateGame(item, () => item.bonus[level] = Number(value || 0), false), { type: 'number' }))
      )
    );
  }
  if (item.type === 'sarabanda') {
    return $('div', { class: 'grid two' },
      editorInput('Punti titolo', item.pointsTitle ?? 25, value => set('pointsTitle', value), { type: 'number' }),
      editorInput('Punti artista', item.pointsArtist ?? 25, value => set('pointsArtist', value), { type: 'number' })
    );
  }
  if (item.type === 'bomb') return editorInput('Punti per risposta', item.pointsPerCorrect ?? 50, value => set('pointsPerCorrect', value), { type: 'number' });
  return editorInput('Punti base', item.points ?? 0, value => set('points', value), { type: 'number' });
}

function guessClueTemplate(index) {
  const value = DEFAULT_GUESS_POINTS[index] ?? `Indizio ${index + 1}`;
  return { label: String(value), image: '' };
}

function createGuessRound() {
  return {
    answer: 'Nome personaggio',
    points: [...DEFAULT_GUESS_POINTS],
    clues: DEFAULT_GUESS_POINTS.map((_, index) => guessClueTemplate(index))
  };
}

function normalizeGuessRound(round) {
  round.points ||= [...DEFAULT_GUESS_POINTS];
  const clues = round.clues ||= [];
  while (clues.length < 4) clues.push(guessClueTemplate(clues.length));
  clues.forEach((clue, index) => {
    if (typeof clue === 'string') clues[index] = { label: round.points?.[index] || `Indizio ${index + 1}`, image: clue };
  });
  return round;
}

function switchGuessRound(index, total) {
  cur.i = clamp(index, 0, Math.max(total - 1, 0));
  cur.revealed = 0;
  cur.answer = false;
  cur.jeo = null;
  render();
}

function addGuessRound(item, sourceRound = null) {
  const insertAt = clamp(Number(cur.i || 0) + 1, 0, item.rounds?.length || 0);
  updateGame(item, target => {
    const rounds = target.rounds ||= [];
    const next = sourceRound ? clone(sourceRound) : createGuessRound();
    if (sourceRound) next.answer = `${next.answer || 'Nome personaggio'} copia`;
    rounds.splice(insertAt, 0, next);
    cur.i = insertAt;
    cur.revealed = 0;
    cur.answer = false;
  });
}

function deleteGuessRound(item, roundIndex) {
  const rounds = item.rounds ||= [];
  if (rounds.length <= 1) return toast('Deve restare almeno una slide.');
  updateGame(item, () => {
    rounds.splice(roundIndex, 1);
    cur.i = clamp(roundIndex - 1, 0, rounds.length - 1);
    cur.revealed = 0;
    cur.answer = false;
  });
}

function guessRoundToolbar(item, rounds, roundIndex, round) {
  return $('div', { class: 'guess-round-toolbar' },
    $('button', { class: 'btn small', disabled: roundIndex <= 0, onclick: () => switchGuessRound(roundIndex - 1, rounds.length) }, 'Indietro'),
    $('span', { class: 'pill' }, `Slide ${roundIndex + 1} / ${rounds.length}`),
    $('button', { class: 'btn small', disabled: roundIndex >= rounds.length - 1, onclick: () => switchGuessRound(roundIndex + 1, rounds.length) }, 'Avanti'),
    $('button', { class: 'btn small success', onclick: () => addGuessRound(item) }, 'Aggiungi slide'),
    $('button', { class: 'btn small', onclick: () => addGuessRound(item, round) }, 'Duplica slide'),
    $('button', { class: 'btn small danger', disabled: rounds.length <= 1, onclick: () => deleteGuessRound(item, roundIndex) }, 'Elimina slide')
  );
}

function guessClueEditor(clue, index, saveField) {
  const saveClue = (event, mutate, updatePreview = true) => {
    saveField(mutate);
    if (updatePreview) refreshGuessCluePreview(event?.currentTarget?.closest('.clue-editor'), clue, index);
  };
  const resetCrop = event => saveClue(event, () => {
      delete clue.fit;
      delete clue.positionX;
      delete clue.positionY;
      delete clue.zoom;
    });
  return $('div', { class: 'mini-row clue-editor' },
    editorInput(`Box ${index + 1}`, clue.label || '', (value, event) => saveClue(event, () => clue.label = value, false)),
    editorInput('Immagine', clue.image || '', (value, event) => saveClue(event, () => clue.image = value)),
    $('div', { class: 'clue-preview' },
      clue.image
        ? guessClueMedia(clue, `Anteprima box ${index + 1}`)
        : $('span', { class: 'muted' }, 'Anteprima immagine')
    ),
    $('div', { class: 'clue-crop-controls' },
      $('label', { class: 'editor-field' }, 'Adattamento',
        $('select', { onchange: event => saveClue(event, () => event.target.value ? clue.fit = event.target.value : delete clue.fit) },
          $('option', { value: '', selected: !clue.fit }, 'Usa globale'),
          $('option', { value: 'cover', selected: clue.fit === 'cover' }, 'Riempi box'),
          $('option', { value: 'contain', selected: clue.fit === 'contain' }, 'Mostra intera'),
          $('option', { value: 'fill', selected: clue.fit === 'fill' }, 'Stira')
        )
      ),
      editorInput('X %', clue.positionX ?? 50, (value, event) => saveClue(event, () => clue.positionX = clamp(Number(value || 0), 0, 100)), { type: 'number', min: '0', max: '100' }),
      editorInput('Y %', clue.positionY ?? 50, (value, event) => saveClue(event, () => clue.positionY = clamp(Number(value || 0), 0, 100)), { type: 'number', min: '0', max: '100' }),
      editorInput('Zoom', clue.zoom ?? 1, (value, event) => saveClue(event, () => clue.zoom = clamp(Number(value || 0), 1, 3)), { type: 'number', min: '1', max: '3', step: '0.05' }),
      $('button', { class: 'btn small', onclick: resetCrop }, 'Reset ritaglio')
    )
  );
}

function visualContentEditor(item) {
  const saveField = (mutate) => updateGame(item, mutate, false);
  if (item.type === 'guillotine') {
    const words = item.words ||= ['', '', '', '', ''];
    return $('section', { class: 'content-editor' }, $('h3', {}, 'Contenuto rapido'),
      ...Array.from({ length: 5 }, (_, index) => editorInput(`Indizio ${index + 1}`, words[index] || '', value => saveField(() => words[index] = value))),
      editorInput('Risposta finale', item.answer || '', value => saveField(target => target.answer = value))
    );
  }
  if (item.type === 'guess') {
    const rounds = item.rounds ||= [{ answer: '', clues: [] }];
    const roundIndex = clamp(Number(cur.i || 0), 0, Math.max(rounds.length - 1, 0));
    const round = normalizeGuessRound(rounds[roundIndex] || rounds[0]);
    const clues = round.clues;
    return $('section', { class: 'content-editor', 'data-scroll-key': `guess-content-${item.id}` }, $('h3', {}, `Contenuto dei box - ${roundIndex + 1}/${rounds.length}`),
      guessRoundToolbar(item, rounds, roundIndex, round),
      editorInput('Risposta', round.answer || '', value => saveField(() => round.answer = value)),
      ...clues.slice(0, 4).map((clue, index) => guessClueEditor(clue, index, saveField))
    );
  }
  if (item.type === 'bomb') {
    const items = ensureList(item, 'items', 20, index => ({ label: `Elemento ${index + 1}`, image: '', isBomb: index >= 16 }));
    return $('section', { class: 'content-editor' }, $('h3', {}, 'Contenuto rapido'),
      editorArea('Domanda', item.question || '', value => saveField(target => target.question = value)),
      $('div', { class: 'compact-list' }, ...items.map((entry, index) => $('div', { class: 'mini-row' },
        editorInput(`${index + 1}`, entry.label || '', value => saveField(() => entry.label = value)),
        editorInput('Immagine locale', entry.image || '', value => saveField(() => entry.image = value)),
        $('label', { class: 'check-field' }, $('input', { type: 'checkbox', checked: !!entry.isBomb, onchange: event => saveField(() => entry.isBomb = event.target.checked) }), 'Bomba')
      )))
    );
  }
  if (item.type === 'said') return questionEditor(item, 'questions', 10, index => ({ prompt: `Audio ${index + 1}`, audio: '', answer: '' }), [
    ['Prompt', 'prompt'],
    ['Audio', 'audio'],
    ['Risposta', 'answer'],
    ['Media risposta', 'media']
  ]);
  if (item.type === 'detail') return questionEditor(item, 'questions', 5, index => ({ detailImage: '', fullImage: '', answer: `Dettaglio ${index + 1}` }), [
    ['Dettaglio', 'detailImage'],
    ['Immagine completa', 'fullImage'],
    ['Risposta', 'answer']
  ]);
  if (item.type === 'quote') return questionEditor(item, 'questions', 5, index => ({ partial: `Citazione ${index + 1}`, answer: '' }), [
    ['Frase incompleta', 'partial'],
    ['Risposta', 'answer'],
    ['Fonte', 'source']
  ]);
  if (item.type === 'chain') return questionEditor(item, 'questions', 20, index => ({ question: `Domanda ${index + 1}`, answer: '' }), [
    ['Domanda', 'question'],
    ['Risposta', 'answer']
  ]);
  if (item.type === 'labors') return questionEditor(item, 'questions', 10, index => ({ question: `Fatica ${index + 1}`, answer: '' }), [
    ['Tipo', 'kind'],
    ['Domanda', 'question'],
    ['Opzioni separate da |', 'optionsText'],
    ['Risposta', 'answer'],
    ['Spiegazione', 'explanation']
  ]);
  if (item.type === 'pass') {
    const questions = ensureList(item, 'questions', ABC.length, index => ({ letter: ABC[index], question: `Con la ${ABC[index]}: domanda`, answer: '' }));
    return $('section', { class: 'content-editor' }, $('h3', {}, 'Domande Passaparola'),
      $('label', { class: 'editor-field' }, 'Difficoltà', $('select', { onchange: event => updateGame(item, target => target.difficulty = event.target.value, false) },
        ...['facile', 'medio', 'difficile'].map(level => $('option', { value: level, selected: (item.difficulty || 'facile') === level }, level))
      )),
      $('div', { class: 'compact-list' }, ...questions.map((row, index) => $('div', { class: 'mini-row wide' },
        $('strong', {}, row.letter || ABC[index]),
        editorInput('Domanda', row.question || '', value => updateGame(item, () => row.question = value, false)),
        editorInput('Risposta', row.answer || '', value => updateGame(item, () => row.answer = value, false))
      )))
    );
  }
  if (item.type === 'jeopardy') {
    const categories = ensureList(item, 'categories', 5, index => ({ name: `Categoria ${index + 1}`, clues: [] }));
    categories.forEach(category => ensureList(category, 'clues', 5, index => ({ value: (index + 1) * 100, question: '', answer: '' })));
    return $('section', { class: 'content-editor' }, $('h3', {}, 'Tabellone Jeopardy'),
      ...categories.map((category, categoryIndex) => $('div', { class: 'stack panel-lite' },
        editorInput(`Categoria ${categoryIndex + 1}`, category.name || '', value => updateGame(item, () => category.name = value, false)),
        ...category.clues.map((clue, clueIndex) => $('div', { class: 'mini-row wide' },
          editorInput('Valore', clue.value ?? (clueIndex + 1) * 100, value => updateGame(item, () => clue.value = Number(value || 0), false), { type: 'number' }),
          editorInput('Domanda', clue.question || '', value => updateGame(item, () => clue.question = value, false)),
          editorInput('Risposta', clue.answer || '', value => updateGame(item, () => clue.answer = value, false))
        ))
      ))
    );
  }
  if (item.type === 'sarabanda') return questionEditor(item, 'songs', 12, index => ({ audio: '', title: `Titolo ${index + 1}`, artist: '' }), [
    ['Audio', 'audio'],
    ['Titolo', 'title'],
    ['Artista', 'artist']
  ]);
  return $('section', { class: 'content-editor' }, $('h3', {}, 'Contenuto rapido'), $('p', { class: 'muted' }, 'Per questo minigioco usa il JSON avanzato oppure aggiungi elementi liberi sulla slide.'));
}

function questionEditor(item, key, length, factory, fields) {
  const rows = Array.isArray(item[key]) && item[key].length ? item[key] : ensureList(item, key, length, factory);
  return $('section', { class: 'content-editor' }, $('h3', {}, 'Contenuto rapido'),
    $('div', { class: 'compact-list' },
      ...rows.map((row, index) => $('div', { class: 'mini-row wide' },
        $('strong', {}, index + 1),
        ...fields.map(([labelText, field]) => field === 'optionsText'
          ? editorInput(labelText, Array.isArray(row.options) ? row.options.join(' | ') : '', value => updateGame(item, () => { row.options = value.split('|').map(option => option.trim()).filter(Boolean); }, false))
          : editorInput(labelText, row[field] || '', value => updateGame(item, () => row[field] = value, false))),
        $('div', { class: 'row question-row-actions' },
          $('button', { class: 'btn small', disabled: index === 0, onclick: () => reorderQuestion(item, key, index, index - 1) }, 'Su'),
          $('button', { class: 'btn small', disabled: index === rows.length - 1, onclick: () => reorderQuestion(item, key, index, index + 1) }, 'Giù'),
          $('button', { class: 'btn small', onclick: () => duplicateQuestion(item, key, index) }, 'Duplica'),
          $('button', { class: 'btn small danger', disabled: rows.length <= 1, onclick: () => deleteQuestion(item, key, index) }, 'Elimina')
        )
      ))
    )
  );
}

function reorderQuestion(item, key, from, to) {
  updateGame(item, target => {
    const [entry] = target[key].splice(from, 1);
    target[key].splice(to, 0, entry);
  });
}

function duplicateQuestion(item, key, index) {
  updateGame(item, target => target[key].splice(index + 1, 0, clone(target[key][index])));
}

function deleteQuestion(item, key, index) {
  if (!confirm(`Eliminare la domanda ${index + 1}?`)) return;
  updateGame(item, target => target[key].splice(index, 1));
}

function preview() {
  const type = document.getElementById('type')?.value || 'guess';
  const title = document.getElementById('title')?.value || 'Nuovo minigioco';
  const jsonArea = document.getElementById('json');
  if (!jsonArea) return;
  const item = templates[type]();
  item.title = title;
  item.menuTitle = title.toUpperCase();
  item.showOnHome = true;
  jsonArea.value = JSON.stringify(item, null, 2);
}

function saveEditor(openAfterSave = false) {
  const validation = document.getElementById('editor-validation');
  try {
    const jsonArea = document.getElementById('json');
    if (jsonArea.dataset.dirty === 'true' && editing) {
      const current = state.games.find(game => game.id === editing);
      const diverged = current && JSON.stringify(current, null, 2) !== jsonArea.value;
      if (diverged && !confirm('Il JSON avanzato sostituirà le modifiche del form visuale. Continuare?')) return;
    }
    const item = JSON.parse(jsonArea.value);
    const errors = validateGameForEditor(item);
    if (errors.length) throw new Error(errors.join(' '));
    item.id = item.id || id('game');
    item.title = document.getElementById('title').value.trim() || item.title;
    item.menuTitle = item.menuTitle || item.title?.toUpperCase();
    item.showOnHome = item.showOnHome !== false;
    const index = state.games.findIndex(game => game.id === (editing || item.id));
    index >= 0 ? state.games[index] = item : state.games.unshift(item);
    gameId = item.id;
    editing = '';
    save();
    toast('Minigioco salvato');
    if (validation) validation.hidden = true;
    if (openAfterSave) {
      view = 'show';
      resetStage('game');
      return;
    }
    render();
  } catch (error) {
    if (validation) {
      validation.hidden = false;
      validation.textContent = error.message;
    }
    toast(`JSON non valido: ${error.message}`);
  }
}

function validateGameForEditor(item) {
  const errors = [];
  if (!item || typeof item !== 'object' || Array.isArray(item)) return ['Il minigioco deve essere un oggetto JSON.'];
  if (!TYPES[item.type]) errors.push('Tipo di minigioco non supportato.');
  if (!String(item.title || '').trim()) errors.push('Il titolo è obbligatorio.');
  const listKey = item.type === 'guess' ? 'rounds' : item.type === 'bomb' ? 'items' : item.type === 'sarabanda' ? 'songs' : ['said', 'detail', 'quote', 'chain', 'labors', 'pass'].includes(item.type) ? 'questions' : item.type === 'jeopardy' ? 'categories' : null;
  if (listKey && (!Array.isArray(item[listKey]) || !item[listKey].length)) errors.push(`${listKey}: aggiungi almeno un elemento.`);
  return errors;
}

function edit(gid) {
  const item = state.games.find(game => game.id === gid);
  if (!item) return;
  editing = gid;
  selectedElementId = ensureSlideElements(item)[0]?.id || '';
  render();
}

function dup(gid) {
  const item = clone(state.games.find(game => game.id === gid));
  item.id = id('game');
  item.title += ' copia';
  item.menuTitle = `${item.menuTitle || item.title} COPIA`;
  item.showOnHome = item.showOnHome !== false;
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
    ...state.players.map(item => $('div', { class: 'score-card' }, $('input', { value: item.name, 'aria-label': `Nome giocatore ${item.name}`, onchange: event => { item.name = event.target.value.toUpperCase(); save(); render(); } }), $('input', { type: 'number', value: item.score || 0, 'aria-label': `Punteggio ${item.name}`, onchange: event => { item.score = Number(event.target.value || 0); save(); render(); } }), $('button', { class: 'btn danger', onclick: () => { if (state.players.length < 2) return toast('Deve restare almeno un giocatore.'); state.players = state.players.filter(player => player.id !== item.id); playerId = state.players[0]?.id; scorePanelPlayerId = ''; save(); render(); } }, 'Rimuovi')))
  );
}

function libraryAdmin() { return $('section', { class: 'stack' }, $('h3', {}, 'Lista Anime / Argomenti'), $('textarea', { value: state.library.join('\n'), 'aria-label': 'Lista anime e argomenti', style: 'min-height:160px', onchange: event => { state.library = event.target.value.split('\n').map(item => item.trim()).filter(Boolean); save(); render(); } })); }
function powersAdmin() { return $('section', { class: 'stack' }, $('h3', {}, 'Poteri'), $('textarea', { value: JSON.stringify(state.powers, null, 2), 'aria-label': 'Configurazione JSON dei poteri', style: 'min-height:180px', onchange: event => { try { state.powers = JSON.parse(event.target.value); save(); toast('Poteri aggiornati'); } catch { toast('JSON poteri non valido'); } } })); }
function scores() {
  return $('main', { class: 'grid two' },
    $('section', { class: 'panel stack' },
      $('h2', {}, 'Gestione manuale punteggi'),
      pointsScreen(),
      $('div', { class: 'row' },
        $('button', { class: 'btn danger', onclick: () => {
          if (!confirm('Iniziare una nuova partita? Punteggi, storico e progressi verranno azzerati.')) return;
          exportData('backup-prima-nuova-partita');
          backupDocument(localStorage, BACKUP_KEY, serializeDocument(state));
          state.players.forEach(item => item.score = 0);
          state.history = [];
          state.session = { games: {} };
          save();
          view = 'show';
          resetStage('hub');
        } }, 'Nuova partita'),
        $('button', { class: 'btn', onclick: () => {
          if (!state.history.length || !confirm('Svuotare lo storico punti? Verrà prima esportato un backup.')) return;
          exportData('backup-prima-svuota-storico');
          backupDocument(localStorage, BACKUP_KEY, serializeDocument(state));
          state.history = [];
          save();
          render();
        } }, 'Svuota storico')
      )
    ),
    $('aside', { class: 'panel' }, history())
  );
}

function settingsAdmin() {
  return $('section', { class: 'stack' },
    $('h3', {}, 'Avvisi partita'),
    $('label', { class: 'check-field' },
      $('input', { type: 'checkbox', checked: state.settings?.alertsEnabled !== false, onchange: event => { state.settings.alertsEnabled = event.target.checked; save(); } }),
      'Avviso visivo allo scadere del timer'
    ),
    $('label', { class: 'check-field' },
      $('input', { type: 'checkbox', checked: state.settings?.soundsEnabled !== false, onchange: event => { state.settings.soundsEnabled = event.target.checked; save(); } }),
      'Avviso sonoro locale allo scadere del timer'
    )
  );
}
function exportData(prefix = 'trivia-challenge') { const safePrefix = typeof prefix === 'string' ? prefix : 'trivia-challenge'; const blob = new Blob([JSON.stringify(serializeDocument(state), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = $('a', { href: url, download: `${safePrefix}-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url); }
function importData(event) { const file = event.target.files?.[0]; if (!file) return; exportData('backup-prima-import'); const reader = new FileReader(); reader.onload = () => { try { const prepared = prepareDocument(JSON.parse(reader.result)); backupDocument(localStorage, BACKUP_KEY, serializeDocument(state)); const data = hydrate(prepared); state = data; gameId = state.games[0].id; playerId = state.players[0].id; scorePanelPlayerId = ''; undoStack = []; lastSavedContentSnapshot = JSON.stringify(editorialSnapshot(state)); save(); render(); toast('Dati importati; backup precedente conservato'); } catch (error) { toast(`Import fallito: ${error.message}`); } finally { event.target.value = ''; } }; reader.readAsText(file); }

window.addEventListener('keydown', handleUndoShortcut);
window.addEventListener('keydown', handleHostShortcut);
window.addEventListener('beforeunload', () => {
  if (pendingSave) save();
});
render();
loadAssetManifest();
