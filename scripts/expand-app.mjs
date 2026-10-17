import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptsDir = path.join(root, 'scripts');
const outPath = path.join(root, 'src', 'App.tsx');

let b64 = '';
for (let i = 0; i < 20; i++) {
  const p = path.join(scriptsDir, `app.chunk${String(i).padStart(2, '0')}.b64`);
  if (!fs.existsSync(p)) {
    console.error('Missing', p);
    process.exit(1);
  }
  b64 += fs.readFileSync(p, 'utf8').trim();
}

const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
fs.writeFileSync(outPath, buf);
console.log('Restored src/App.tsx (' + buf.length + ' bytes)');
