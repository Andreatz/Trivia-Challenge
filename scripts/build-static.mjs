import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const output = path.join(root, 'dist');
const entries = ['index.html', 'manifest.webmanifest', 'service-worker.js', '.nojekyll', 'src', 'public'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}

console.log(`Artifact statico creato in dist/ con ${entries.length} entry radice.`);
