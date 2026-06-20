import test from 'node:test';
import assert from 'node:assert/strict';

import { CURRENT_SCHEMA_VERSION, prepareDocument, validateDocument } from '../src/core/schema.js';

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
  assert.equal(migrated.games[0].rounds[0].status, undefined);
  assert.equal(migrated.session.games['game-1'].rounds[0].status, 'correct');
});

test('valida la struttura specifica del tipo di gioco', () => {
  const invalid = validDocument();
  invalid.games[0].rounds = [];
  assert.throws(() => prepareDocument(invalid), /rounds/);
});
