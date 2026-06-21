import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameTemplates } from '../src/core/game-registry.js';
import { serializeDocument, validateDocument } from '../src/core/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'public', 'demo', 'trivia-challenge-demo.json');
const alphabet = 'ABCDEFGHILMNOPQRSTUVZ'.split('');
let counter = 0;
const templates = createGameTemplates({
  createId: prefix => `${prefix}-demo-${String(++counter).padStart(2, '0')}`,
  alphabet
});

const state = {
  title: 'TRIVIA CHALLENGE',
  subtitle: 'DEMO LOCALE',
  homeLayout: {},
  games: Object.values(templates).map(factory => factory()),
  library: ['Anime', 'Cinema', 'Serie TV', 'Musica', 'Gaming'],
  powers: [],
  players: [
    { id: 'player-demo-1', name: 'PLAYER 1', score: 0 },
    { id: 'player-demo-2', name: 'PLAYER 2', score: 0 },
    { id: 'player-demo-3', name: 'PLAYER 3', score: 0 }
  ],
  session: { games: {} },
  settings: { soundsEnabled: true, alertsEnabled: true },
  history: []
};

const document = serializeDocument(state);
const serialized = `${JSON.stringify(document, null, 2)}\n`;
const errors = validateDocument(document);
if (errors.length) throw new Error(`Demo non valida: ${errors.join(' ')}`);

const mediaFields = new Set(['image', 'audio', 'media', 'detailImage', 'fullImage', 'src', 'art']);
const mediaPaths = [];
function collectMedia(value) {
  if (Array.isArray(value)) return value.forEach(collectMedia);
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, entry]) => {
    if (mediaFields.has(key) && typeof entry === 'string' && entry) mediaPaths.push(entry);
    collectMedia(entry);
  });
}
collectMedia(document.content);
await Promise.all(mediaPaths.map(mediaPath => access(path.join(root, ...mediaPath.split('/')))));

if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8');
  if (current !== serialized) throw new Error('La demo non è aggiornata. Esegui npm run demo:generate.');
  console.log(`Demo valida: ${document.content.games.length} giochi, ${mediaPaths.length} riferimenti media locali.`);
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, 'utf8');
  console.log(`Demo generata in ${path.relative(root, outputPath)}.`);
}
