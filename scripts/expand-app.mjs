import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(root, 'src', 'App.tsx');

// Commit conocido con App.tsx completo y funcional
const GOOD_COMMIT = 'e2679742427ebe16f77c612a0c59526118c1c215';
const URL =
  'https://raw.githubusercontent.com/JohanCarrion1/Apiarios-carrion-/' +
  GOOD_COMMIT +
  '/src/App.tsx';

async function main() {
  // Si ya hay un App.tsx grande (local dev restaurado), no tocar
  try {
    const existing = fs.readFileSync(outPath, 'utf8');
    if (existing.length > 50000 && existing.includes('IntroHead')) {
      console.log('src/App.tsx already OK (' + existing.length + ' bytes)');
      return;
    }
  } catch {
    /* falta el archivo */
  }

  console.log('Downloading App.tsx from commit', GOOD_COMMIT, '...');
  const res = await fetch(URL);
  if (!res.ok) {
    console.error('Failed to download App.tsx:', res.status, res.statusText);
    process.exit(1);
  }
  const text = await res.text();
  if (text.length < 50000 || !text.includes('IntroHead')) {
    console.error('Downloaded App.tsx looks invalid (len=' + text.length + ')');
    process.exit(1);
  }
  fs.writeFileSync(outPath, text);
  console.log('Restored src/App.tsx (' + text.length + ' bytes)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
