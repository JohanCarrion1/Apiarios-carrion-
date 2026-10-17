import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b64Path = path.join(root, 'scripts', 'app.tsx.gz.b64');
const outPath = path.join(root, 'src', 'App.tsx');

if (!fs.existsSync(b64Path)) {
  console.error('Missing scripts/app.tsx.gz.b64');
  process.exit(1);
}
const b64 = fs.readFileSync(b64Path, 'utf8').trim();
const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
fs.writeFileSync(outPath, buf);
console.log('Restored src/App.tsx (' + buf.length + ' bytes)');
