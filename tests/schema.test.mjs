import { test } from 'vitest';
import assert from 'node:assert/strict';

import { CURRENT_SCHEMA_VERSION, prepareDocument, serializeDocument, validateDocument } from '../src/core/schema.js';

const validDocument = () => ({
  players: [{ id: 'player-1', name: 'PLAYER', score: 0 }],
  games: [{ id: 'game-1', type: 'guess', title: 'Gioco', rounds: [{ answer: 'A', clues: [{ image: '' }] }] }],
  history: []
});

test('migra un documento legacy alla versione corrente', () => {
  assert.equal(prepareDocument(validDocument()).schemaVersion, CURRENT_SCHEMA_VERSION);
});

test('rifiuta tipi di gioco sconosciuti e ID duplicati', () => {
  const document = validDocument();
  document.games[0].type = 'unknown';
  document.players[0].id = document.games[0].id;
  const errors = validateDocument(document);
  assert.equal(errors.some(error => error.includes('non supportato')), true);
  assert.equal(errors.some(error => error.includes('duplicato')), true);
});

test('accetta soltanto asset locali sotto public/assets', () => {
  const remote = validDocument();
  remote.games[0].rounds = [{ clues: [{ image: 'https://example.com/a.png' }] }];
  assert.throws(() => prepareDocument(remote), /percorso locale/);

  const local = validDocument();
  local.games[0].rounds = [{ clues: [{ image: 'public/assets/a.png' }] }];
  assert.doesNotThrow(() => prepareDocument(local));
});

test('migra gli stati runtime fuori dai contenuti', () => {
  const legacy = validDocument();
  legacy.games[0].rounds = [{ status: 'correct', clues: [{ image: '' }] }];
  const migrated = prepareDocument(legacy);
  assert.equal(migrated.content.games[0].rounds[0].status, undefined);
  assert.equal(migrated.session.games['game-1'].rounds[0].status, 'correct');
});

test('separa contenuti, sessione, impostazioni e storico nello schema v3', () => {
  const migrated = prepareDocument(validDocument());
  assert.deepEqual(Object.keys(migrated).sort(), ['content', 'history', 'schemaVersion', 'session', 'settings']);
  assert.equal(migrated.content.games.length, 1);
  assert.equal(migrated.session.players.length, 1);

  const serialized = serializeDocument({
    title: 'Evento', subtitle: 'Demo', homeLayout: {}, games: migrated.content.games,
    library: [], powers: [], players: migrated.session.players, session: { games: {} },
    settings: { soundsEnabled: false }, history: []
  });
  assert.equal(serialized.content.title, 'Evento');
  assert.equal(serialized.settings.soundsEnabled, false);
  assert.equal(serialized.games, undefined);
});

test('valida la struttura specifica del tipo di gioco', () => {
  const invalid = validDocument();
  invalid.games[0].rounds = [];
  assert.throws(() => prepareDocument(invalid), /rounds/);
});

test('migra i percorsi media rinominati senza rompere i contenuti salvati', () => {
  const legacy = validDocument();
  legacy.games[0].rounds[0].clues[0].image = 'public/assets/indovina-il-personaggio/anime/aizen-1.png';
  const migrated = prepareDocument(legacy);
  assert.equal(migrated.content.games[0].rounds[0].clues[0].image, 'public/assets/indovina-il-personaggio/anime/aizen-1.webp');
});
