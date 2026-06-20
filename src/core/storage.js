export function readFirstValid(storage, keys, prepare) {
  const errors = [];
  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      return { document: prepare(JSON.parse(raw)), key, errors };
    } catch (error) {
      errors.push({ key, error });
    }
  }
  return { document: null, key: null, errors };
}

export function writeDocument(storage, key, document) {
  const serialized = typeof document === 'string' ? document : JSON.stringify(document);
  storage.setItem(key, serialized);
  return serialized;
}

export function backupDocument(storage, backupKey, document) {
  return writeDocument(storage, backupKey, {
    createdAt: new Date().toISOString(),
    document
  });
}
