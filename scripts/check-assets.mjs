import { access, readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const sourceFiles = [
  'src/app.js',
  'src/core/game-registry.js',
  'src/styles.css',
  'src/anime-theme-overrides.css',
  'src/legacy-glow.css',
  'src/fullscreen.css',
  'service-worker.js'
];

const references = new Set();
for (const file of sourceFiles) {
  const source = await readFile(path.join(root, file), 'utf8');
  for (const match of source.matchAll(/public\/assets\/[A-Za-z0-9À-ÿ_@().,'+\- /]+\.(?:png|jpe?g|webp|svg|mp3|wav|ogg|m4a|mp4|webm|mov)/gi)) {
    references.add(match[0]);
  }
}

const missing = [];
for (const reference of references) {
  try {
    await access(path.join(root, ...reference.split('/')));
  } catch {
    missing.push(reference);
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
  }
  return files;
}

const assetRoot = path.join(root, 'public', 'assets');
const assets = await walk(assetRoot);
const metadata = await Promise.all(assets.map(async file => ({ file, size: Number((await stat(file)).size) })));
const sizes = metadata.map(entry => entry.size);
const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
const referencedAbsolute = new Set([...references].map(reference => path.normalize(path.join(root, ...reference.split('/'))).toLowerCase()));
const unused = metadata.filter(entry => !referencedAbsolute.has(path.normalize(entry.file).toLowerCase()));
const large = metadata.filter(entry => entry.size > 2 * 1024 * 1024).sort((left, right) => right.size - left.size);
const tooLarge = metadata.filter(entry => entry.size > 8 * 1024 * 1024);
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.webm', '.mov']);
const unsupported = metadata.filter(entry => !supported.has(path.extname(entry.file).toLowerCase()) && path.basename(entry.file) !== '.gitkeep');

async function digest(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

const sameSizeGroups = Object.values(Object.groupBy(metadata, entry => entry.size)).filter(group => group.length > 1);
const duplicateGroups = [];
for (const group of sameSizeGroups) {
  const byHash = Object.groupBy(await Promise.all(group.map(async entry => ({ ...entry, hash: await digest(entry.file) }))), entry => entry.hash);
  duplicateGroups.push(...Object.values(byHash).filter(entries => entries.length > 1));
}

console.log(`Asset locali: ${assets.length} file, ${(totalBytes / 1024 / 1024).toFixed(1)} MiB`);
console.log(`Riferimenti statici controllati: ${references.size}`);
console.log(`Asset non referenziati staticamente: ${unused.length}`);
console.log(`Asset oltre 2 MiB: ${large.length}`);
console.log(`Gruppi duplicati: ${duplicateGroups.length}`);

if (large.length) {
  console.warn('\nAsset grandi (primi 10):');
  large.slice(0, 10).forEach(entry => console.warn(`- ${(entry.size / 1024 / 1024).toFixed(1)} MiB  ${path.relative(root, entry.file).replaceAll('\\', '/')}`));
}

if (duplicateGroups.length) {
  console.warn('\nAsset duplicati:');
  duplicateGroups.forEach(group => console.warn(`- ${group.map(entry => path.relative(root, entry.file).replaceAll('\\', '/')).join(' = ')}`));
}

if (missing.length) {
  console.error('\nAsset mancanti:');
  missing.sort().forEach(file => console.error(`- ${file}`));
  process.exitCode = 1;
}

if (unsupported.length) {
  console.error('\nFormati asset non supportati:');
  unsupported.forEach(entry => console.error(`- ${path.relative(root, entry.file).replaceAll('\\', '/')}`));
  process.exitCode = 1;
}

if (tooLarge.length) {
  console.error('\nAsset oltre il limite bloccante di 8 MiB:');
  tooLarge.forEach(entry => console.error(`- ${path.relative(root, entry.file).replaceAll('\\', '/')}`));
  process.exitCode = 1;
}
