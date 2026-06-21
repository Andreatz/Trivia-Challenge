import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const assetRoot = path.join(root, 'public', 'assets');
const output = path.join(root, 'public', 'assets-manifest.json');
const checkOnly = process.argv.includes('--check');

const mimeTypes = {
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.mov': 'video/quicktime', '.mp4': 'video/mp4', '.webm': 'video/webm'
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.name !== '.gitkeep') files.push(absolute);
  }
  return files;
}

const assets = await Promise.all((await walk(assetRoot)).map(async file => {
  const extension = path.extname(file).toLowerCase();
  return {
    path: path.relative(root, file).replaceAll('\\', '/'),
    type: mimeTypes[extension] || 'application/octet-stream',
    bytes: Number((await stat(file)).size)
  };
}));
// Locale-aware collation can differ between the ICU versions shipped by
// Windows and Linux. Code-point ordering keeps the generated file stable.
assets.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

const serialized = `${JSON.stringify({ generatedBy: 'npm run assets:manifest', assets }, null, 2)}\n`;
if (checkOnly) {
  let current = '';
  try { current = await readFile(output, 'utf8'); } catch {}
  if (current !== serialized) {
    console.error('public/assets-manifest.json non è aggiornato. Esegui: npm run assets:manifest');
    process.exitCode = 1;
  } else {
    console.log(`Manifest asset aggiornato: ${assets.length} file.`);
  }
} else {
  await writeFile(output, serialized, 'utf8');
  console.log(`Creato public/assets-manifest.json con ${assets.length} file.`);
}
