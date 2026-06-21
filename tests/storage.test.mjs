import { test } from 'vitest';
import assert from 'node:assert/strict';

import { backupDocument, readFirstValid, writeDocument } from '../src/core/storage.js';

function fakeStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: key => values.get(key)
  };
}

test('salta un salvataggio corrotto e recupera la chiave legacy', () => {
  const storage = fakeStorage({ current: '{', legacy: '{"ok":true}' });
  const result = readFirstValid(storage, ['current', 'legacy'], value => value);
  assert.equal(result.key, 'legacy');
  assert.deepEqual(result.document, { ok: true });
  assert.equal(result.errors.length, 1);
});

test('scrive documenti e backup con timestamp', () => {
  const storage = fakeStorage();
  writeDocument(storage, 'main', { score: 10 });
  assert.deepEqual(JSON.parse(storage.value('main')), { score: 10 });
  backupDocument(storage, 'backup', { score: 5 });
  const backup = JSON.parse(storage.value('backup'));
  assert.deepEqual(backup.document, { score: 5 });
  assert.equal(typeof backup.createdAt, 'string');
});
