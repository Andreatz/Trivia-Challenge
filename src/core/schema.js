import { GAME_TYPES } from './game-registry.js';

export const CURRENT_SCHEMA_VERSION = 2;

const MEDIA_FIELDS = new Set(['image', 'audio', 'media', 'detailImage', 'fullImage', 'src', 'art']);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function migrateDocument(input) {
  if (!isRecord(input)) throw new Error('Il documento deve essere un oggetto JSON.');
  const document = structuredClone(input);
  const version = Number(document.schemaVersion || 0);
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(`Versione dati ${version} non supportata. Versione massima: ${CURRENT_SCHEMA_VERSION}.`);
  }

  if (version < 1) {
    document.schemaVersion = 1;
    document.games ||= [];
    document.players ||= [];
    document.history ||= [];
  }

  if (version < 2) {
    document.session ||= { games: {} };
    document.session.games ||= {};
    for (const game of document.games || []) {
      const progress = document.session.games[game.id] ||= {};
      const moveQuestionStatuses = key => {
        (game[key] || []).forEach((entry, index) => {
          if (!entry || (!entry.status && !entry.titleAwarded && !entry.artistAwarded)) return;
          progress[key] ||= {};
          progress[key][index] = {
            status: entry.status || 'pending',
            titleAwarded: !!entry.titleAwarded,
            artistAwarded: !!entry.artistAwarded
          };
          delete entry.status;
          delete entry.titleAwarded;
          delete entry.artistAwarded;
        });
      };

      moveQuestionStatuses('rounds');
      moveQuestionStatuses('questions');
      moveQuestionStatuses('songs');
      if (game.completed || game.result) {
        progress.completed = !!game.completed;
        progress.result = game.result || null;
        delete game.completed;
        delete game.result;
      }
      if (game.status || game.cluesUsed != null) {
        progress.status = game.status || 'pending';
        progress.cluesUsed = Number(game.cluesUsed || 0);
        delete game.status;
        delete game.cluesUsed;
      }
      if (game.bonusAwarded) {
        progress.bonusAwarded = true;
        delete game.bonusAwarded;
      }
      (game.categories || []).forEach((category, categoryIndex) => {
        (category.clues || []).forEach((clue, clueIndex) => {
          if (!clue.used && !clue.status) return;
          progress.clues ||= {};
          progress.clues[`${categoryIndex}:${clueIndex}`] = { used: !!clue.used, status: clue.status || 'pending' };
          delete clue.used;
          delete clue.status;
        });
      });
    }
    document.schemaVersion = 2;
  }

  return document;
}

export function validateDocument(input) {
  const errors = [];
  if (!isRecord(input)) return ['Il documento deve essere un oggetto JSON.'];
  if (!Array.isArray(input.games) || input.games.length === 0) errors.push('games: deve contenere almeno un minigioco.');
  if (!Array.isArray(input.players) || input.players.length === 0) errors.push('players: deve contenere almeno un giocatore.');
  if (!isRecord(input.session) || !isRecord(input.session.games)) errors.push('session.games: stato sessione mancante.');

  const ids = new Set();
  (Array.isArray(input.games) ? input.games : []).forEach((game, index) => {
    const path = `games[${index}]`;
    if (!isRecord(game)) {
      errors.push(`${path}: deve essere un oggetto.`);
      return;
    }
    if (!game.id || typeof game.id !== 'string') errors.push(`${path}.id: ID obbligatorio.`);
    else if (ids.has(game.id)) errors.push(`${path}.id: ID duplicato "${game.id}".`);
    else ids.add(game.id);
    if (!GAME_TYPES.has(game.type)) errors.push(`${path}.type: tipo "${game.type || ''}" non supportato.`);
    if (!game.title || typeof game.title !== 'string') errors.push(`${path}.title: titolo obbligatorio.`);
    validateGameShape(game, path, errors);
  });

  (Array.isArray(input.players) ? input.players : []).forEach((player, index) => {
    const path = `players[${index}]`;
    if (!isRecord(player)) {
      errors.push(`${path}: deve essere un oggetto.`);
      return;
    }
    if (!player.id || typeof player.id !== 'string') errors.push(`${path}.id: ID obbligatorio.`);
    else if (ids.has(player.id)) errors.push(`${path}.id: ID duplicato "${player.id}".`);
    else ids.add(player.id);
    if (!player.name || typeof player.name !== 'string') errors.push(`${path}.name: nome obbligatorio.`);
    if (!Number.isFinite(Number(player.score))) errors.push(`${path}.score: punteggio non numerico.`);
  });

  visitMedia(input, '', errors);
  return errors;
}

function requireList(game, key, path, errors, minimum = 1) {
  if (!Array.isArray(game[key]) || game[key].length < minimum) {
    errors.push(`${path}.${key}: deve contenere almeno ${minimum} elemento/i.`);
    return [];
  }
  return game[key];
}

function validateGameShape(game, path, errors) {
  if (!GAME_TYPES.has(game.type)) return;
  if (game.type === 'guess') {
    requireList(game, 'rounds', path, errors).forEach((round, index) => {
      if (!isRecord(round)) errors.push(`${path}.rounds[${index}]: deve essere un oggetto.`);
      else requireList(round, 'clues', `${path}.rounds[${index}]`, errors);
    });
  }
  if (game.type === 'bomb') {
    requireList(game, 'items', path, errors);
    if (!Number.isFinite(Number(game.pointsPerCorrect))) errors.push(`${path}.pointsPerCorrect: valore numerico obbligatorio.`);
  }
  if (['said', 'detail', 'quote', 'chain', 'labors', 'pass'].includes(game.type)) {
    requireList(game, 'questions', path, errors);
  }
  if (game.type === 'guillotine') requireList(game, 'words', path, errors, 5);
  if (game.type === 'pass') {
    if (!isRecord(game.points)) errors.push(`${path}.points: deve contenere i valori per difficoltà.`);
    if (!isRecord(game.bonus)) errors.push(`${path}.bonus: deve contenere i valori per difficoltà.`);
  }
  if (game.type === 'jeopardy') {
    requireList(game, 'categories', path, errors).forEach((category, index) => {
      if (!isRecord(category)) errors.push(`${path}.categories[${index}]: deve essere un oggetto.`);
      else requireList(category, 'clues', `${path}.categories[${index}]`, errors);
    });
  }
  if (game.type === 'sarabanda') requireList(game, 'songs', path, errors);
}

function visitMedia(value, path, errors) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => visitMedia(entry, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (MEDIA_FIELDS.has(key) && typeof entry === 'string' && entry.trim()) {
      const normalized = entry.replaceAll('\\', '/');
      if (!normalized.startsWith('public/assets/') || normalized.includes('../')) {
        errors.push(`${nextPath}: usa un percorso locale sotto public/assets/.`);
      }
    }
    visitMedia(entry, nextPath, errors);
  }
}

export function prepareDocument(input) {
  const migrated = migrateDocument(input);
  const errors = validateDocument(migrated);
  if (errors.length) throw new Error(errors.slice(0, 5).join(' '));
  return migrated;
}
