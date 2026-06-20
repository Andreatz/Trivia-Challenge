import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { CURRENT_SCHEMA_VERSION } from '../src/core/schema.js';

const root = process.cwd();
const failures = [];
const read = file => readFile(path.join(root, file), 'utf8');

const contentSchema = await read('docs/CONTENT_SCHEMA.md');
if (!contentSchema.includes(`schemaVersion\": ${CURRENT_SCHEMA_VERSION}`)) {
  failures.push(`CONTENT_SCHEMA.md non dichiara schemaVersion ${CURRENT_SCHEMA_VERSION}.`);
}

const frontendFiles = [
  'index.html', 'manifest.webmanifest', 'service-worker.js',
  'src/app.js', 'src/fullscreen.js', 'src/pwa.js',
  'src/styles.css', 'src/anime-theme-overrides.css', 'src/legacy-glow.css', 'src/fullscreen.css'
];
for (const file of frontendFiles) {
  const source = await read(file);
  const withoutSvgNamespace = source.replaceAll('http://www.w3.org/2000/svg', '');
  if (/https?:\/\//i.test(withoutSvgNamespace)) failures.push(`${file}: contiene una dipendenza URL remota.`);
}

const worker = await read('service-worker.js');
const shellEntries = [...worker.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]).filter(Boolean);
for (const relative of shellEntries) {
  try { await access(path.join(root, ...relative.split('/'))); }
  catch { failures.push(`Service worker: file shell mancante ${relative}.`); }
}

const manifest = JSON.parse(await read('manifest.webmanifest'));
if (!manifest.name || !manifest.start_url || !manifest.icons?.length) failures.push('manifest.webmanifest incompleto.');
for (const icon of manifest.icons || []) {
  try { await access(path.join(root, ...icon.src.split('/'))); }
  catch { failures.push(`Icona manifest mancante: ${icon.src}.`); }
}

const assetManifest = JSON.parse(await read('public/assets-manifest.json'));
if (!Array.isArray(assetManifest.assets) || assetManifest.assets.length === 0) failures.push('Manifest asset vuoto.');

if (failures.length) {
  console.error('Release check fallito:');
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Release check superato: schema v${CURRENT_SCHEMA_VERSION}, ${shellEntries.length} file shell, ${assetManifest.assets.length} asset locali.`);
}
